import { afterEach, describe, expect, it, vi } from "vitest";
import { bootstrapOwner } from "../src/bootstrap";
import { getVerifiedBadge } from "../src/authz";
import { Browser, PASSWORD, enrollMfa, give, lastMail, makeOwner, newUser, register, signIn, signInWithMfa, staff, world, type World } from "./helpers";

afterEach(() => vi.useRealTimers());

/** Registers, is made owner by the operator command, then sets up two-step verification like the instructions say. */
async function founder(w: World, email = "founder@example.test") {
  const id = await register(w, email, "The Founder");
  makeOwner(w, id, email);
  const secret = await enrollMfa(await signIn(w, email));
  return { id, email, secret, browser: await signInWithMfa(w, email, secret) };
}

const auditActions = (w: World) => w.services.db.all<{ action: string }>("SELECT action FROM audit_event ORDER BY at, rowid").map((r) => r.action);

describe("owner bootstrap", () => {
  it("never makes the first registered user an owner", async () => {
    const w = await world();
    const { id, browser } = await newUser(w, "first@example.test");
    expect(w.services.db.get("SELECT 1 AS x FROM role_assignment WHERE user_id = ?", id)).toBeUndefined();
    expect((await browser.me())?.roles).toEqual([]);
    expect((await browser.get("/api/setup-status").then((r) => r.json())).ownerProvisioned).toBe(false);
  });

  it("refuses an unknown id, an unverified account, a wrong confirmation email and a suspended account", async () => {
    const w = await world();
    const op = "operator:test";
    expect(() => bootstrapOwner(w.services, { userId: "nope", confirmEmail: "x@example.test", operator: op })).toThrow(/No account/);

    const unverifiedBrowser = new Browser(w);
    await unverifiedBrowser.post("/api/auth/sign-up/email", { name: "U", email: "u@example.test", password: PASSWORD });
    const uid = w.services.db.get<{ id: string }>('SELECT id FROM "user" WHERE email = ?', "u@example.test")!.id;
    expect(() => bootstrapOwner(w.services, { userId: uid, confirmEmail: "u@example.test", operator: op })).toThrow(/verified/);

    const id = await register(w, "v@example.test");
    expect(() => bootstrapOwner(w.services, { userId: id, confirmEmail: "someone-else@example.test", operator: op })).toThrow(/does not match/);
    w.services.db.run("INSERT INTO account_state (user_id, status, reason, changed_by, changed_at) VALUES (?, 'suspended', 'x', 'x', 'x')", id);
    expect(() => bootstrapOwner(w.services, { userId: id, confirmEmail: "v@example.test", operator: op })).toThrow(/suspended/);
    expect(w.services.db.get("SELECT 1 AS x FROM role_assignment")).toBeUndefined();
    expect(w.services.db.get("SELECT 1 AS x FROM founder_designation")).toBeUndefined();
  });

  it("grants platform owner and BUSW administrator as separate assignments, plus the founder designation, and audits them", async () => {
    const w = await world();
    const id = await register(w, "f@example.test");
    const result = makeOwner(w, id, "F@Example.test");
    expect(result.buswRoleId).not.toBeNull();
    const roles = w.services.db.all<{ scope: string; role: string; granted_by: string }>("SELECT scope, role, granted_by FROM role_assignment WHERE user_id = ? ORDER BY scope", id);
    expect(roles).toEqual([
      { scope: "busw", role: "admin", granted_by: "operator:test" },
      { scope: "platform", role: "owner", granted_by: "operator:test" },
    ]);
    expect(w.services.db.get("SELECT 1 AS x FROM founder_designation WHERE user_id = ?", id)).toBeDefined();
    expect(auditActions(w)).toEqual(["role.granted", "role.granted", "founder.designated"]);
    const events = w.services.db.all<{ actor_type: string; actor_id: string; reason: string }>("SELECT actor_type, actor_id, reason FROM audit_event");
    expect(events.every((e) => e.actor_type === "operator" && e.actor_id === "operator:test" && e.reason)).toBe(true);
  });

  it("refuses a second bootstrap once an owner exists", async () => {
    const w = await world();
    const a = await register(w, "a@example.test");
    const b = await register(w, "b@example.test");
    makeOwner(w, a, "a@example.test");
    expect(() => makeOwner(w, b, "b@example.test")).toThrow(/already exists/);
  });

  it("has no HTTP route that can provision an owner or a founder", async () => {
    const w = await world();
    const { id, browser } = await newUser(w, "try@example.test");
    for (const [method, url, body] of [
      ["POST", "/api/account-admin/users/" + id + "/roles", { scope: "platform", role: "owner", reason: "please" }],
      ["POST", "/api/bootstrap", {}],
      ["POST", "/api/auth/bootstrap-owner", {}],
      ["PATCH", "/api/me", { founder: true }],
    ] as const) {
      expect((await browser.request(method, url, body)).status, url).toBeGreaterThanOrEqual(400);
    }
    expect(w.services.db.get("SELECT 1 AS x FROM role_assignment")).toBeUndefined();
  });
});

describe("the founder badge", () => {
  it("shows 'Founder · Admin' while the owner role is active, and carries nothing private", async () => {
    const w = await world();
    const f = await founder(w);
    const me = await f.browser.me();
    expect(me?.badge).toEqual({ label: "Founder · Admin" });
    expect(Object.keys(me!.badge)).toEqual(["label"]);
    const summary = await (await f.browser.get("/api/public/session")).json();
    expect(summary).toEqual({ signedIn: true, name: "The Founder", badge: { label: "Founder · Admin" } });
    expect(JSON.stringify(summary)).not.toContain("founder@example.test");
  });

  it("disappears when the role is revoked or the account is suspended, even though the designation remains", async () => {
    const w = await world();
    const f = await founder(w);
    const second = await staff(w, "second@example.test", [["platform", "owner"]], "Second Owner");

    expect(getVerifiedBadge(w.services.db, f.id)).not.toBeNull();
    const roleId = w.services.db.get<{ id: string }>("SELECT id FROM role_assignment WHERE user_id = ? AND scope = 'platform'", f.id)!.id;
    expect((await second.browser.del(`/api/account-admin/users/${f.id}/roles/${roleId}`, { reason: "Stepping down for a test" })).status).toBe(200);
    expect(getVerifiedBadge(w.services.db, f.id)).toBeNull();
    expect(w.services.db.get("SELECT 1 AS x FROM founder_designation WHERE user_id = ?", f.id)).toBeDefined();
    expect((await f.browser.me())?.badge).toBeNull();

    // Restoring the role restores the badge; suspension hides it.
    expect((await second.browser.post(`/api/account-admin/users/${f.id}/roles`, { scope: "platform", role: "owner", reason: "Back again" })).status).toBe(201);
    expect(getVerifiedBadge(w.services.db, f.id)).not.toBeNull();
    expect((await second.browser.post(`/api/account-admin/users/${f.id}/suspend`, { reason: "Test suspension" })).status).toBe(200);
    expect(getVerifiedBadge(w.services.db, f.id)).toBeNull();
  });

  it("cannot be claimed by an owner who was not designated, or by a display name", async () => {
    const w = await world();
    await founder(w);
    const other = await staff(w, "other@example.test", [["platform", "owner"]], "Founder · Admin");
    expect((await other.browser.me())?.badge).toBeNull();
    const plain = await newUser(w, "plain@example.test", "Founder · Admin");
    expect((await plain.browser.me())?.badge).toBeNull();
    expect(await (await plain.browser.get("/api/public/session")).json()).toMatchObject({ badge: null });
  });

  it("shows in the staff views", async () => {
    const w = await world();
    const f = await founder(w);
    const list = await (await f.browser.get(`/api/account-admin/users?q=${f.id}`)).json();
    expect(list.items[0].badge).toEqual({ label: "Founder · Admin" });
  });
});

describe("administrative roles", () => {
  it("can be granted and revoked only by an owner, with two-step verification and a recent sign-in", async () => {
    const w = await world();
    const owner = await founder(w);
    const admin = await staff(w, "admin@example.test", [["bu-account", "admin"]]);
    const target = await newUser(w, "target@example.test");

    // A BU Account administrator cannot grant roles, in any scope, to anyone, including themselves.
    for (const id of [target.id, admin.id]) {
      for (const role of [["busw", "admin"], ["bu-account", "admin"], ["platform", "owner"]] as const) {
        const res = await admin.browser.post(`/api/account-admin/users/${id}/roles`, { scope: role[0], role: role[1], reason: "Escalating myself" });
        expect(res.status).toBe(403);
      }
    }
    // Nor can a signed-in ordinary user.
    expect((await target.browser.post(`/api/account-admin/users/${target.id}/roles`, { scope: "busw", role: "staff", reason: "Self service" })).status).toBe(403);

    // Application access is not a back door to roles.
    const viaAccess = await admin.browser.post(`/api/account-admin/users/${target.id}/app-access`, { appId: "busw", status: "active", reason: "Restoring access", role: "admin" });
    expect(viaAccess.status).toBe(422);

    const grant = await owner.browser.post(`/api/account-admin/users/${target.id}/roles`, { scope: "busw", role: "staff", reason: "Joins the review team" });
    expect(grant.status).toBe(201);
    const { assignmentId } = await grant.json();
    expect((await owner.browser.post(`/api/account-admin/users/${target.id}/roles`, { scope: "busw", role: "staff", reason: "Again" })).status).toBe(409);
    expect((await owner.browser.post(`/api/account-admin/users/${target.id}/roles`, { scope: "platform", role: "support", reason: "Wrong pair" })).status).toBe(422);
    expect((await owner.browser.post(`/api/account-admin/users/${target.id}/roles`, { scope: "busw", role: "admin" })).status).toBe(422);

    expect((await target.browser.me())?.roles).toEqual([{ scope: "busw", role: "staff" }]);
    expect((await owner.browser.del(`/api/account-admin/users/${target.id}/roles/${assignmentId}`, { reason: "Left the team" })).status).toBe(200);
    expect((await target.browser.me())?.roles).toEqual([]);
  });

  it("asks an owner to sign in again before changing privileges", async () => {
    const w = await world({ REAUTH_WINDOW_SECONDS: "60" });
    const owner = await founder(w);
    const target = await newUser(w, "t@example.test");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 30 * 60 * 1000);
    const res = await owner.browser.post(`/api/account-admin/users/${target.id}/roles`, { scope: "busw", role: "staff", reason: "Needs a fresh sign-in" });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("reauth_required");
  });

  it("only goes to verified accounts in good standing", async () => {
    const w = await world();
    const owner = await founder(w);
    const un = new Browser(w);
    await un.post("/api/auth/sign-up/email", { name: "U", email: "unv@example.test", password: PASSWORD });
    const unId = w.services.db.get<{ id: string }>('SELECT id FROM "user" WHERE email = ?', "unv@example.test")!.id;
    expect((await owner.browser.post(`/api/account-admin/users/${unId}/roles`, { scope: "busw", role: "staff", reason: "Not verified yet" })).status).toBe(422);
  });

  it("protects the last active platform owner", async () => {
    const w = await world();
    const owner = await founder(w);
    const roleId = w.services.db.get<{ id: string }>("SELECT id FROM role_assignment WHERE user_id = ? AND scope = 'platform'", owner.id)!.id;
    const demote = await owner.browser.del(`/api/account-admin/users/${owner.id}/roles/${roleId}`, { reason: "Stepping down" });
    expect(demote.status).toBe(409);
    expect((await demote.json()).error).toBe("last_owner");
    expect((await owner.browser.post(`/api/account-admin/users/${owner.id}/suspend`, { reason: "Suspending myself" })).status).toBe(409);

    // With a second owner, the first can step down; then the second is the last and is protected in turn.
    const second = await staff(w, "second@example.test", [["platform", "owner"]]);
    expect((await owner.browser.del(`/api/account-admin/users/${owner.id}/roles/${roleId}`, { reason: "Handing over" })).status).toBe(200);
    const secondRole = w.services.db.get<{ id: string }>("SELECT id FROM role_assignment WHERE user_id = ? AND scope = 'platform' AND revoked_at IS NULL", second.id)!.id;
    const lastOne = await second.browser.del(`/api/account-admin/users/${second.id}/roles/${secondRole}`, { reason: "Also leaving" });
    expect((await lastOne.json()).error).toBe("last_owner");
  });

  it("counts a suspended owner as not active, so the remaining one cannot be suspended or removed", async () => {
    const w = await world();
    const a = await founder(w);
    const b = await staff(w, "b@example.test", [["platform", "owner"]]);
    expect((await a.browser.post(`/api/account-admin/users/${b.id}/suspend`, { reason: "Lost laptop" })).status).toBe(200);
    const roleId = w.services.db.get<{ id: string }>("SELECT id FROM role_assignment WHERE user_id = ? AND scope = 'platform'", a.id)!.id;
    expect((await a.browser.del(`/api/account-admin/users/${a.id}/roles/${roleId}`, { reason: "Leaving" })).status).toBe(409);
  });
});

describe("what each staff role can see and do", () => {
  it("shows support the minimum, and administrators the full record", async () => {
    const w = await world();
    const support = await staff(w, "support@example.test", [["bu-account", "support"]]);
    const admin = await staff(w, "admin@example.test", [["bu-account", "admin"]]);
    const user = await newUser(w, "someone@example.test", "Some One");
    give(w, user.id, "busw", "staff");

    const asSupport = (await (await support.browser.get(`/api/account-admin/users/${user.id}`)).json()).user;
    expect(asSupport.email).toBe("s***@example.test");
    expect(asSupport).not.toHaveProperty("roles");
    expect(asSupport).not.toHaveProperty("sessions");
    expect(asSupport).not.toHaveProperty("mfaEnabled");

    const asAdmin = (await (await admin.browser.get(`/api/account-admin/users/${user.id}`)).json()).user;
    expect(asAdmin.email).toBe("someone@example.test");
    expect(asAdmin.roles).toHaveLength(1);
    expect(asAdmin.sessions.length).toBeGreaterThan(0);
    expect(JSON.stringify(asAdmin)).not.toMatch(/token|password|secret/i);
    expect(asAdmin.sessions[0]).not.toHaveProperty("id");

    // Support cannot browse addresses: a partial email search finds nothing, an exact one finds the account.
    expect((await (await support.browser.get("/api/account-admin/users?q=someone@example")).json()).total).toBe(0);
    expect((await (await support.browser.get("/api/account-admin/users?q=someone@example.test")).json()).total).toBe(1);
    expect((await (await admin.browser.get("/api/account-admin/users?q=someone@example")).json()).total).toBe(1);
  });

  it("lets support help with verification and recovery but nothing more", async () => {
    const w = await world();
    const support = await staff(w, "support@example.test", [["bu-account", "support"]]);
    const user = await newUser(w, "locked@example.test");
    const unv = new Browser(w);
    await unv.post("/api/auth/sign-up/email", { name: "N", email: "newbie@example.test", password: PASSWORD });
    const newbieId = w.services.db.get<{ id: string }>('SELECT id FROM "user" WHERE email = ?', "newbie@example.test")!.id;

    const before = w.mailer.outbox.length;
    const resend = await support.browser.post(`/api/account-admin/users/${newbieId}/resend-verification`);
    expect(resend.status).toBe(200);
    expect(w.mailer.outbox.length).toBe(before + 1);
    expect(lastMail(w, "newbie@example.test")!.subject).toMatch(/verify/i);
    expect(JSON.stringify(await resend.json())).not.toMatch(/https?:\/\//); // the link goes to the account's own address only
    expect((await support.browser.post(`/api/account-admin/users/${user.id}/resend-verification`)).status).toBe(409);

    expect((await support.browser.post(`/api/account-admin/users/${user.id}/recovery`)).status).toBe(200);
    expect(lastMail(w, "locked@example.test")!.subject).toMatch(/reset/i);

    for (const [url, body] of [["suspend", { reason: "Trying to" }], ["revoke-sessions", { reason: "Trying to" }], ["app-access", { appId: "busw", status: "restricted", reason: "Trying to" }], ["roles", { scope: "busw", role: "staff", reason: "Trying to" }]] as const) {
      expect((await support.browser.post(`/api/account-admin/users/${user.id}/${url}`, body)).status, url).toBe(403);
    }
    expect((await support.browser.get("/api/account-admin/audit")).status).toBe(403);
  });

  it("reports honestly when a recovery email cannot be sent", async () => {
    const w = await world();
    const support = await staff(w, "support@example.test", [["bu-account", "support"]]);
    const user = await newUser(w, "locked@example.test");
    w.mailer.down = true;
    const res = await support.browser.post(`/api/account-admin/users/${user.id}/recovery`);
    expect(res.status).toBe(503);
    expect(w.services.db.get("SELECT 1 AS x FROM audit_event WHERE action = 'account.recovery_initiated'")).toBeUndefined();
  });

  it("searches, filters and pages accounts", async () => {
    const w = await world();
    const admin = await staff(w, "admin@example.test", [["bu-account", "admin"]], "Admin Person");
    for (let i = 0; i < 12; i += 1) await register(w, `bulk${i}@example.test`, `Bulk Person ${i}`);
    const first = await (await admin.browser.get("/api/account-admin/users?pageSize=5&page=1")).json();
    const second = await (await admin.browser.get("/api/account-admin/users?pageSize=5&page=2")).json();
    expect(first.total).toBe(13);
    expect(first.items).toHaveLength(5);
    expect(new Set([...first.items, ...second.items].map((u: { id: string }) => u.id)).size).toBe(10);
    expect((await (await admin.browser.get("/api/account-admin/users?q=Bulk Person 7")).json()).items[0].name).toBe("Bulk Person 7");
    expect((await (await admin.browser.get("/api/account-admin/users?role=bu-account:admin")).json()).total).toBe(1);
    expect((await (await admin.browser.get("/api/account-admin/users?status=suspended")).json()).total).toBe(0);
    expect((await (await admin.browser.get("/api/account-admin/users?verified=false")).json()).total).toBe(0);
  });
});

describe("the audit trail", () => {
  it("records who did what to whom, why, and the before and after, for every sensitive action", async () => {
    const w = await world();
    const owner = await founder(w);
    const user = await newUser(w, "subject@example.test");
    const base = `/api/account-admin/users/${user.id}`;
    await owner.browser.post(`${base}/roles`, { scope: "busw", role: "staff", reason: "Joins review" });
    await owner.browser.post(`${base}/app-access`, { appId: "busw", status: "restricted", reason: "Policy breach" });
    await owner.browser.post(`${base}/suspend`, { reason: "Investigation" });
    await owner.browser.post(`${base}/reactivate`, { reason: "Cleared" });
    await owner.browser.post(`${base}/revoke-sessions`, { reason: "Precaution" });

    const log = (await (await owner.browser.get(`/api/account-admin/audit?target=${user.id}&limit=100`)).json()).items as {
      actor: { type: string; id: string };
      action: string;
      target: { id: string };
      reason: string;
      at: string;
      before: unknown;
      after: unknown;
    }[];
    const actions = log.map((e) => e.action).sort();
    expect(actions).toEqual(["account.app_access_changed", "account.reactivated", "account.sessions_revoked", "account.suspended", "role.granted"]);
    for (const e of log) {
      expect(e.actor).toEqual({ type: "user", id: owner.id });
      expect(e.target.id).toBe(user.id);
      expect(e.reason).toBeTruthy();
      expect(Number.isNaN(Date.parse(e.at))).toBe(false);
    }
    const suspended = log.find((e) => e.action === "account.suspended")!;
    expect(suspended.before).toMatchObject({ status: "active" });
    expect(suspended.after).toMatchObject({ status: "suspended" });
    const access = log.find((e) => e.action === "account.app_access_changed")!;
    expect(access.before).toEqual({ appId: "busw", status: "active" });
    expect(access.after).toEqual({ appId: "busw", status: "restricted" });
  });

  it("never contains passwords, tokens, links or session secrets", async () => {
    const w = await world();
    const owner = await founder(w);
    const user = await newUser(w, "secret@example.test");
    await owner.browser.post(`/api/account-admin/users/${user.id}/revoke-sessions`, { reason: "Precaution" });
    await owner.browser.post(`/api/account-admin/users/${user.id}/recovery`);
    const dump = JSON.stringify(w.services.db.all("SELECT * FROM audit_event"));
    expect(dump).not.toContain(PASSWORD);
    expect(dump).not.toMatch(/token|bu\.session|otpauth|secret=|https?:\/\//i);
  });

  it("is append-only, even for direct database writes, and read-only over HTTP", async () => {
    const w = await world();
    const owner = await founder(w);
    const db = w.services.db;
    expect(() => db.run("UPDATE audit_event SET reason = 'edited'")).toThrow(/append-only/);
    expect(() => db.run("DELETE FROM audit_event")).toThrow(/append-only/);
    for (const method of ["PATCH", "PUT", "DELETE", "POST"]) {
      const res = await owner.browser.request(method, "/api/account-admin/audit", {});
      expect(res.status, method).toBe(404);
    }
    expect((await owner.browser.get("/api/account-admin/audit")).status).toBe(200);
  });

  it("is readable by administrators and owners, not by support or BUSW staff", async () => {
    const w = await world();
    const buswAdmin = await staff(w, "badmin@example.test", [["busw", "admin"]]);
    const admin = await staff(w, "admin@example.test", [["bu-account", "admin"]]);
    expect((await buswAdmin.browser.get("/api/account-admin/audit")).status).toBe(403);
    expect((await admin.browser.get("/api/account-admin/audit")).status).toBe(200);
  });
});

describe("session revocation by staff", () => {
  it("ends every session of the account and is audited", async () => {
    const w = await world();
    const admin = await staff(w, "admin@example.test", [["bu-account", "admin"]]);
    const user = await newUser(w, "target@example.test");
    const second = await signIn(w, "target@example.test");
    const res = await admin.browser.post(`/api/account-admin/users/${user.id}/revoke-sessions`, { reason: "Reported stolen laptop" });
    expect((await res.json()).revoked).toBe(2);
    expect([await user.browser.me(), await second.me()].filter(Boolean)).toHaveLength(0);
    expect(auditActions(w)).toContain("account.sessions_revoked");
  });
});
