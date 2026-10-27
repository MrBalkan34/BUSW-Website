import { Hono } from "hono";
import { z } from "zod";
import { listAudit, recordAudit } from "../audit";
import { ALL_ROLE_KEYS, APPS, appAccessStatus, countActiveOwners, getVerifiedBadge, grantRole, holdsRole, isAppId, isSuspended, isValidRole, ownerExists, revokeRole, roleKey, type Scope } from "../authz";
import { nowIso } from "../db";
import { actorOf, fail, reasonSchema, readJson, requirePermission, requireUser, type AppEnv, type Ctx, type Principal } from "../http";
import type { Services } from "../services";

interface UserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: number;
  createdAt: string;
  twoFactorEnabled: number | null;
}

const reasonOnly = z.object({ reason: reasonSchema }).strict();
const appAccessSchema = z.object({ appId: z.string(), status: z.enum(["active", "restricted"]), reason: reasonSchema }).strict();
const grantSchema = z.object({ scope: z.string(), role: z.string(), reason: reasonSchema }).strict();

/** a***@example.com: enough for support to confirm they have the right account, not enough to harvest addresses. */
export const maskEmail = (email: string): string => {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
};

export function accountAdminRoutes(services: Services): Hono<AppEnv> {
  const { db, auth, config } = services;
  const app = new Hono<AppEnv>();
  app.use("*", requireUser(services));

  const userRow = (id: string): UserRow => db.get<UserRow>('SELECT id, name, email, emailVerified, createdAt, twoFactorEnabled FROM "user" WHERE id = ?', id) ?? fail(404, "not_found", "No such account.");
  const isOwner = (id: string) => holdsRole(db, id, "platform:owner");
  const accountStatus = (id: string) => db.get<{ status: string; reason: string | null; changed_at: string }>("SELECT status, reason, changed_at FROM account_state WHERE user_id = ?", id);

  /** Support sees the minimum needed to help; administrators see the full account record. Neither sees passwords, tokens or client content. */
  const present = (p: Principal, u: UserRow) => {
    const full = p.permissions.has("accounts.read.full");
    const status = accountStatus(u.id);
    return {
      id: u.id,
      name: u.name,
      email: full ? u.email : maskEmail(u.email),
      emailVerified: Boolean(u.emailVerified),
      status: status?.status ?? "active",
      createdAt: u.createdAt,
      badge: getVerifiedBadge(db, u.id),
      apps: db.all<{ app_id: string }>("SELECT app_id FROM app_connection WHERE user_id = ?", u.id).map((a) => a.app_id),
      ...(full ? { roles: db.all<{ scope: string; role: string }>("SELECT scope, role FROM role_assignment WHERE user_id = ? AND revoked_at IS NULL", u.id) } : {}),
    };
  };

  /** Only an owner may act on an owner. A BU Account administrator cannot suspend, restrict or sign out the person who can revoke them. */
  const guardOwnerTarget = (p: Principal, targetId: string) => {
    if (isOwner(targetId) && !p.roles.includes("platform:owner")) fail(403, "owner_protected", "Only a platform owner can do this to a platform owner.");
  };

  // ---- overview and setup checklist (what is still to be configured; never secrets)
  app.get("/overview", requirePermission(services, "accounts.read.limited"), async (c) => {
    return c.json({
      ownerProvisioned: ownerExists(db),
      accounts: db.get<{ n: number }>('SELECT COUNT(*) AS n FROM "user"')?.n ?? 0,
      checklist: {
        emailTransport: config.email.kind === "smtp" ? "configured" : "development-only",
        emailReachable: await services.mailer.healthy(),
        privacyUrl: config.privacyUrl !== null,
        termsUrl: config.termsUrl !== null,
        mfaRequiredForStaff: config.requireMfaForStaff,
      },
    });
  });

  // ---- users
  app.get("/users", requirePermission(services, "accounts.read.limited"), (c) => {
    const p = c.get("principal");
    const q = c.req.query();
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (q.q) {
      const like = `%${q.q.trim().replace(/[\\%_]/g, "\\$&")}%`;
      if (p.permissions.has("accounts.read.full")) {
        where.push("(u.id = ? OR u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\')");
        params.push(q.q.trim(), like, like);
      } else {
        // Support can find an account by its id or by an exact, full email address; they cannot browse addresses.
        where.push("(u.id = ? OR lower(u.email) = lower(?) OR u.name LIKE ? ESCAPE '\\')");
        params.push(q.q.trim(), q.q.trim(), like);
      }
    }
    if (q.status === "suspended") where.push("EXISTS (SELECT 1 FROM account_state s WHERE s.user_id = u.id AND s.status = 'suspended')");
    if (q.status === "active") where.push("NOT EXISTS (SELECT 1 FROM account_state s WHERE s.user_id = u.id AND s.status = 'suspended')");
    if (q.verified === "true") where.push("u.emailVerified = 1");
    if (q.verified === "false") where.push("u.emailVerified = 0");
    if (q.role && p.permissions.has("accounts.read.full") && (ALL_ROLE_KEYS as readonly string[]).includes(q.role)) {
      const [scope, role] = q.role.split(":") as [string, string];
      where.push("EXISTS (SELECT 1 FROM role_assignment r WHERE r.user_id = u.id AND r.scope = ? AND r.role = ? AND r.revoked_at IS NULL)");
      params.push(scope, role);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const page = Math.max(1, Number(q.page) || 1);
    const size = Math.min(50, Math.max(1, Number(q.pageSize) || 20));
    const total = db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM "user" u ${clause}`, ...params)?.n ?? 0;
    const rows = db.all<UserRow>(`SELECT u.id, u.name, u.email, u.emailVerified, u.createdAt, u.twoFactorEnabled FROM "user" u ${clause} ORDER BY u.createdAt DESC, u.id LIMIT ? OFFSET ?`, ...params, size, (page - 1) * size);
    return c.json({ total, page, pageSize: size, items: rows.map((u) => present(p, u)) });
  });

  app.get("/users/:id", requirePermission(services, "accounts.read.limited"), (c) => {
    const p = c.get("principal");
    const u = userRow(c.req.param("id"));
    const base = present(p, u);
    const status = accountStatus(u.id);
    if (!p.permissions.has("accounts.read.full")) return c.json({ user: { ...base, statusReason: null } });
    return c.json({
      user: {
        ...base,
        statusReason: status?.reason ?? null,
        statusChangedAt: status?.changed_at ?? null,
        mfaEnabled: Boolean(u.twoFactorEnabled),
        roles: db.all<{ id: string; scope: string; role: string; granted_at: string }>("SELECT id, scope, role, granted_at FROM role_assignment WHERE user_id = ? AND revoked_at IS NULL ORDER BY granted_at", u.id).map((r) => ({ id: r.id, scope: r.scope, role: r.role, grantedAt: r.granted_at })),
        appAccess: APPS.map((appId) => ({ appId, status: appAccessStatus(db, u.id, appId) })),
        // Device descriptions only: never a session id or token.
        sessions: db.all<{ id: string; createdAt: string; userAgent: string | null }>("SELECT id, createdAt, userAgent FROM session WHERE userId = ? ORDER BY createdAt DESC", u.id).map((s) => ({ createdAt: s.createdAt, device: (s.userAgent ?? "").slice(0, 160) })),
      },
    });
  });

  // ---- recovery assistance: these start the normal secure flows; nobody sets or sees a password or a link
  async function assist(c: Ctx, action: "verification" | "recovery") {
    const p = c.get("principal");
    const u = userRow(c.req.param("id") as string);
    if (action === "verification" && u.emailVerified) return fail(409, "already_verified", "This email address is already verified.");
    try {
      if (action === "verification") await auth.api.sendVerificationEmail({ body: { email: u.email, callbackURL: `${config.appOrigin}/account/verify-email` } });
      else await auth.api.requestPasswordReset({ body: { email: u.email, redirectTo: `${config.appOrigin}/account/reset-password` } });
    } catch (error) {
      const code = (error as { body?: { code?: string } })?.body?.code;
      if (code === "EMAIL_UNAVAILABLE") return c.json({ error: "email_unavailable", message: "Email cannot be sent right now. Nothing was sent." }, 503);
      console.error(`assist ${action} failed`, error instanceof Error ? error.message : error);
      return c.json({ error: "email_failed", message: "The email could not be requested. Nothing was sent." }, 502);
    }
    recordAudit(db, { actor: actorOf(p), action: action === "verification" ? "account.verification_resent" : "account.recovery_initiated", target: { type: "account", id: u.id }, requestId: c.get("requestId") });
    return c.json({ ok: true, message: "The standard email was requested for the account's own address." });
  }
  app.post("/users/:id/resend-verification", requirePermission(services, "accounts.recovery.assist"), (c) => assist(c, "verification"));
  app.post("/users/:id/recovery", requirePermission(services, "accounts.recovery.assist"), (c) => assist(c, "recovery"));

  // ---- sessions
  app.post("/users/:id/revoke-sessions", requirePermission(services, "accounts.sessions.revoke"), async (c) => {
    const p = c.get("principal");
    const u = userRow(c.req.param("id"));
    const input = await readJson(c, reasonOnly);
    guardOwnerTarget(p, u.id);
    const count = db.transaction(() => {
      const n = db.run("DELETE FROM session WHERE userId = ?", u.id).changes;
      recordAudit(db, { actor: actorOf(p), action: "account.sessions_revoked", target: { type: "account", id: u.id }, reason: input.reason, before: { sessions: n }, after: { sessions: 0 }, requestId: c.get("requestId") });
      return n;
    });
    return c.json({ ok: true, revoked: count });
  });

  // ---- shared-account suspension. Sessions end at once; reactivation does not bring them back.
  app.post("/users/:id/suspend", requirePermission(services, "accounts.suspend", { sensitive: true }), async (c) => {
    const p = c.get("principal");
    const u = userRow(c.req.param("id"));
    const input = await readJson(c, reasonOnly);
    if (u.id === p.userId) return fail(409, "self_target", "You cannot suspend your own account.");
    guardOwnerTarget(p, u.id);
    if (isSuspended(db, u.id)) return fail(409, "already_suspended", "This account is already suspended.");
    if (isOwner(u.id) && countActiveOwners(db) <= 1) return fail(409, "last_owner", "The last active platform owner cannot be suspended.");
    db.transaction(() => {
      db.run("INSERT INTO account_state (user_id, status, reason, changed_by, changed_at) VALUES (?, 'suspended', ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET status = 'suspended', reason = excluded.reason, changed_by = excluded.changed_by, changed_at = excluded.changed_at", u.id, input.reason, p.userId, nowIso());
      const revoked = db.run("DELETE FROM session WHERE userId = ?", u.id).changes;
      recordAudit(db, { actor: actorOf(p), action: "account.suspended", target: { type: "account", id: u.id }, reason: input.reason, before: { status: "active" }, after: { status: "suspended", sessionsRevoked: revoked }, requestId: c.get("requestId") });
    });
    return c.json({ ok: true });
  });

  app.post("/users/:id/reactivate", requirePermission(services, "accounts.suspend", { sensitive: true }), async (c) => {
    const p = c.get("principal");
    const u = userRow(c.req.param("id"));
    const input = await readJson(c, reasonOnly);
    guardOwnerTarget(p, u.id);
    if (!isSuspended(db, u.id)) return fail(409, "not_suspended", "This account is not suspended.");
    db.transaction(() => {
      db.run("UPDATE account_state SET status = 'active', reason = ?, changed_by = ?, changed_at = ? WHERE user_id = ?", input.reason, p.userId, nowIso(), u.id);
      recordAudit(db, { actor: actorOf(p), action: "account.reactivated", target: { type: "account", id: u.id }, reason: input.reason, before: { status: "suspended" }, after: { status: "active" }, requestId: c.get("requestId") });
    });
    return c.json({ ok: true, note: "Sessions that were ended stay ended. The person signs in again." });
  });

  // ---- application access: one application at a time, without touching the shared identity and never granting roles
  app.post("/users/:id/app-access", requirePermission(services, "accounts.appaccess.manage", { sensitive: true }), async (c) => {
    const p = c.get("principal");
    const u = userRow(c.req.param("id"));
    const input = await readJson(c, appAccessSchema);
    if (!isAppId(input.appId)) return fail(422, "unknown_app", "Unknown application.");
    guardOwnerTarget(p, u.id);
    const before = appAccessStatus(db, u.id, input.appId);
    if (before === input.status) return fail(409, "no_change", "That is already the current access.");
    db.transaction(() => {
      db.run("INSERT INTO app_access (user_id, app_id, status, reason, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, app_id) DO UPDATE SET status = excluded.status, reason = excluded.reason, changed_by = excluded.changed_by, changed_at = excluded.changed_at", u.id, input.appId, input.status, input.reason, p.userId, nowIso());
      recordAudit(db, { actor: actorOf(p), action: "account.app_access_changed", target: { type: "account", id: u.id }, reason: input.reason, before: { appId: input.appId, status: before }, after: { appId: input.appId, status: input.status }, requestId: c.get("requestId") });
    });
    return c.json({ ok: true });
  });

  // ---- administrative roles: platform owners only, with two-step verification and a recent sign-in
  app.post("/users/:id/roles", requirePermission(services, "roles.manage", { sensitive: true }), async (c) => {
    const p = c.get("principal");
    const u = userRow(c.req.param("id"));
    const input = await readJson(c, grantSchema);
    if (!isValidRole(input.scope, input.role)) return fail(422, "invalid_role", "Unknown role.");
    if (!u.emailVerified || isSuspended(db, u.id)) return fail(422, "invalid_target", "Only a verified account in good standing can be given a role.");
    if (holdsRole(db, u.id, roleKey(input.scope as Scope, input.role))) return fail(409, "already_granted", "That role is already assigned.");
    const assignmentId = db.transaction(() => {
      const id = grantRole(db, u.id, input.scope as Scope, input.role, p.userId);
      recordAudit(db, { actor: actorOf(p), action: "role.granted", target: { type: "account", id: u.id }, reason: input.reason, before: null, after: { scope: input.scope, role: input.role, assignmentId: id }, requestId: c.get("requestId") });
      return id;
    });
    return c.json({ ok: true, assignmentId }, 201);
  });

  app.delete("/users/:id/roles/:assignmentId", requirePermission(services, "roles.manage", { sensitive: true }), async (c) => {
    const p = c.get("principal");
    const u = userRow(c.req.param("id"));
    const input = await readJson(c, reasonOnly);
    const assignment = db.get<{ id: string; scope: string; role: string }>("SELECT id, scope, role FROM role_assignment WHERE id = ? AND user_id = ? AND revoked_at IS NULL", c.req.param("assignmentId"), u.id);
    if (!assignment) return fail(404, "not_found", "That role assignment does not exist.");
    if (assignment.scope === "platform" && assignment.role === "owner" && countActiveOwners(db) <= 1) return fail(409, "last_owner", "The last active platform owner cannot be removed.");
    db.transaction(() => {
      revokeRole(db, assignment.id, p.userId);
      recordAudit(db, { actor: actorOf(p), action: "role.revoked", target: { type: "account", id: u.id }, reason: input.reason, before: { scope: assignment.scope, role: assignment.role, assignmentId: assignment.id }, after: null, requestId: c.get("requestId") });
    });
    return c.json({ ok: true });
  });

  // ---- audit trail: read-only, administrators and owners only
  app.get("/audit", requirePermission(services, "audit.read"), (c) => {
    const q = c.req.query();
    const out = listAudit(db, { actor: q.actor, target: q.target, action: q.action, before: q.before, limit: Number(q.limit) || 50 });
    return c.json({
      items: out.items.map((r) => ({ id: r.id, at: r.at, actor: { type: r.actor_type, id: r.actor_id }, action: r.action, target: { type: r.target_type, id: r.target_id }, reason: r.reason, before: r.before_json ? JSON.parse(r.before_json) : null, after: r.after_json ? JSON.parse(r.after_json) : null })),
      next: out.next,
    });
  });

  return app;
}
