import { Hono } from "hono";
import { z } from "zod";
import { emailChangeGate } from "../auth";
import { activeRoleRows, appAccessStatus, getVerifiedBadge, ownerExists } from "../authz";
import { nowIso } from "../db";
import { clientKey, fail, loadPrincipal, rateLimit, readJson, requireUser, type AppEnv, type Principal } from "../http";
import type { Services } from "../services";
import { isCountryCode } from "../shared";

const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    preferredLanguage: z.enum(["en", "tr"]).optional(),
    business: z
      .object({
        name: z.string().trim().max(120).optional(),
        country: z
          .string()
          .refine((v) => isCountryCode(v), "Unknown country.")
          .nullable()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict(); // Anything else, such as role, owner or founder, is refused rather than ignored.

interface SessionRow {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
}

export function accountRoutes(services: Services): Hono<AppEnv> {
  const { db, auth, config } = services;
  const app = new Hono<AppEnv>();
  // Only our own paths are guarded here, so this router never leaks its guard onto routes mounted beside it.
  app.use("/me", requireUser(services));
  app.use("/account/*", requireUser(services));

  /** Everything the interface needs to know about the signed-in person. Never includes anything about anyone else. */
  const me = (p: Principal) => {
    const profile = db.get<{ business_name: string; business_country: string | null }>("SELECT business_name, business_country FROM busw_profile WHERE user_id = ?", p.userId);
    const badge = getVerifiedBadge(db, p.userId);
    const roles = activeRoleRows(db, p.userId).map((r) => ({ scope: r.scope, role: r.role }));
    const has = (prefix: string) => p.roles.some((r) => r.startsWith(prefix));
    return {
      id: p.userId,
      name: p.name,
      email: p.email,
      emailVerified: p.emailVerified,
      preferredLanguage: p.preferredLanguage,
      business: { name: profile?.business_name ?? "", country: profile?.business_country ?? null },
      badge,
      roles,
      security: {
        mfaEnabled: p.mfaEnabled,
        mfaVerifiedThisSession: p.mfaVerified,
        recentAuth: p.recentAuth,
        reauthWindowSeconds: config.reauthWindowSeconds,
      },
      access: {
        busw: appAccessStatus(db, p.userId, "busw"),
        buswAdmin: has("busw:"),
        accountAdmin: has("bu-account:") || has("platform:"),
        isOwner: p.roles.includes("platform:owner"),
        staffNeedsMfa: p.privileged && config.requireMfaForStaff && !(p.mfaEnabled && p.mfaVerified),
      },
      apps: db.all<{ app_id: string; connected_at: string }>("SELECT app_id, connected_at FROM app_connection WHERE user_id = ?", p.userId).map((a) => ({ id: a.app_id, connectedAt: a.connected_at })),
      ownerProvisioned: ownerExists(db),
    };
  };

  app.get("/me", (c) => c.json(me(c.get("principal"))));

  app.patch("/me", async (c) => {
    const p = c.get("principal");
    const input = await readJson(c, profileSchema);
    db.transaction(() => {
      if (input.name !== undefined) db.run('UPDATE "user" SET name = ?, updatedAt = ? WHERE id = ?', input.name, nowIso(), p.userId);
      if (input.preferredLanguage !== undefined) db.run('UPDATE "user" SET preferredLanguage = ?, updatedAt = ? WHERE id = ?', input.preferredLanguage, nowIso(), p.userId);
      if (input.business) {
        const current = db.get<{ business_name: string; business_country: string | null }>("SELECT business_name, business_country FROM busw_profile WHERE user_id = ?", p.userId);
        db.run(
          "INSERT INTO busw_profile (user_id, business_name, business_country, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET business_name = excluded.business_name, business_country = excluded.business_country, updated_at = excluded.updated_at",
          p.userId,
          input.business.name ?? current?.business_name ?? "",
          input.business.country === undefined ? (current?.business_country ?? null) : input.business.country,
          nowIso(),
        );
      }
    });
    const fresh = (await loadPrincipal(services, c.req.raw.headers)) ?? p;
    return c.json(me(fresh));
  });

  // ---- email change: password, a recent sign-in, approval from the current address, then verification of the new one
  const changeEmailSchema = z.object({ newEmail: z.string().trim().toLowerCase().email().max(254), currentPassword: z.string().min(1).max(128) }).strict();

  app.post(
    "/account/change-email",
    rateLimit({ windowMs: 3_600_000, max: 5, key: clientKey }),
    async (c) => {
      const p = c.get("principal");
      const input = await readJson(c, changeEmailSchema);
      if (!p.recentAuth) return c.json({ error: "reauth_required", message: "Sign in again to change your email address." }, 403);
      const account = db.get<{ password: string | null }>("SELECT password FROM account WHERE userId = ? AND providerId = 'credential'", p.userId);
      const context = await auth.$context;
      const ok = account?.password ? await context.password.verify({ hash: account.password, password: input.currentPassword }) : false;
      if (!ok) return c.json({ error: "wrong_password", message: "That password is not correct." }, 403);
      if (input.newEmail === p.email.toLowerCase()) return c.json({ error: "same_email", message: "That is already your email address." }, 422);
      try {
        await emailChangeGate.run({ allowed: true }, () => auth.api.changeEmail({ body: { newEmail: input.newEmail, callbackURL: `${config.appOrigin}/account/security?emailChange=approved` }, headers: c.req.raw.headers }));
      } catch (error) {
        const code = (error as { body?: { code?: string } })?.body?.code;
        if (code === "EMAIL_UNAVAILABLE") return c.json({ error: "email_unavailable", message: "Email cannot be sent right now. Nothing was changed." }, 503);
        // Anything else (including "address already in use") gets the same answer so addresses cannot be probed.
        if (!(error instanceof Error) || !/exist|use|taken/i.test(error.message)) {
          console.error("change-email failed", error instanceof Error ? error.message : error);
          return c.json({ error: "email_failed", message: "The approval email could not be sent. Nothing was changed." }, 502);
        }
      }
      return c.json({ ok: true, message: "If the address can be used, an approval link is on its way to your current address. Your current address stays active until the change is finished." }, 202);
    },
  );

  // ---- sessions: ids are row ids, never the secret session token
  const sessionsFor = (p: Principal) =>
    db.all<SessionRow>("SELECT id, createdAt, expiresAt, userAgent FROM session WHERE userId = ? ORDER BY createdAt DESC", p.userId).map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      device: (s.userAgent ?? "").slice(0, 160),
      current: s.id === p.sessionId,
    }));

  app.get("/account/sessions", (c) => c.json({ sessions: sessionsFor(c.get("principal")) }));

  app.delete("/account/sessions/:id", (c) => {
    const p = c.get("principal");
    const result = db.run("DELETE FROM session WHERE id = ? AND userId = ?", c.req.param("id"), p.userId);
    if (result.changes === 0) return fail(404, "not_found", "That session does not exist.");
    return c.json({ ok: true, current: c.req.param("id") === p.sessionId });
  });

  app.post("/account/sessions/revoke-others", (c) => {
    const p = c.get("principal");
    const result = db.run("DELETE FROM session WHERE userId = ? AND id <> ?", p.userId, p.sessionId);
    return c.json({ ok: true, revoked: result.changes });
  });

  app.post("/account/sessions/revoke-all", (c) => {
    const p = c.get("principal");
    const result = db.run("DELETE FROM session WHERE userId = ?", p.userId);
    return c.json({ ok: true, revoked: result.changes });
  });

  return app;
}
