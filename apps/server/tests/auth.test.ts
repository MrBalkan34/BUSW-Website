import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config";
import { Browser, PASSWORD, lastMail, linkIn, newUser, register, signIn, world } from "./helpers";

const path = (url: string) => url.replace(/^https?:\/\/[^/]+/, "");

afterEach(() => vi.useRealTimers());

describe("registration and email verification", () => {
  it("creates no session until the email is verified, then verifies once only", async () => {
    const w = await world();
    const b = new Browser(w);
    expect((await b.post("/api/auth/sign-up/email", { name: "Ada", email: "ada@example.test", password: PASSWORD })).status).toBe(200);
    expect(b.cookies.size).toBe(0);
    expect((await b.post("/api/auth/sign-in/email", { email: "ada@example.test", password: PASSWORD })).status).toBe(403);

    const link = linkIn(lastMail(w, "ada@example.test")!.text);
    expect([200, 302]).toContain((await w.app.request(path(link))).status);
    expect((await b.post("/api/auth/sign-in/email", { email: "ada@example.test", password: PASSWORD })).status).toBe(200);

    // The same link, presented again, is refused.
    const again = await w.app.request(path(link), { redirect: "manual" });
    expect(again.headers.get("location") ?? "").toMatch(/error=token_used/);
  });

  it("rejects an expired verification link", async () => {
    const w = await world();
    const b = new Browser(w);
    await b.post("/api/auth/sign-up/email", { name: "Old", email: "old@example.test", password: PASSWORD });
    const link = linkIn(lastMail(w, "old@example.test")!.text);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000); // two hours later; links last one
    const res = await w.app.request(path(link), { redirect: "manual" });
    expect(res.headers.get("location") ?? (await res.text())).toMatch(/error/i);
    vi.useRealTimers();
    expect((await b.post("/api/auth/sign-in/email", { email: "old@example.test", password: PASSWORD })).status).toBe(403);
  });

  it("answers a sign-up for a taken address like a new one, so addresses cannot be probed", async () => {
    const w = await world();
    await register(w, "taken@example.test");
    const fresh = await new Browser(w).post("/api/auth/sign-up/email", { name: "A", email: "fresh@example.test", password: PASSWORD });
    const dup = await new Browser(w).post("/api/auth/sign-up/email", { name: "B", email: "taken@example.test", password: PASSWORD });
    expect(dup.status).toBe(fresh.status);
    expect(Object.keys(await dup.json()).sort()).toEqual(Object.keys(await fresh.json()).sort());
    expect(w.services.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM "user" WHERE email = ?', "taken@example.test")?.n).toBe(1);
  });

  it("sends the first email in the language chosen at sign-up, and refuses an unknown language", async () => {
    const w = await world();
    expect((await new Browser(w).post("/api/auth/sign-up/email", { name: "T", email: "tr@example.test", password: PASSWORD, preferredLanguage: "tr" })).status).toBe(200);
    expect(lastMail(w, "tr@example.test")!.subject).toMatch(/doğrulayın/);
    expect((await new Browser(w).post("/api/auth/sign-up/email", { name: "D", email: "de@example.test", password: PASSWORD, preferredLanguage: "de" })).status).toBe(400);
    expect(w.services.db.get('SELECT 1 AS x FROM "user" WHERE email = ?', "de@example.test")).toBeUndefined();
  });

  it("enforces password length and accepts long, pasted passwords", async () => {
    const w = await world();
    const b = new Browser(w);
    expect((await b.post("/api/auth/sign-up/email", { name: "S", email: "short@example.test", password: "short" })).status).toBe(400);
    const long = `${"pasted ".repeat(18)}!`;
    expect((await b.post("/api/auth/sign-up/email", { name: "L", email: "long@example.test", password: long })).status).toBe(200);
  });

  it("refuses an external callback URL, so a link cannot send people to another site", async () => {
    const w = await world();
    await new Browser(w).post("/api/auth/sign-up/email", { name: "X", email: "x@example.test", password: PASSWORD });
    const link = new URL(linkIn(lastMail(w, "x@example.test")!.text));
    link.searchParams.set("callbackURL", "https://evil.example/steal");
    const res = await w.app.request(path(link.toString()), { redirect: "manual" });
    expect(res.status).toBe(403);
    expect(res.headers.get("location") ?? "").not.toMatch(/evil/);
    // Forged-looking variants are refused too.
    for (const bad of ["//evil.example", "/\\evil.example", "javascript:alert(1)", "https://localhost.evil.example/", "https://evil.example@localhost:4173/"]) {
      const forged = new URL(linkIn(lastMail(w, "x@example.test")!.text));
      forged.searchParams.set("callbackURL", bad);
      expect((await w.app.request(path(forged.toString()), { redirect: "manual" })).status, bad).toBe(403);
    }
    // A trusted origin (the marketing site) is fine.
    const ok = new URL(linkIn(lastMail(w, "x@example.test")!.text));
    ok.searchParams.set("callbackURL", "http://localhost:4173/");
    expect((await w.app.request(path(ok.toString()), { redirect: "manual" })).status).toBe(302);
  });

  it("does not let sign-up set privileged fields", async () => {
    const w = await world();
    const b = new Browser(w);
    await b.post("/api/auth/sign-up/email", { name: "Sneaky", email: "sneaky@example.test", password: PASSWORD, role: "admin", preferredLanguage: "tr", twoFactorEnabled: true, emailVerified: true });
    const row = w.services.db.get<{ emailVerified: number; role?: string; twoFactorEnabled: number | null }>('SELECT * FROM "user" WHERE email = ?', "sneaky@example.test");
    if (row) {
      expect(row.emailVerified).toBe(0);
      expect(row.role).toBeUndefined();
      expect(row.twoFactorEnabled ?? 0).toBe(0);
    }
    expect(w.services.db.get("SELECT 1 AS x FROM role_assignment")).toBeUndefined();
  });
});

describe("sign-in, sign-out and cookies", () => {
  it("signs in and out, with host-only HttpOnly SameSite=Lax cookies", async () => {
    const w = await world();
    await register(w, "cookie@example.test");
    const b = new Browser(w);
    const res = await b.post("/api/auth/sign-in/email", { email: "cookie@example.test", password: PASSWORD });
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith("bu.session_token"))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/Domain=/i);
    expect((await b.me())?.email).toBe("cookie@example.test");

    expect((await b.post("/api/auth/sign-out")).status).toBe(200);
    expect(await b.me()).toBeNull();
  });

  it("rejects a wrong password with the same answer as an unknown account", async () => {
    const w = await world();
    await register(w, "known@example.test");
    const wrong = await new Browser(w).post("/api/auth/sign-in/email", { email: "known@example.test", password: "not the password at all" });
    const unknown = await new Browser(w).post("/api/auth/sign-in/email", { email: "nobody@example.test", password: "not the password at all" });
    expect(wrong.status).toBe(unknown.status);
    expect(await wrong.json()).toEqual(await unknown.json());
  });

  it("rate-limits repeated sign-in attempts", async () => {
    process.env.BU_TEST_RATE_LIMIT = "on";
    try {
      const w = await world();
      await register(w, "limit@example.test");
      const statuses: number[] = [];
      for (let i = 0; i < 8; i += 1) statuses.push((await new Browser(w).post("/api/auth/sign-in/email", { email: "limit@example.test", password: "wrong wrong wrong" })).status);
      expect(statuses).toContain(429);
    } finally {
      delete process.env.BU_TEST_RATE_LIMIT;
    }
  });
});

describe("password recovery", () => {
  it("gives the same answer for known and unknown addresses", async () => {
    const w = await world();
    await register(w, "known@example.test");
    const a = await new Browser(w).post("/api/auth/request-password-reset", { email: "known@example.test", redirectTo: `${w.services.config.appOrigin}/account/reset-password` });
    const b = await new Browser(w).post("/api/auth/request-password-reset", { email: "nobody@example.test", redirectTo: `${w.services.config.appOrigin}/account/reset-password` });
    expect(a.status).toBe(b.status);
    expect(await a.json()).toEqual(await b.json());
    expect(lastMail(w, "nobody@example.test")).toBeUndefined();
  });

  it("resets once, ends other sessions, and rejects the link a second time and after expiry", async () => {
    const w = await world();
    const { browser } = await newUser(w, "rec@example.test");
    expect(await browser.me()).not.toBeNull();

    const b = new Browser(w);
    await b.post("/api/auth/request-password-reset", { email: "rec@example.test", redirectTo: `${w.services.config.appOrigin}/account/reset-password` });
    const link = linkIn(lastMail(w, "rec@example.test")!.text);
    const hop = await w.app.request(path(link), { redirect: "manual" });
    const token = new URL(hop.headers.get("location")!, w.services.config.appOrigin).searchParams.get("token")!;
    expect(token).toBeTruthy();

    const next = "an entirely different passphrase";
    expect((await b.post("/api/auth/reset-password", { newPassword: next, token })).status).toBe(200);
    expect((await b.post("/api/auth/reset-password", { newPassword: "yet another passphrase here", token })).status).toBeGreaterThanOrEqual(400);

    expect(await browser.me()).toBeNull(); // the session open before the reset is gone
    expect((await new Browser(w).post("/api/auth/sign-in/email", { email: "rec@example.test", password: PASSWORD })).status).toBe(401);
    await expect(signIn(w, "rec@example.test", next)).resolves.toBeDefined();

    await b.post("/api/auth/request-password-reset", { email: "rec@example.test", redirectTo: `${w.services.config.appOrigin}/account/reset-password` });
    const link2 = linkIn(lastMail(w, "rec@example.test")!.text);
    w.services.db.run("UPDATE verification SET expiresAt = ?", new Date(Date.now() - 1000).toISOString());
    const expired = await w.app.request(path(link2), { redirect: "manual" });
    expect(expired.headers.get("location") ?? "").toMatch(/error/i);
  });
});

describe("truthful email delivery", () => {
  it("says so when mail cannot be sent, and creates nothing", async () => {
    const w = await world();
    w.mailer.down = true;
    const res = await new Browser(w).post("/api/auth/sign-up/email", { name: "N", email: "n@example.test", password: PASSWORD });
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).toMatch(/EMAIL_UNAVAILABLE|cannot be sent/i);
    expect(w.services.db.get('SELECT 1 AS x FROM "user" WHERE email = ?', "n@example.test")).toBeUndefined();
    const reset = await new Browser(w).post("/api/auth/request-password-reset", { email: "n@example.test", redirectTo: `${w.services.config.appOrigin}/account/reset-password` });
    expect(reset.status).toBe(503);
  });
});

describe("configuration guards", () => {
  const prod = { NODE_ENV: "production", APP_ORIGIN: "https://account.example.test", BETTER_AUTH_SECRET: "x".repeat(40), EMAIL_TRANSPORT: "smtp", SMTP_URL: "smtp://localhost:2525" };
  it("accepts a complete production configuration", () => expect(() => loadConfig(prod)).not.toThrow());
  it("refuses production without a secret, with the development outbox, over http, or without MFA", () => {
    expect(() => loadConfig({ ...prod, BETTER_AUTH_SECRET: "" })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => loadConfig({ ...prod, BETTER_AUTH_SECRET: "short" })).toThrow(/32/);
    expect(() => loadConfig({ ...prod, EMAIL_TRANSPORT: "dev-outbox" })).toThrow(/development outbox/);
    expect(() => loadConfig({ ...prod, SMTP_URL: "" })).toThrow(/SMTP_URL/);
    expect(() => loadConfig({ ...prod, APP_ORIGIN: "http://account.example.test" })).toThrow(/https/);
    expect(() => loadConfig({ ...prod, REQUIRE_MFA_FOR_STAFF: "false" })).toThrow(/MFA/);
  });
  it("uses secure cookies in production only", () => {
    expect(loadConfig(prod).isProduction).toBe(true);
    expect(loadConfig({ NODE_ENV: "test" }).isProduction).toBe(false);
  });
});
