import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getMigrations } from "better-auth/db/migration";
import { twoFactor } from "better-auth/plugins";
import { z } from "zod";
import { allowedOrigins, type Config } from "./config";
import type { Db } from "./db";
import { isSuspended } from "./authz";
import { mailCopy, toLang, type Mailer } from "./mail";

/** Set only while our own endpoint performs an email change, so the raw Better Auth route cannot be used to skip our checks. */
/** The header our server stamps with the real client address, so Better Auth can rate-limit by it. Anything a client sends under this name is overwritten. */
export const CLIENT_IP_HEADER = "x-bu-client-ip";

/**
 * A redirect target is safe only if it stays on this app (a path such as /dashboard) or names one of our own origins.
 * Anything else, including protocol-relative //host and backslash tricks, is refused.
 */
export function isSafeRedirect(value: string, allowed: readonly string[]): boolean {
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\") && !/[\u0000-\u001f]/.test(value);
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && allowed.includes(url.origin);
  } catch {
    return false;
  }
}

export const emailChangeGate = new AsyncLocalStorage<{ allowed: true }>();

/** Paths that cause an email to be sent. If mail cannot be sent we say so up front rather than pretend. */
const SENDS_EMAIL = new Set(["/sign-up/email", "/request-password-reset", "/send-verification-email", "/change-email"]);

/** Better Auth endpoints replaced by our own, validated ones. */
const REPLACED = new Set(["/update-user", "/delete-user", "/change-email"]);

export function createAuth(config: Config, db: Db, mailer: Mailer) {
  return betterAuth({
    appName: "Balkan Universal Account",
    baseURL: config.appOrigin,
    basePath: "/api/auth",
    secret: config.secret,
    database: db.raw,
    trustedOrigins: allowedOrigins(config),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        const mail = mailCopy(toLang((user as { preferredLanguage?: string }).preferredLanguage)).reset(url);
        await mailer.send({ to: user.email, ...mail });
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        const lang = toLang((user as { preferredLanguage?: string }).preferredLanguage);
        // An address change is verified at the new address; everything else is the first verification of the account.
        const mail = user.emailVerified ? mailCopy(lang).verifyNew(url) : mailCopy(lang).verify(url);
        await mailer.send({ to: user.email, ...mail });
      },
    },

    user: {
      additionalFields: {
        // The only profile field that lives on the shared identity. It may be chosen at sign-up (so the first email is in the
        // person's language) and is changed later through our validated /api/me route; Better Auth's own update route is closed.
        preferredLanguage: { type: "string", required: false, defaultValue: "en", input: true, validator: { input: z.enum(["en", "tr"]) } },
      },
      changeEmail: {
        enabled: true,
        // The current address approves first; the change completes only when the new address is verified.
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          const mail = mailCopy(toLang((user as { preferredLanguage?: string }).preferredLanguage)).approveChange(url, newEmail);
          await mailer.send({ to: user.email, ...mail });
        },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      // Sensitive actions need a session that began recently. Better Auth enforces this on them.
      freshAge: config.reauthWindowSeconds,
      // No cookie cache: every request is checked against the database, so a suspension or revocation takes effect at once.
      cookieCache: { enabled: false },
    },

    advanced: {
      cookiePrefix: "bu",
      useSecureCookies: config.isProduction,
      // Host-only cookies. Nothing is shared with other subdomains or applications.
      crossSubDomainCookies: { enabled: false },
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      // Rate limits are per client address, so an address must always be known (see CLIENT_IP_HEADER in app.ts).
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },

    rateLimit: {
      enabled: config.env !== "test" || process.env.BU_TEST_RATE_LIMIT === "on",
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 3600, max: 10 },
        "/request-password-reset": { window: 3600, max: 5 },
        "/send-verification-email": { window: 3600, max: 5 },
        "/two-factor/verify-totp": { window: 60, max: 5 },
        "/two-factor/verify-backup-code": { window: 60, max: 5 },
      },
    },

    plugins: [
      twoFactor({
        issuer: "Balkan Universal Account",
        // "Trust this device" would let a stolen cookie skip the second step for weeks. It is effectively off.
        trustDeviceMaxAge: 1,
      }),
    ],

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (REPLACED.has(ctx.path) && !(ctx.path === "/change-email" && emailChangeGate.getStore()?.allowed)) {
          throw new APIError("NOT_FOUND", { message: "Not found" });
        }
        // Every redirect an auth endpoint may perform is checked against our own origins. (Better Auth validates some of
        // these itself, but its verification link followed a forged callbackURL, so we check them all.)
        const body = (ctx.body ?? {}) as Record<string, unknown>;
        const query = (ctx.query ?? {}) as Record<string, unknown>;
        for (const value of [body.callbackURL, body.redirectTo, body.newUserCallbackURL, body.errorCallbackURL, query.callbackURL, query.redirectTo, query.error_callback]) {
          if (typeof value === "string" && value !== "" && !isSafeRedirect(value, allowedOrigins(config))) throw new APIError("FORBIDDEN", { message: "Invalid redirect address.", code: "INVALID_REDIRECT" });
        }
        if (ctx.path === "/verify-email") {
          // A link works once: remember it the first time it is presented, whatever happens next.
          const token = typeof ctx.query?.token === "string" ? ctx.query.token : "";
          if (token) {
            const hash = createHash("sha256").update(token).digest("hex");
            const fresh = db.run("INSERT OR IGNORE INTO used_link (hash, used_at) VALUES (?, ?)", hash, new Date().toISOString()).changes === 1;
            if (!fresh) {
              const back = typeof ctx.query?.callbackURL === "string" ? ctx.query.callbackURL : "/";
              throw ctx.redirect(`${back}${back.includes("?") ? "&" : "?"}error=token_used`);
            }
          }
        }
        if (SENDS_EMAIL.has(ctx.path) && !(await mailer.healthy())) {
          throw new APIError("SERVICE_UNAVAILABLE", { message: "Email cannot be sent right now.", code: "EMAIL_UNAVAILABLE" });
        }
      }),

      after: createAuthMiddleware(async (ctx) => {
        // Remember which sessions proved the second step, so staff access can require it.
        if (ctx.path === "/two-factor/verify-totp" || ctx.path === "/two-factor/verify-backup-code") {
          const id = ctx.context.newSession?.session.id ?? ctx.context.session?.session.id;
          if (id) db.run("INSERT OR IGNORE INTO session_mfa (session_id, verified_at) VALUES (?, ?)", id, new Date().toISOString());
        }
      }),
    },

    databaseHooks: {
      session: {
        create: {
          // A suspended account cannot start a session, even with the right password.
          before: async (session) => {
            if (isSuspended(db, session.userId)) throw new APIError("FORBIDDEN", { message: "This account is suspended.", code: "ACCOUNT_SUSPENDED" });
            return { data: session };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Creates or updates Better Auth's own tables. Run before our migrations, which reference the user table. */
export async function migrateIdentity(auth: Auth): Promise<void> {
  // Quiet while migrating: on a brand-new database Better Auth would otherwise log "missing tables" as an error before we create them.
  const { runMigrations } = await getMigrations({ ...auth.options, logger: { disabled: true } });
  await runMigrations();
}
