import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** The marketing site and its serverless function live at the repository root, three folders above this file. */
const ROOT = import.meta.url.slice(0, import.meta.url.indexOf("apps/website-builder/"));
const read = (file: string): string => readFileSync(new URL(file, ROOT), "utf8");

// api/inquiry.js is plain CommonJS (Vercel runs it as is), so it is loaded the way Node would load it.
const require_ = createRequire(import.meta.url);
type Handler = ((req: unknown, res: unknown) => Promise<unknown>) & {
  validate(body: unknown): { ok: boolean; value?: Record<string, string> };
  buildEmail(value: Record<string, string>): { subject: string; text: string };
  resetThrottle(): void;
};
const handler = require_("../../../api/inquiry.js") as Handler;

const good = { name: "Sam Carter", email: "sam@example.com", service: "website", message: "I need a site for my bakery.", company: "", lang: "en" };

interface Reply {
  status: number;
  body: { ok: boolean; error?: string };
}

async function call(body: unknown, options: { method?: string; headers?: Record<string, string> } = {}): Promise<Reply> {
  const headers: Record<string, string> = { host: "www.busoftwareworks.com", "x-forwarded-for": "203.0.113.9", ...options.headers };
  const sent: { status: number; text: string } = { status: 0, text: "" };
  const res = {
    statusCode: 0,
    setHeader() {},
    end(text: string) {
      sent.status = this.statusCode;
      sent.text = text;
    },
  };
  await handler({ method: options.method ?? "POST", headers, body }, res);
  return { status: sent.status, body: JSON.parse(sent.text) };
}

// The tests need only a sliver of Node, and its types are not part of this project.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

const configure = () => {
  env.RESEND_API_KEY = "test-key";
  env.INQUIRY_FROM = "BUSW Website <inquiries@busoftwareworks.com>";
  delete env.INQUIRY_TO;
};

describe("api/inquiry", () => {
  beforeEach(() => {
    handler.resetThrottle();
    configure();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete env.RESEND_API_KEY;
    delete env.INQUIRY_FROM;
    delete env.INQUIRY_TO;
  });

  it("accepts only POST", async () => {
    expect((await call(good, { method: "GET" })).status).toBe(405);
  });

  it("says it is not configured, and contacts no one, until the three variables are set", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    delete env.RESEND_API_KEY;
    expect(await call(good)).toEqual({ status: 503, body: { ok: false, error: "not_configured" } });
    configure();
    delete env.INQUIRY_FROM;
    expect((await call(good)).status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("delivers a valid inquiry through the provider and replies ok only afterwards", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchSpy);
    expect(await call(good)).toEqual({ status: 200, body: { ok: true } });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    const sent = JSON.parse(init.body);
    expect(sent.to).toEqual(["contact@busoftwareworks.com"]);
    expect(sent.reply_to).toBe("sam@example.com");
    expect(sent.from).toContain("inquiries@busoftwareworks.com");
    expect(sent.text).toContain("I need a site for my bakery.");
    expect(sent.subject).toContain("Website");
  });

  it("sends to INQUIRY_TO when it is set", async () => {
    env.INQUIRY_TO = "owner@example.com";
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchSpy);
    await call(good);
    expect(JSON.parse((fetchSpy.mock.calls[0] as [string, { body: string }])[1].body).to).toEqual(["owner@example.com"]);
  });

  it("never reports success when the provider refuses or cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    expect(await call(good)).toEqual({ status: 502, body: { ok: false, error: "delivery_failed" } });
    handler.resetThrottle();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await call(good)).toEqual({ status: 502, body: { ok: false, error: "delivery_failed" } });
  });

  it.each([
    ["no name", { ...good, name: " " }],
    ["a name that is too long", { ...good, name: "x".repeat(121) }],
    ["a bad email", { ...good, email: "not-an-email" }],
    ["an unknown service", { ...good, service: "hacking" }],
    ["a message that is too short", { ...good, message: "hi" }],
    ["a message that is too long", { ...good, message: "x".repeat(4001) }],
    ["a filled honeypot", { ...good, company: "Acme" }],
    ["text where an object belongs", "oops"],
    ["a number as the name", { ...good, name: 7 }],
  ])("refuses %s without contacting the provider", async (_label, body) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await call(body)).toEqual({ status: 400, body: { ok: false, error: "invalid" } });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses posts from another origin", async () => {
    vi.stubGlobal("fetch", vi.fn());
    expect((await call(good, { headers: { origin: "https://evil.example" } })).status).toBe(403);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    expect((await call(good, { headers: { origin: "https://www.busoftwareworks.com" } })).status).toBe(200);
  });

  it("slows a flood from one address", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) statuses.push((await call(good)).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429, 429]);
  });

  it("keeps line breaks out of the email subject", () => {
    const { subject } = handler.buildEmail({ ...good, name: "Sam\r\nBcc: someone@example.com" } as Record<string, string>);
    expect(subject).not.toMatch(/[\r\n]/);
  });
});

describe("the contact form", () => {
  const strings = read("js/i18n-strings.js");
  const i18n = read("js/i18n.js");
  const script = read("js/inquiry.js");

  type Fetch = (url: string, init: { method: string; body: string }) => Promise<unknown>;

  function open(options: { fetch?: Fetch; search?: string; stored?: string } = {}) {
    const window = new JSDOM(read("contact.html"), { url: `https://www.busoftwareworks.com/contact.html${options.search ?? ""}`, runScripts: "outside-only", pretendToBeVisual: true }).window as unknown as Window & typeof globalThis & { eval(code: string): unknown };
    if (options.stored) window.localStorage.setItem("busw.lang", options.stored);
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as never;
    if (options.fetch) window.fetch = options.fetch as never;
    window.eval(strings);
    window.eval(i18n);
    window.eval(script);
    return window;
  }

  const fill = (window: Window & typeof globalThis, values: Partial<Record<"name" | "email" | "service" | "message", string>>) => {
    const form = window.document.getElementById("inquiry") as HTMLFormElement;
    for (const [field, value] of Object.entries(values)) (form.elements.namedItem(field) as HTMLInputElement).value = value;
  };
  const submit = (window: Window & typeof globalThis) => (window.document.getElementById("inquiry") as HTMLFormElement).dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
  const status = (window: Window) => window.document.getElementById("inquiry-status") as HTMLElement;
  const complete = { name: "Sam Carter", email: "sam@example.com", service: "website", message: "I need a website for my bakery." };

  it("is reachable from the website page with the service preselected", () => {
    const window = open({ search: "?service=electron" });
    expect((window.document.getElementById("inq-service") as HTMLSelectElement).value).toBe("electron");
    expect((open({ search: "?service=hax" }).document.getElementById("inq-service") as HTMLSelectElement).value).toBe("");
  });

  it("checks the fields first, tells the visitor what is wrong, and sends nothing", async () => {
    const fetchSpy = vi.fn();
    const window = open({ fetch: fetchSpy as never });
    submit(window);
    await settle();
    expect(fetchSpy).not.toHaveBeenCalled();
    for (const field of ["name", "email", "service", "message"]) {
      expect(window.document.getElementById(`inq-${field}`)?.getAttribute("aria-invalid"), field).toBe("true");
      expect(window.document.getElementById(`inq-${field}-error`)?.hidden, field).toBe(false);
    }
    expect(window.document.activeElement?.id).toBe("inq-name");
    fill(window, { ...complete, email: "nope" });
    submit(window);
    expect(window.document.getElementById("inq-email")?.getAttribute("aria-invalid")).toBe("true");
    expect(window.document.getElementById("inq-name")?.getAttribute("aria-invalid")).toBeNull();
  });

  it("says sent only when the server confirms delivery", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: true }) });
    const window = open({ fetch: fetchSpy as never });
    fill(window, complete);
    submit(window);
    await settle();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toBe("/api/inquiry");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({ name: "Sam Carter", email: "sam@example.com", service: "website", lang: "en" });
    expect(status(window).getAttribute("data-state")).toBe("sent");
    expect(status(window).textContent).toContain("Your inquiry was sent");
    expect((window.document.getElementById("inq-message") as HTMLTextAreaElement).value).toBe("");
  });

  it.each([
    ["the endpoint is missing", { status: 404, json: async () => ({}) }],
    ["delivery is not configured", { status: 503, json: async () => ({ ok: false, error: "not_configured" }) }],
    ["the provider refused", { status: 502, json: async () => ({ ok: false, error: "delivery_failed" }) }],
    ["the reply is not JSON", { status: 200, json: async () => { throw new Error("html"); } }],
    ["the reply is ok: false", { status: 200, json: async () => ({ ok: false }) }],
  ])("never shows success when %s: it says nothing was sent and offers the email instead", async (_label, reply) => {
    const window = open({ fetch: (async () => reply) as Fetch });
    fill(window, complete);
    submit(window);
    await settle();
    expect(status(window).getAttribute("data-state")).toBe("failed");
    expect(status(window).textContent).toContain("has not been sent");
    expect(status(window).textContent).not.toContain("was sent");
    const link = status(window).querySelector<HTMLAnchorElement>('a[href^="mailto:contact@busoftwareworks.com"]');
    expect(link).toBeTruthy();
    expect(decodeURIComponent(link!.href)).toContain("I need a website for my bakery.");
    expect((window.document.getElementById("inq-message") as HTMLTextAreaElement).value).toBe(complete.message);
  });

  it("never shows success when the network fails", async () => {
    const window = open({ fetch: (async () => { throw new Error("offline"); }) as Fetch });
    fill(window, complete);
    submit(window);
    await settle();
    expect(status(window).getAttribute("data-state")).toBe("failed");
    expect(status(window).textContent).toContain("has not been sent");
  });

  it("ignores a robot that fills the hidden field", async () => {
    const fetchSpy = vi.fn();
    const window = open({ fetch: fetchSpy as never });
    fill(window, complete);
    (window.document.querySelector('input[name="company"]') as HTMLInputElement).value = "Acme";
    submit(window);
    await settle();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(status(window).hidden).toBe(true);
  });

  it("speaks Turkish when the page is in Turkish, and re-words messages when the language changes", async () => {
    const window = open({ stored: "tr", fetch: (async () => ({ status: 404, json: async () => ({}) })) as Fetch });
    submit(window);
    expect(window.document.getElementById("inq-name-error")?.textContent).toBe("Adınızı girin.");
    (window.document.querySelector('[data-lang="en"]') as HTMLButtonElement).click();
    expect(window.document.getElementById("inq-name-error")?.textContent).toBe("Enter your name.");
    fill(window, complete);
    submit(window);
    await settle();
    expect(status(window).textContent).toContain("has not been sent");
    (window.document.querySelector('[data-lang="tr"]') as HTMLButtonElement).click();
    expect(status(window).textContent).toContain("gönderilmedi");
  });
});
