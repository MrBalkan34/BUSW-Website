import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { SessionProvider } from "../src/account/session";
import { errorText } from "../src/account/api";
import { parseRoute, safeNext, withNext } from "../src/account/router";
import { I18nProvider } from "../src/i18n/I18nProvider";
import { english } from "../src/i18n/translate";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("return addresses stay inside the app", () => {
  it("accepts our own pages, with their query", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard");
    expect(safeNext("/admin/accounts/abc-123")).toBe("/admin/accounts/abc-123");
    expect(safeNext("/?step=review")).toBe("/?step=review");
    expect(safeNext("/account/security?emailChange=approved")).toBe("/account/security?emailChange=approved");
  });

  it("falls back for anything that could leave the site or is not ours", () => {
    for (const bad of ["https://evil.example/", "http://localhost:5174/dashboard", "//evil.example", "///evil.example/x", "/\\evil.example", "\\\\evil.example", "javascript:alert(1)", "data:text/html,x", "dashboard", "", "/%2f%2fevil.example", "/unknown-page", "/admin/accounts/../../x", "/dashboard\n//evil.example", "/dashboard\u0000"]) {
      expect(safeNext(bad), JSON.stringify(bad)).toBe("/dashboard");
    }
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext("https://evil.example/", "/")).toBe("/");
  });

  it("builds a sign-in link whose return address has been checked", () => {
    expect(withNext("/account/sign-in", "/")).toBe("/account/sign-in?next=%2F");
    expect(withNext("/account/sign-in", "https://evil.example")).toBe("/account/sign-in?next=%2F");
  });

  it("knows every page and treats the rest as not found", () => {
    expect(parseRoute("/").name).toBe("builder");
    expect(parseRoute("/account/reset-password").name).toBe("reset");
    expect(parseRoute("/admin/busw/abc").name).toBe("adminBuswDetail");
    expect(parseRoute("/admin/busw/abc").id).toBe("abc");
    expect(parseRoute("/admin/busw/a b").name).toBe("notFound");
    expect(parseRoute("/nope").name).toBe("notFound");
  });
});

describe("messages never show a server's own wording", () => {
  it("turns each failure into plain, translated words", () => {
    expect(errorText(english.t, { status: 0, code: "network" })).toMatch(/Could not reach/);
    expect(errorText(english.t, { status: 429, code: null })).toMatch(/Too many/);
    expect(errorText(english.t, { status: 503, code: "email_unavailable" })).toMatch(/Email cannot be sent/);
    expect(errorText(english.t, { status: 403, code: "reauth_required" })).toMatch(/sign in again/i);
    expect(errorText(english.t, { status: 409, code: "last_owner" })).toMatch(/last active platform owner/);
    expect(errorText(english.t, { status: 500, code: "Traceback (most recent call last)" })).toMatch(/Something went wrong/);
  });
});

// ---- screens, driven against a scripted account server

type Handler = (body: any) => { status?: number; json?: unknown };
let host: HTMLDivElement;
let root: Root;
let calls: { method: string; path: string; body: any }[];
let server: Record<string, Handler>;

class FakeResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

const ME = { id: "u1", name: "Ayşe Yılmaz", email: "ayse@example.test", emailVerified: true, preferredLanguage: "tr", business: { name: "", country: null }, badge: null, roles: [], security: { mfaEnabled: false, mfaVerifiedThisSession: false, recentAuth: true, reauthWindowSeconds: 900 }, access: { busw: "active", buswAdmin: false, accountAdmin: false, isOwner: false, staffNeedsMfa: false }, apps: [], ownerProvisioned: true };

function respond(method: string, path: string, body: unknown): Response {
  calls.push({ method, path, body });
  // The page first asks /api/public/session whether anyone is signed in; derive it from the scripted /api/me.
  if (path === "/api/public/session") {
    const me = server["GET /api/me"]?.(undefined);
    if (!me || me.status === 404) return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ signedIn: (me.status ?? 200) < 400 }), { status: 200, headers: { "content-type": "application/json" } });
  }
  const handler = server[`${method} ${path.split("?")[0]}`];
  if (!handler) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "content-type": "application/json" } });
  const out = handler(body);
  return new Response(JSON.stringify(out.json ?? {}), { status: out.status ?? 200, headers: { "content-type": "application/json" } });
}

async function open(path: string): Promise<void> {
  window.history.replaceState(null, "", path);
  await act(async () => {
    root.render(
      <I18nProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </I18nProvider>,
    );
  });
  await act(async () => {});
  await act(async () => {});
}

const $ = <T extends Element>(selector: string): T => {
  const el = host.querySelector<T>(selector);
  if (!el) throw new Error(`Not found: ${selector}\n${host.textContent?.slice(0, 300)}`);
  return el;
};
const buttonByText = (text: RegExp | string): HTMLButtonElement => {
  const found = [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => (typeof text === "string" ? b.textContent?.trim() === text : text.test(b.textContent ?? "")));
  if (!found) throw new Error(`No button ${text}\n${host.textContent?.slice(0, 400)}`);
  return found;
};
async function type(el: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function click(el: HTMLElement): Promise<void> {
  await act(async () => {
    el.click();
  });
  await act(async () => {});
}
const input = (labelText: RegExp | string): HTMLInputElement => {
  const label = [...host.querySelectorAll("label")].find((l) => (typeof labelText === "string" ? l.textContent?.trim().startsWith(labelText) : labelText.test(l.textContent ?? "")));
  if (!label) throw new Error(`No label ${labelText}`);
  return document.getElementById(label.getAttribute("for") as string) as HTMLInputElement;
};

describe("account screens", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    window.scrollTo = vi.fn();
    window.localStorage.clear();
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["en-US"]);
    calls = [];
    server = { "GET /api/me": () => ({ status: 401, json: { error: "unauthenticated" } }), "GET /api/config": () => ({ json: { privacyUrl: null, termsUrl: null } }) };
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => respond(init?.method ?? "GET", String(url), init?.body ? JSON.parse(String(init.body)) : undefined)));
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("offers sign in and create account when signed out, and nothing at all when there is no server", async () => {
    await open("/");
    expect([...host.querySelectorAll(".acct-links a")].map((a) => a.textContent)).toEqual(["Sign in", "Create account"]);
    act(() => root.unmount());
    root = createRoot(host);
    server["GET /api/me"] = () => ({ status: 404, json: { error: "not_found" } });
    await open("/");
    expect(host.querySelector(".acct-links")).toBeNull();
    expect(host.querySelector(".acct-menu")).toBeNull();
    expect($("h1").textContent).toBe("Start your website"); // the builder itself is untouched
  });

  it("signs in, returns to the page asked for, and keeps what the person typed elsewhere", async () => {
    server["POST /api/auth/sign-in/email"] = () => {
      server["GET /api/me"] = () => ({ json: ME });
      return { json: { token: "x" } };
    };
    await open("/account/sign-in?next=%2Fdashboard");
    await type(input("Email"), "ayse@example.test");
    await type(input("Password"), "a long passphrase here");
    await click(buttonByText("Sign in"));
    expect(window.location.pathname).toBe("/dashboard");
    expect(calls.find((c) => c.path === "/api/auth/sign-in/email")?.body).toEqual({ email: "ayse@example.test", password: "a long passphrase here" });
  });

  it("never follows an external return address", async () => {
    server["POST /api/auth/sign-in/email"] = () => {
      server["GET /api/me"] = () => ({ json: ME });
      return { json: {} };
    };
    await open("/account/sign-in?next=" + encodeURIComponent("https://evil.example/phish"));
    await type(input("Email"), "ayse@example.test");
    await type(input("Password"), "a long passphrase here");
    await click(buttonByText("Sign in"));
    expect(window.location.pathname).toBe("/dashboard");
    expect(window.location.hostname).not.toBe("evil.example");
  });

  it("says the same thing for a wrong password and an unknown account", async () => {
    server["POST /api/auth/sign-in/email"] = () => ({ status: 401, json: { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" } });
    await open("/account/sign-in");
    await type(input("Email"), "who@example.test");
    await type(input("Password"), "not the password");
    await click(buttonByText("Sign in"));
    expect($("[role=alert]").textContent).toBe("The email or password is not correct.");
  });

  it("asks for the two-step code after the password, and accepts a backup code instead", async () => {
    server["POST /api/auth/sign-in/email"] = () => ({ json: { twoFactorRedirect: true } });
    server["POST /api/auth/two-factor/verify-backup-code"] = () => {
      server["GET /api/me"] = () => ({ json: ME });
      return { json: {} };
    };
    await open("/account/sign-in?next=%2Fdashboard");
    await type(input("Email"), "ayse@example.test");
    await type(input("Password"), "a long passphrase here");
    await click(buttonByText("Sign in"));
    expect($("h1").textContent).toBe("Two-step verification");
    expect(input("Code").getAttribute("autocomplete")).toBe("one-time-code");
    await click(buttonByText("Use a backup code instead"));
    await type(input("Backup code"), "ABCD EFGH");
    await click(buttonByText("Verify"));
    expect(calls.find((c) => c.path.endsWith("verify-backup-code"))?.body).toEqual({ code: "ABCDEFGH" });
    expect(window.location.pathname).toBe("/dashboard");
  });

  it("uses password-manager friendly fields and lets the password be shown and pasted", async () => {
    await open("/account/register");
    expect(input("Email").getAttribute("autocomplete")).toBe("username");
    expect(input("Password").getAttribute("autocomplete")).toBe("new-password");
    expect(input("Your name").getAttribute("autocomplete")).toBe("name");
    expect(input("Password").type).toBe("password");
    await click(buttonByText("Show"));
    expect(input("Password").type).toBe("text");
    expect(input("Password").hasAttribute("maxlength")).toBe(false); // nothing blocks a long pasted passphrase
  });

  it("blocks a short password before asking the server, and sends the language chosen", async () => {
    server["POST /api/auth/sign-up/email"] = () => ({ json: {} });
    await open("/account/register");
    await type(input("Your name"), "Ayşe");
    await type(input("Email"), "ayse@example.test");
    await type(input("Password"), "short");
    await click(buttonByText("Create account"));
    expect($("[role=alert]").textContent).toMatch(/at least 10/);
    expect(calls.some((c) => c.path === "/api/auth/sign-up/email")).toBe(false);

    await type(input("Password"), "a long passphrase here");
    await click(buttonByText("Create account"));
    const sent = calls.find((c) => c.path === "/api/auth/sign-up/email")!.body;
    expect(sent).toMatchObject({ name: "Ayşe", email: "ayse@example.test", preferredLanguage: "en" });
    expect(window.location.pathname).toBe("/account/check-email");
    expect(window.location.search).toBe(""); // the address is never placed in a URL
  });

  it("is truthful when verification email cannot be sent", async () => {
    server["POST /api/auth/sign-up/email"] = () => ({ status: 503, json: { code: "EMAIL_UNAVAILABLE", message: "Email cannot be sent right now." } });
    await open("/account/register");
    await type(input("Your name"), "Ayşe");
    await type(input("Email"), "ayse@example.test");
    await type(input("Password"), "a long passphrase here");
    await click(buttonByText("Create account"));
    expect($("[role=alert]").textContent).toMatch(/Email cannot be sent right now, so nothing was done/);
    expect(window.location.pathname).toBe("/account/register");
  });

  it("gives the same recovery answer however the server replies about the address", async () => {
    server["POST /api/auth/request-password-reset"] = () => ({ json: { status: true } });
    await open("/account/forgot-password");
    await type(input("Email"), "anyone@example.test");
    await click(buttonByText("Send reset link"));
    expect($("[role=status]").textContent).toMatch(/If an account uses that address/);
    expect(calls[calls.length - 1]!.body.redirectTo).toMatch(/\/account\/reset-password$/);
  });

  it("shows a used or expired verification link as such, and offers a new one", async () => {
    await open("/account/verify-email?error=token_used");
    expect($("h1").textContent).toBe("That link was already used");
    act(() => root.unmount());
    root = createRoot(host);
    await open("/account/verify-email");
    expect($("h1").textContent).toBe("Email verified");
  });

  it("removes the reset token from the address bar once used", async () => {
    server["POST /api/auth/reset-password"] = () => ({ json: { status: true } });
    await open("/account/reset-password?token=SECRET-TOKEN");
    await type(input("New password"), "a brand new passphrase");
    await click(buttonByText("Change password"));
    expect(calls.find((c) => c.path === "/api/auth/reset-password")?.body).toEqual({ newPassword: "a brand new passphrase", token: "SECRET-TOKEN" });
    expect(window.location.href).not.toContain("SECRET-TOKEN");
    expect($("h1").textContent).toBe("Choose a new password");
    expect(host.textContent).toMatch(/password was changed/);
  });

  it("shows the founder badge in the account menu only when the server says so", async () => {
    server["GET /api/me"] = () => ({ json: { ...ME, badge: { label: "Founder · Admin" } } });
    await open("/");
    expect($(".acct-menu .founder-badge").textContent).toBe("Founder · Admin");
    act(() => root.unmount());
    root = createRoot(host);
    server["GET /api/me"] = () => ({ json: { ...ME, name: "Founder · Admin", badge: null } });
    await open("/");
    expect(host.querySelector(".founder-badge")).toBeNull(); // a display name cannot fake it
  });

  it("asks someone who is signed out to sign in to submit, and keeps their design", async () => {
    await open("/");
    const country = host.querySelector<HTMLSelectElement>("select[aria-describedby]")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(country, "TR");
      country.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await click([...host.querySelectorAll<HTMLButtonElement>(".stepper button")][5] as HTMLButtonElement);
    expect(host.textContent).toMatch(/Sign in or create an account to send your design to BUSW/);
    await click(buttonByText("Sign in to submit"));
    expect(window.location.pathname).toBe("/account/sign-in");
    expect(new URLSearchParams(window.location.search).get("next")).toBe("/");
    // The builder's state lives above the pages, so it is still there when the person comes back.
    await act(async () => {
      window.history.pushState(null, "", "/");
      window.dispatchEvent(new Event("busw:navigate"));
    });
    expect($("h1").textContent).toBe("Review and submit");
    expect($<HTMLSelectElement>("select[aria-describedby]").value).toBe("TR");
  });

  it("shows a client their quotes and status, and nothing internal", async () => {
    server["GET /api/me"] = () => ({ json: ME });
    server["GET /api/projects"] = () => ({ json: { projects: [{ id: "p1", name: "My cafe site", templateId: "studio", revision: 2, source: "cloud", updatedAt: "2026-10-27T10:00:00Z" }] } });
    server["GET /api/submissions"] = () => ({
      json: { submissions: [{ id: "s1", reference: "BUSW-ABCD-2345", status: "quoted", submittedAt: "2026-10-26T10:00:00Z", currency: "USD", region: "us", template: "studio", pages: [{ title: "Home", slug: "index", sections: 4 }], pricing: { oneTimeTotalMinor: 39900, monthlyTotalMinor: 0, lines: [{ id: "base-website", quantity: 1, unitPriceMinor: 39900, totalMinor: 39900, billing: "one-time" }], quoteOnly: [] }, quotes: [{ id: "q1", title: "Your website", message: "Here is the plan.", currency: "USD", oneTimeMinor: 45000, monthlyMinor: 0, createdAt: "2026-10-27T09:00:00Z" }] }] },
    });
    await open("/dashboard");
    expect(host.textContent).toContain("My cafe site");
    expect(host.textContent).toContain("Quote sent");
    await click(buttonByText("Details"));
    expect(host.textContent).toContain("Here is the plan.");
    expect(host.textContent).toContain("$450");
    expect(host.textContent).not.toMatch(/internal|note:|audit/i);
    expect([...host.querySelectorAll("button")].some((b) => /revision request|request information/i.test(b.textContent ?? ""))).toBe(false); // only what really exists
  });

  it("tells a restricted account why the dashboard is unavailable, and does not fetch its data", async () => {
    server["GET /api/me"] = () => ({ json: { ...ME, access: { ...ME.access, busw: "restricted" } } });
    await open("/dashboard");
    expect(host.textContent).toMatch(/restricted/);
    expect(calls.some((c) => c.path === "/api/projects")).toBe(false);
  });

  it("explains how to set up the first owner when none exists, and to nobody an admin page", async () => {
    server["GET /api/me"] = () => ({ json: { ...ME, ownerProvisioned: false } });
    await open("/admin");
    expect($("h1").textContent).toBe("Administration is not set up yet");
    expect(host.textContent).toContain("npm run bootstrap-owner -- --user-id <account id>");
    expect(host.textContent).not.toMatch(/setup is complete/i);
  });

  it("keeps staff out until they have two-step verification, and tells them how", async () => {
    server["GET /api/me"] = () => ({ json: { ...ME, access: { ...ME.access, accountAdmin: true, staffNeedsMfa: true } } });
    await open("/admin/accounts");
    expect(host.textContent).toMatch(/Set up two-step verification to open administration/);
    expect(calls.some((c) => c.path.startsWith("/api/account-admin"))).toBe(false);
  });

  it("does not offer role changes to administrators who are not owners", async () => {
    server["GET /api/me"] = () => ({ json: { ...ME, roles: [{ scope: "bu-account", role: "admin" }], access: { ...ME.access, accountAdmin: true } } });
    server["GET /api/account-admin/users/u2"] = () => ({ json: { user: { id: "u2", name: "Target", email: "t@example.test", emailVerified: true, status: "active", createdAt: "2026-10-01T00:00:00Z", badge: null, apps: [], statusReason: null, roles: [], appAccess: [{ appId: "busw", status: "active" }], sessions: [], mfaEnabled: false } } });
    await open("/admin/accounts/u2");
    expect(host.textContent).toMatch(/Only platform owners can grant or revoke roles/);
    expect(host.textContent).not.toContain("Grant role");
  });

  it("asks for a reason and a confirmation before suspending", async () => {
    server["GET /api/me"] = () => ({ json: { ...ME, roles: [{ scope: "bu-account", role: "admin" }], access: { ...ME.access, accountAdmin: true } } });
    server["GET /api/account-admin/users/u2"] = () => ({ json: { user: { id: "u2", name: "Target", email: "t@example.test", emailVerified: true, status: "active", createdAt: "2026-10-01T00:00:00Z", badge: null, apps: [], statusReason: null, roles: [], appAccess: [], sessions: [], mfaEnabled: false } } });
    server["POST /api/account-admin/users/u2/suspend"] = () => ({ json: { ok: true } });
    await open("/admin/accounts/u2");
    await click(buttonByText("Suspend account"));
    expect(calls.some((c) => c.path.endsWith("/suspend"))).toBe(false); // opening the form does nothing
    await click(buttonByText("Suspend this account"));
    expect(host.textContent).toMatch(/reason of at least 3 characters/);
    expect(calls.some((c) => c.path.endsWith("/suspend"))).toBe(false);
    await type($<HTMLTextAreaElement>("textarea"), "Reported abuse");
    await click(buttonByText("Suspend this account"));
    expect(calls.find((c) => c.path.endsWith("/suspend"))?.body).toEqual({ reason: "Reported abuse" });
  });

  it("shows a client's text in admin as plain text, never as markup", async () => {
    server["GET /api/me"] = () => ({ json: { ...ME, roles: [{ scope: "busw", role: "staff" }], access: { ...ME.access, buswAdmin: true } } });
    const attack = "<img src=x onerror=alert(1)>";
    server["GET /api/busw/admin/submissions/s1"] = () => ({
      json: { submission: { id: "s1", reference: "BUSW-AAAA-BBBB", status: "received", receivedAt: "2026-10-27T10:00:00Z", currency: "USD", region: "us", ownershipStatus: "owned", owner: { id: "u1", name: "Ayşe" }, discrepancies: [], snapshot: { client: { businessName: attack, contactName: "<b>x</b>", email: "a@b.test", notes: "<script>alert(2)</script>" }, country: "US", template: { id: "studio" }, design: { pages: [{ title: attack, slug: "index", sections: [{ type: "hero", props: { heading: attack } }] }] }, addons: { advancedForm: false, booking: false, blog: false, analytics: false, businessEmail: false, photoGalleries: 0, imagePrepBatches: 0, migrationPages: 0, extraRevisions: 0, languages: [], hosting: "none", quoteRequests: [] }, assets: [] }, estimate: { oneTimeTotalMinor: 39900, monthlyTotalMinor: 0, lines: [{ id: "base-website", quantity: 1, totalMinor: 39900 }], quoteOnly: [] }, notes: [], quotes: [] } },
    });
    await open("/admin/busw/s1");
    expect(host.textContent).toContain(attack);
    expect(host.querySelector("img[src='x']")).toBeNull();
    expect(host.querySelector("script")).toBeNull();
    expect(host.querySelector("b")).toBeNull();
  });
});
