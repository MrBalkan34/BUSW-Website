import { createRequire } from "node:module";
import { strFromU8, unzipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "../src/model/types";
import { CATALOGUE_VERSION } from "../src/pricing/catalogue";
import { calculateEstimate } from "../src/pricing/estimate";
import { formatTotal } from "../src/pricing/format";
import { buildSubmission, type SubmissionPayload } from "../src/submission/snapshot";
import { MAX_ONLINE_BYTES, submitToBusw } from "../src/submission/transport";
import { newPage, studio, withCountry, withHomeSections, withPages } from "./helpers";

/**
 * api/submit.js is what "Submit to BUSW" talks to. It is plain CommonJS that loads api/_lib/submission.mjs, a bundle of
 * this builder's own verifier, price calculation and brief. These tests run both for real, with only the email provider
 * faked, so they prove the whole path: a project goes in, a recalculated brief goes to the provider, and success is
 * reported only when the provider accepted it.
 */
const require_ = createRequire(import.meta.url);
type Handler = ((req: unknown, res: unknown) => Promise<unknown>) & { referenceFor(id: string): string; resetThrottle(): void };
const handler = require_("../../../api/submit.js") as Handler;
const fromBase64 = (text: string): Uint8Array => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
type Bundle = { catalogueVersion: string; processSubmission(input: unknown): { ok: boolean; errors?: string[]; summary?: Record<string, unknown> } };

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const NOW = new Date("2026-11-14T09:30:00.000Z");

function readyProject(country = "US"): Project {
  const base = withPages(withHomeSections(studio(), 8), newPage("About", "about", 2));
  const pages = base.pages.map((p, i) => (i === 0 ? { ...p, sections: p.sections.map((s, j) => (j === 0 && s.type === "textImage" ? { ...s, props: { ...s.props, image: { assetId: "img1", alt: "Team", decorative: false } } } : s)) } : p));
  return {
    ...withCountry({ ...base, pages }, country),
    assets: { img1: { id: "img1", name: "team.png", mime: "image/png", width: 1, height: 1, dataUrl: PNG } },
    order: {
      country,
      client: { businessName: "Acme Ltd", contactName: "Ada Lovelace", email: "ada@example.com", notes: "Launch in spring." },
      addons: { ...studio().order.addons, booking: true, extraRevisions: 1, hosting: "care", quoteRequests: ["online-store"] },
    },
  };
}

const payloadFor = (project = readyProject(), submissionId = "sub-1"): SubmissionPayload => buildSubmission(project, { now: NOW, submissionId, acknowledgedEstimate: true });
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

interface Reply {
  status: number;
  body: Record<string, unknown>;
}

async function call(body: unknown, options: { method?: string; headers?: Record<string, string> } = {}): Promise<Reply> {
  const headers: Record<string, string> = { host: "www.busoftwareworks.com", "x-forwarded-for": "203.0.113.20", ...options.headers };
  const sent = { status: 0, text: "" };
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

const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
const configure = () => {
  env.RESEND_API_KEY = "test-key";
  env.INQUIRY_FROM = "BUSW Website <inquiries@contact.busoftwareworks.com>";
  delete env.INQUIRY_TO;
  delete env.SUBMISSION_TO;
};
const providerOk = () => vi.fn().mockResolvedValue({ ok: true, status: 200 });
const lastEmail = (spy: ReturnType<typeof vi.fn>) => {
  const [url, init] = spy.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
  return { url, headers: init.headers, email: JSON.parse(init.body) as { from: string; to: string[]; subject: string; text: string; reply_to: string; attachments: { filename: string; content: string }[] } };
};

describe("api/submit", () => {
  beforeEach(() => {
    handler.resetThrottle();
    configure();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete env.RESEND_API_KEY;
    delete env.INQUIRY_FROM;
  });

  it("accepts only POST", async () => {
    expect((await call(payloadFor(), { method: "GET" })).status).toBe(405);
  });

  it("says it is not configured, and contacts no one, until the email settings exist", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    delete env.RESEND_API_KEY;
    expect(await call(payloadFor())).toEqual({ status: 503, body: { error: "not_configured" } });
    expect(spy).not.toHaveBeenCalled();
  });

  it("emails BUSW the brief as one attached zip, replies with a reference, and only then reports success", async () => {
    const spy = providerOk();
    vi.stubGlobal("fetch", spy);
    const reply = await call(payloadFor());
    expect(reply.status).toBe(201);
    expect(reply.body).toEqual({ reference: handler.referenceFor("sub-1") });
    expect(String(reply.body.reference)).toMatch(/^BUSW-[0-9A-F]{8}$/);

    expect(spy).toHaveBeenCalledTimes(1);
    const { url, headers, email } = lastEmail(spy);
    expect(url).toBe("https://api.resend.com/emails");
    expect(headers.Authorization).toBe("Bearer test-key");
    expect(headers["Idempotency-Key"]).toBe("busw-submission-sub-1");
    expect(email.to).toEqual(["contact@busoftwareworks.com"]);
    expect(email.from).toContain("inquiries@contact.busoftwareworks.com");
    expect(email.reply_to).toBe("ada@example.com");
    expect(email.subject).toContain("Acme Ltd");
    expect(email.subject).toContain(String(reply.body.reference));
    expect(email.text).toContain("Business: Acme Ltd");
    expect(email.text).toContain("Confirm the scope and price with the client before any work starts");

    expect(email.attachments).toHaveLength(1);
    const files = unzipSync(fromBase64(email.attachments[0]!.content));
    expect(email.attachments[0]!.filename).toBe("busw-brief-acme-ltd-2026-11-14.zip");
    expect(Object.keys(files).sort()).toEqual(expect.arrayContaining(["brief.html", "design.busw-site.json", "submission.json"]));
    expect(Object.keys(files).some((name) => /\.png$/.test(name))).toBe(true);
    expect(strFromU8(files["brief.html"]!)).toContain("Acme Ltd");
    expect(JSON.parse(strFromU8(files["submission.json"]!)).client.email).toBe("ada@example.com");
  });

  it("sends the recalculated price, not the one the browser claimed, and tells BUSW about the difference", async () => {
    const spy = providerOk();
    vi.stubGlobal("fetch", spy);
    const tampered = clone(payloadFor());
    tampered.submission.pricing.oneTimeTotalMinor = 1;
    const reply = await call(tampered);
    expect(reply.status).toBe(201);
    const { email } = lastEmail(spy);
    const region = calculateEstimate(readyProject()).region!;
    const truth = formatTotal(calculateEstimate(readyProject()).oneTimeTotalMinor, region);
    expect(email.text).toContain(`Estimated one-time total: ${truth}`);
    expect(email.text).toContain("differed from the recalculation");
    expect(email.text).toContain("One-time total: browser said 1,");
    const files = unzipSync(fromBase64(email.attachments[0]!.content));
    const brief = strFromU8(files["brief.html"]!);
    expect(brief).toContain(truth.replace(/ USD$/, ""));
    expect(JSON.parse(strFromU8(files["submission.json"]!)).pricing.oneTimeTotalMinor).toBe(calculateEstimate(readyProject()).oneTimeTotalMinor);
  });

  it("refuses a submission that does not pass the builder's own checks, and sends nothing", async () => {
    const spy = providerOk();
    vi.stubGlobal("fetch", spy);
    const notAcknowledged = clone(payloadFor());
    notAcknowledged.submission.acknowledgedEstimate = false;
    const bad = await call(notAcknowledged);
    expect(bad.status).toBe(422);
    expect(JSON.stringify(bad.body.errors)).toContain("estimate");

    const noEmail = clone(payloadFor());
    noEmail.submission.client.email = "nope";
    expect((await call(noEmail)).status).toBe(422);

    const noImage = clone(payloadFor());
    noImage.assetData = {};
    expect((await call(noImage)).status).toBe(422);

    expect((await call({ nothing: true })).status).toBe(422);
    expect(spy).not.toHaveBeenCalled();
  });

  it("never reports success when the provider refuses or cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    expect(await call(payloadFor())).toEqual({ status: 502, body: { error: "delivery_failed" } });
    handler.resetThrottle();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await call(payloadFor())).toEqual({ status: 502, body: { error: "delivery_failed" } });
  });

  it("refuses posts from another origin and oversized requests", async () => {
    vi.stubGlobal("fetch", providerOk());
    expect((await call(payloadFor(), { headers: { origin: "https://evil.example" } })).status).toBe(403);
    expect((await call(payloadFor(), { headers: { origin: "https://www.busoftwareworks.com" } })).status).toBe(201);
    expect((await call(payloadFor(), { headers: { "content-length": "5000000" } })).status).toBe(413);
  });

  it("slows a flood from one address", async () => {
    vi.stubGlobal("fetch", providerOk());
    const statuses: number[] = [];
    for (let i = 0; i < 10; i += 1) statuses.push((await call(payloadFor(readyProject(), `sub-${i}`))).status);
    expect(statuses).toEqual([201, 201, 201, 201, 201, 201, 201, 201, 429, 429]);
  });

  it("uses SUBMISSION_TO when it is set", async () => {
    env.SUBMISSION_TO = "projects@example.com";
    const spy = providerOk();
    vi.stubGlobal("fetch", spy);
    await call(payloadFor());
    expect(lastEmail(spy).email.to).toEqual(["projects@example.com"]);
  });
});

describe("the server bundle (api/_lib/submission.mjs)", () => {
  it("was built from the current catalogue and prices exactly as the builder does", async () => {
    // Node loads the ES module bundle itself (as the endpoint does), so the test runner does not transform it.
    const bundle = require_("../../../api/_lib/submission.mjs") as Bundle;
    expect(bundle.catalogueVersion).toBe(CATALOGUE_VERSION);
    for (const country of ["US", "TR", "DE"]) {
      const project = readyProject(country);
      const processed = bundle.processSubmission(payloadFor(project));
      expect(processed.ok, country).toBe(true);
      const estimate = calculateEstimate(project);
      expect(processed.summary?.oneTime, country).toBe(formatTotal(estimate.oneTimeTotalMinor, estimate.region!));
      expect(processed.summary?.monthly, country).toBe(formatTotal(estimate.monthlyTotalMinor, estimate.region!));
    }
  });
});

describe("the builder side of Submit to BUSW", () => {
  const reply = (status: number, body: unknown) => vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response);

  it("does not even try a project that is too large to send, and says so", async () => {
    const payload = payloadFor();
    payload.assetData.img1 = "data:image/png;base64," + "A".repeat(MAX_ONLINE_BYTES + 10);
    const fetchImpl = reply(201, { reference: "x" });
    const result = await submitToBusw(payload, { url: "/api/submit", fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "too-large", retryable: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("treats a 413 from the host as too large, not as a broken submission", async () => {
    const result = await submitToBusw(payloadFor(), { url: "/api/submit", fetchImpl: reply(413, { errors: ["too large"] }) });
    expect(result).toMatchObject({ ok: false, kind: "too-large", retryable: false });
  });

  it("accepts the endpoint's 201 reference as success", async () => {
    const result = await submitToBusw(payloadFor(), { url: "/api/submit", fetchImpl: reply(201, { reference: "BUSW-ABCD1234" }) });
    expect(result).toEqual({ ok: true, reference: "BUSW-ABCD1234" });
  });

  it("treats the endpoint's 502 and 503 as a retryable failure that was NOT sent", async () => {
    for (const status of [502, 503]) {
      const result = await submitToBusw(payloadFor(), { url: "/api/submit", fetchImpl: reply(status, { error: "delivery_failed" }) });
      expect(result).toMatchObject({ ok: false, kind: "unavailable", retryable: true });
    }
  });
});
