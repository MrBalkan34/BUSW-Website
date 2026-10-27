import { afterEach, describe, expect, it, vi } from "vitest";
import { Browser, PASSWORD, enrollMfa, give, lastMail, linkIn, newUser, register, signIn, signInWithMfa, staff, totp, world } from "./helpers";

const path = (url: string) => url.replace(/^https?:\/\/[^/]+/, "");
afterEach(() => vi.useRealTimers());

describe("the signed-in account", () => {
  it("returns only the person's own details and no private fields of others", async () => {
    const w = await world();
    const { browser } = await newUser(w, "me@example.test", "Me Myself");
    const me = await browser.me();
    expect(me).toMatchObject({ name: "Me Myself", email: "me@example.test", emailVerified: true, preferredLanguage: "en", badge: null, roles: [] });
    expect(me).not.toHaveProperty("password");
    expect(JSON.stringify(me)).not.toMatch(/token|secret|hash/i);
  });

  it("updates display name, language and optional business details, and refuses anything else", async () => {
    const w = await world();
    const { id, browser } = await newUser(w, "p@example.test");
    const ok = await browser.patch("/api/me", { name: "Pat Example", preferredLanguage: "tr", business: { name: "Örnek Kafe", country: "TR" } });
    expect(ok.status).toBe(200);
    expect(await browser.me()).toMatchObject({ name: "Pat Example", preferredLanguage: "tr", business: { name: "Örnek Kafe", country: "TR" } });

    for (const bad of [{ role: "owner" }, { founder: true }, { badge: "Founder · Admin" }, { roles: [{ scope: "platform", role: "owner" }] }, { emailVerified: true }, { preferredLanguage: "de" }, { business: { country: "ZZ" } }, { business: { owner: true } }]) {
      expect((await browser.patch("/api/me", bad)).status, JSON.stringify(bad)).toBe(422);
    }
    expect(w.services.db.get("SELECT 1 AS x FROM role_assignment WHERE user_id = ?", id)).toBeUndefined();
    expect(w.services.db.get("SELECT 1 AS x FROM founder_designation")).toBeUndefined();
  });

  it("refuses Better Auth's own profile-update and delete routes, which would bypass those checks", async () => {
    const w = await world();
    const { browser } = await newUser(w, "q@example.test");
    expect((await browser.post("/api/auth/update-user", { name: "x", preferredLanguage: "tr", role: "admin" })).status).toBe(404);
    expect((await browser.post("/api/auth/delete-user", { password: PASSWORD })).status).toBe(404);
  });

  it("changes the password only with the current one, and ends the other sessions", async () => {
    const w = await world();
    const { browser } = await newUser(w, "pw@example.test");
    const other = await signIn(w, "pw@example.test");
    expect((await browser.post("/api/auth/change-password", { currentPassword: "wrong wrong wrong", newPassword: "brand new passphrase!", revokeOtherSessions: true })).status).toBeGreaterThanOrEqual(400);
    expect((await browser.post("/api/auth/change-password", { currentPassword: PASSWORD, newPassword: "brand new passphrase!", revokeOtherSessions: true })).status).toBe(200);
    expect(await other.me()).toBeNull();
    expect(await browser.me()).not.toBeNull();
    await expect(signIn(w, "pw@example.test", "brand new passphrase!")).resolves.toBeDefined();
  });
});

describe("changing the email address", () => {
  it("needs the password, approves at the old address, verifies the new one, and keeps the old one working until then", async () => {
    const w = await world();
    const { id, browser } = await newUser(w, "old@example.test");

    expect((await browser.post("/api/account/change-email", { newEmail: "new@example.test", currentPassword: "not my password at all" })).status).toBe(403);
    expect(lastMail(w, "new@example.test")).toBeUndefined();

    const res = await browser.post("/api/account/change-email", { newEmail: "new@example.test", currentPassword: PASSWORD });
    expect(res.status).toBe(202);
    const approval = lastMail(w, "old@example.test")!;
    expect(approval.subject).toMatch(/approve/i);
    expect(lastMail(w, "new@example.test")).toBeUndefined(); // nothing goes to the new address until the old one approves

    // Until the change completes the old address is still the account's address.
    await expect(signIn(w, "old@example.test")).resolves.toBeDefined();
    expect(w.services.db.get<{ email: string }>('SELECT email FROM "user" WHERE id = ?', id)?.email).toBe("old@example.test");

    await w.app.request(path(linkIn(approval.text)), { redirect: "manual" });
    const verify = lastMail(w, "new@example.test")!;
    expect(verify).toBeDefined();
    expect(w.services.db.get<{ email: string }>('SELECT email FROM "user" WHERE id = ?', id)?.email).toBe("old@example.test");

    await w.app.request(path(linkIn(verify.text)), { redirect: "manual" });
    expect(w.services.db.get<{ email: string }>('SELECT email FROM "user" WHERE id = ?', id)?.email).toBe("new@example.test");
    await expect(signIn(w, "new@example.test")).resolves.toBeDefined();
  });

  it("changes nothing if the new address is never verified, or the link has expired", async () => {
    const w = await world();
    const { id, browser } = await newUser(w, "keep@example.test");
    await browser.post("/api/account/change-email", { newEmail: "never@example.test", currentPassword: PASSWORD });
    const approval = lastMail(w, "keep@example.test")!;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 3 * 60 * 60 * 1000);
    const res = await w.app.request(path(linkIn(approval.text)), { redirect: "manual" });
    expect(res.headers.get("location") ?? "").toMatch(/error/i);
    vi.useRealTimers();
    expect(lastMail(w, "never@example.test")).toBeUndefined();
    expect(w.services.db.get<{ email: string }>('SELECT email FROM "user" WHERE id = ?', id)?.email).toBe("keep@example.test");
  });

  it("requires a recent sign-in", async () => {
    const w = await world({ REAUTH_WINDOW_SECONDS: "60" });
    const { browser } = await newUser(w, "stale@example.test");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 10 * 60 * 1000);
    const res = await browser.post("/api/account/change-email", { newEmail: "other@example.test", currentPassword: PASSWORD });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("reauth_required");
  });

  it("tells the truth when the email cannot be sent, and changes nothing", async () => {
    const w = await world();
    const { id, browser } = await newUser(w, "mail@example.test");
    w.mailer.down = true;
    const res = await browser.post("/api/account/change-email", { newEmail: "next@example.test", currentPassword: PASSWORD });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("email_unavailable");
    expect(w.services.db.get<{ email: string }>('SELECT email FROM "user" WHERE id = ?', id)?.email).toBe("mail@example.test");
  });

  it("answers the same for an address that is already taken", async () => {
    const w = await world();
    await register(w, "taken@example.test");
    const { browser } = await newUser(w, "asker@example.test");
    const taken = await browser.post("/api/account/change-email", { newEmail: "taken@example.test", currentPassword: PASSWORD });
    const free = await browser.post("/api/account/change-email", { newEmail: "free@example.test", currentPassword: PASSWORD });
    expect(taken.status).toBe(free.status);
    expect(await taken.json()).toEqual(await free.json());
  });

  it("does not let the raw Better Auth route skip those checks", async () => {
    const w = await world();
    const { browser } = await newUser(w, "raw@example.test");
    expect((await browser.post("/api/auth/change-email", { newEmail: "x@example.test" })).status).toBe(404);
  });
});

describe("sessions", () => {
  it("lists devices without tokens, revokes one, the others, or all", async () => {
    const w = await world();
    const { browser: a } = await newUser(w, "s@example.test");
    const b = await signIn(w, "s@example.test");
    const c = await signIn(w, "s@example.test");

    const list = await (await a.get("/api/account/sessions")).json();
    expect(list.sessions).toHaveLength(3);
    expect(JSON.stringify(list)).not.toMatch(/token/i);
    expect(list.sessions.filter((s: { current: boolean }) => s.current)).toHaveLength(1);

    const other = list.sessions.find((s: { current: boolean }) => !s.current);
    expect((await a.del(`/api/account/sessions/${other.id}`)).status).toBe(200);
    expect((await a.del(`/api/account/sessions/${other.id}`)).status).toBe(404);
    expect((await a.post("/api/account/sessions/revoke-others")).status).toBe(200);
    expect(await a.me()).not.toBeNull();
    expect([await b.me(), await c.me()].filter(Boolean)).toHaveLength(0);

    expect((await a.post("/api/account/sessions/revoke-all")).status).toBe(200);
    expect(await a.me()).toBeNull();
  });

  it("cannot revoke someone else's session", async () => {
    const w = await world();
    const { browser: a } = await newUser(w, "a@example.test");
    const { browser: b } = await newUser(w, "b@example.test");
    const victim = (await (await a.get("/api/account/sessions")).json()).sessions[0];
    expect((await b.del(`/api/account/sessions/${victim.id}`)).status).toBe(404);
    expect(await a.me()).not.toBeNull();
  });

  it("protects every private route when signed out", async () => {
    const w = await world();
    const anon = new Browser(w);
    for (const [method, url] of [["GET", "/api/me"], ["GET", "/api/account/sessions"], ["GET", "/api/projects"], ["GET", "/api/submissions"], ["GET", "/api/assets/x"], ["GET", "/api/busw/admin/submissions"], ["GET", "/api/account-admin/users"], ["GET", "/api/account-admin/audit"]] as const) {
      expect((await anon.request(method, url)).status, url).toBe(401);
    }
  });
});

describe("request forgery and cross-origin access", () => {
  it("refuses writes from another origin, even the trusted marketing site, and from no origin", async () => {
    const w = await world();
    const { browser } = await newUser(w, "csrf@example.test");
    const body = { name: "Hijacked" };
    const attempt = (origin?: string) => w.app.request("/api/me", { method: "PATCH", headers: { "content-type": "application/json", cookie: browser.cookieHeader, ...(origin ? { origin } : {}) }, body: JSON.stringify(body) });
    expect((await attempt("https://evil.example")).status).toBe(403);
    expect((await attempt("http://localhost:4173")).status).toBe(403);
    expect((await attempt()).status).toBe(403);
    expect((await attempt("http://localhost:5174")).status).toBe(200);
  });

  it("shares only a name and badge with the marketing site, and only with trusted origins", async () => {
    const w = await world();
    const { browser } = await newUser(w, "m@example.test", "Mara");
    const get = (origin: string) => w.app.request("/api/public/session", { headers: { origin, cookie: browser.cookieHeader } });
    const trusted = await get("http://localhost:4173");
    expect(trusted.headers.get("access-control-allow-origin")).toBe("http://localhost:4173");
    expect(trusted.headers.get("access-control-allow-credentials")).toBe("true");
    expect(await trusted.json()).toEqual({ signedIn: true, name: "Mara", badge: null });
    expect((await get("https://evil.example")).headers.get("access-control-allow-origin")).toBeNull();
    expect(await (await new Browser(w).get("/api/public/session")).json()).toEqual({ signedIn: false });
  });

  it("never exposes server errors or stack traces", async () => {
    const w = await world();
    const { browser } = await newUser(w, "e@example.test");
    const res = await browser.request("POST", "/api/projects", "not json", { "content-type": "application/json" });
    const text = await res.text();
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(text).not.toMatch(/at \w+ \(|node_modules|\.ts:\d+/);
  });
});

describe("suspension and application access", () => {
  async function adminWorld() {
    const w = await world();
    const admin = await staff(w, "admin@example.test", [["bu-account", "admin"]], "Account Admin");
    const user = await newUser(w, "user@example.test", "Ordinary User");
    return { w, admin, user };
  }

  it("suspending blocks sign-in and open sessions; reactivating does not restore them", async () => {
    const { w, admin, user } = await adminWorld();
    expect(await user.browser.me()).not.toBeNull();
    const res = await admin.browser.post(`/api/account-admin/users/${user.id}/suspend`, { reason: "Chargeback investigation" });
    expect(res.status).toBe(200);

    expect(await user.browser.me()).toBeNull();
    const attempt = await new Browser(w).post("/api/auth/sign-in/email", { email: "user@example.test", password: PASSWORD });
    expect(attempt.status).toBe(403);
    expect(JSON.stringify(await attempt.json())).toMatch(/suspend/i);

    expect((await admin.browser.post(`/api/account-admin/users/${user.id}/reactivate`, { reason: "Resolved" })).status).toBe(200);
    expect(await user.browser.me()).toBeNull(); // the old session stayed dead
    await expect(signIn(w, "user@example.test")).resolves.toBeDefined(); // a fresh sign-in works
  });

  it("an application restriction blocks BUSW only, leaving the shared identity usable", async () => {
    const { admin, user } = await adminWorld();
    expect((await user.browser.get("/api/projects")).status).toBe(200);
    expect((await admin.browser.post(`/api/account-admin/users/${user.id}/app-access`, { appId: "busw", status: "restricted", reason: "Abuse of the builder" })).status).toBe(200);

    const projects = await user.browser.get("/api/projects");
    expect(projects.status).toBe(403);
    expect((await projects.json()).error).toBe("app_restricted");
    expect((await user.browser.get("/api/submissions")).status).toBe(403);
    expect((await user.browser.get("/api/me")).status).toBe(200);
    expect((await user.browser.get("/api/account/sessions")).status).toBe(200);
    expect((await user.browser.patch("/api/me", { preferredLanguage: "tr" })).status).toBe(200);

    expect((await admin.browser.post(`/api/account-admin/users/${user.id}/app-access`, { appId: "busw", status: "active", reason: "Appeal accepted" })).status).toBe(200);
    expect((await user.browser.get("/api/projects")).status).toBe(200);
  });

  it("requires a reason for every sensitive action", async () => {
    const { admin, user } = await adminWorld();
    for (const [url, body] of [[`/suspend`, {}], [`/suspend`, { reason: "x" }], [`/revoke-sessions`, {}], [`/app-access`, { appId: "busw", status: "restricted" }]] as const) {
      expect((await admin.browser.post(`/api/account-admin/users/${user.id}${url}`, body)).status, url).toBe(422);
    }
  });

  it("will not let an administrator suspend themselves or act on an owner", async () => {
    const { w, admin } = await adminWorld();
    expect((await admin.browser.post(`/api/account-admin/users/${admin.id}/suspend`, { reason: "Testing myself" })).status).toBe(409);
    const owner = await staff(w, "owner@example.test", [["platform", "owner"]], "The Owner");
    for (const url of ["suspend", "revoke-sessions"]) {
      const res = await admin.browser.post(`/api/account-admin/users/${owner.id}/${url}`, { reason: "Trying it anyway" });
      expect(res.status, url).toBe(403);
      expect((await res.json()).error).toBe("owner_protected");
    }
    expect((await admin.browser.post(`/api/account-admin/users/${owner.id}/app-access`, { appId: "busw", status: "restricted", reason: "Trying it anyway" })).status).toBe(403);
  });
});

describe("two-step verification and the staff gate", () => {
  it("opens administration only after two-step verification is set up and passed", async () => {
    const w = await world();
    const id = await register(w, "mfa@example.test");
    give(w, id, "bu-account", "admin");

    const plain = await signIn(w, "mfa@example.test");
    const denied = await plain.get("/api/account-admin/users");
    expect(denied.status).toBe(403);
    expect((await denied.json()).error).toBe("mfa_enrollment_required");
    expect((await plain.me())?.access.staffNeedsMfa).toBe(true);

    const secret = await enrollMfa(plain);
    expect((await plain.get("/api/account-admin/users")).status).toBe(200); // this session just proved the code

    // A session opened by password alone before enrolling has NOT passed the second step.
    const passwordOnly = await signIn(w, "mfa@example.test"); // with two-step on, a password alone only starts a challenge
    expect(await passwordOnly.me()).toBeNull();
    expect((await passwordOnly.get("/api/account-admin/users")).status).toBe(401);

    const full = await signInWithMfa(w, "mfa@example.test", secret);
    expect((await full.get("/api/account-admin/users")).status).toBe(200);
    expect((await full.me())?.access.staffNeedsMfa).toBe(false);
  });

  it("refuses a staff session that was opened before the second step was added", async () => {
    const w = await world();
    const id = await register(w, "early@example.test");
    give(w, id, "busw", "staff");
    const early = await signIn(w, "early@example.test"); // opened before two-step existed
    const other = await signIn(w, "early@example.test");
    await enrollMfa(other);
    const res = await early.get("/api/busw/admin/submissions");
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("mfa_required");
  });

  it("rejects a wrong or reused authenticator code and rate-limits guessing", async () => {
    const w = await world();
    await register(w, "code@example.test");
    const first = await signIn(w, "code@example.test");
    const secret = await enrollMfa(first);
    const b = new Browser(w);
    await b.post("/api/auth/sign-in/email", { email: "code@example.test", password: PASSWORD });
    expect((await b.post("/api/auth/two-factor/verify-totp", { code: "000000" })).status).toBeGreaterThanOrEqual(400);
    expect((await b.post("/api/auth/two-factor/verify-totp", { code: totp(secret) })).status).toBe(200);
  });

  it("does not let ordinary users into administration at all", async () => {
    const w = await world();
    const { browser } = await newUser(w, "plain@example.test");
    for (const url of ["/api/account-admin/users", "/api/account-admin/audit", "/api/account-admin/overview", "/api/busw/admin/submissions"]) {
      const res = await browser.get(url);
      expect(res.status, url).toBe(403);
      expect((await res.json()).error, url).toBe("forbidden");
    }
  });
});
