import { randomUUID } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { z } from "zod";
import { activeRoles, appAccessStatus, connectApp, isPrivileged, isSuspended, permissionsFor, type AppId, type Permission, type RoleKey } from "./authz";
import { allowedOrigins } from "./config";
import type { Services } from "./services";

export interface Principal {
  userId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  preferredLanguage: "en" | "tr";
  sessionId: string;
  /** Milliseconds since the epoch at which this session began: the moment the person last proved who they are. */
  signedInAt: number;
  mfaEnabled: boolean;
  /** This very session passed the second step. */
  mfaVerified: boolean;
  roles: RoleKey[];
  permissions: Set<Permission>;
  privileged: boolean;
  /** Signed in recently enough for privilege changes and email changes. */
  recentAuth: boolean;
}

export type AppEnv = { Variables: { principal: Principal; requestId: string } };
export type Ctx = Context<AppEnv>;

export class HttpError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 503,
    readonly code: string,
    message?: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message ?? code);
  }
}

export const fail = (status: HttpError["status"], code: string, message?: string, extra?: Record<string, unknown>): never => {
  throw new HttpError(status, code, message, extra);
};

/** Every request gets an id, echoed back so a support request can be traced without exposing anything private. */
export const requestIds = (): MiddlewareHandler<AppEnv> => async (c, next) => {
  const id = randomUUID();
  c.set("requestId", id);
  c.header("X-Request-Id", id);
  await next();
};

/** Headers every response carries. Responses are never cached and never sniffed. */
export const securityHeaders = (): MiddlewareHandler<AppEnv> => async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "same-origin");
  c.header("X-Frame-Options", "DENY");
  if (c.req.path.startsWith("/api/")) c.header("Cache-Control", "no-store");
};

/**
 * Cross-site request forgery defence for cookie-authenticated writes: a state-changing request must come from the
 * app's own origin (or a trusted one), as the browser reports in Origin. Cookies are also SameSite=Lax.
 */
export const csrf = (services: Services): MiddlewareHandler<AppEnv> => {
  const allowed = new Set(allowedOrigins(services.config));
  return async (c, next) => {
    const method = c.req.method;
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
    if (c.req.path.startsWith("/api/auth/")) return next(); // Better Auth checks Origin itself.
    const origin = c.req.header("origin");
    if (!origin || !allowed.has(origin)) return c.json({ error: "bad_origin", message: "Request origin is not allowed." }, 403);
    // Only the app's own origin may write; the marketing site may read the session summary and nothing else.
    if (origin !== services.config.appOrigin) return c.json({ error: "bad_origin", message: "Request origin is not allowed." }, 403);
    const type = c.req.header("content-type") ?? "";
    const hasBody = c.req.header("content-length") !== undefined && c.req.header("content-length") !== "0";
    if (hasBody && !type.startsWith("application/json") && !type.startsWith("multipart/form-data")) return c.json({ error: "unsupported_media_type" }, 415);
    return next();
  };
};

/** A small fixed-window limiter for our own endpoints (Better Auth rate-limits its own). Single instance only. */
export function rateLimit(opts: { windowMs: number; max: number; key: (c: Ctx) => string }): MiddlewareHandler<AppEnv> {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (c, next) => {
    if (process.env.BU_DISABLE_LIMITS === "1") return next();
    const now = Date.now();
    const key = opts.key(c);
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) hits.set(key, { count: 1, resetAt: now + opts.windowMs });
    else if (++entry.count > opts.max) {
      c.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ error: "rate_limited", message: "Too many requests. Try again later." }, 429);
    }
    if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    return next();
  };
}

export const clientKey = (c: Ctx): string => c.get("principal")?.userId ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

/** Loads the signed-in principal from the session cookie, or null. Suspended accounts never get one. */
export async function loadPrincipal(services: Services, headers: Headers): Promise<Principal | null> {
  const { auth, db, config } = services;
  const found = await auth.api.getSession({ headers });
  if (!found) return null;
  const { session, user } = found;
  if (isSuspended(db, user.id)) {
    // Suspension also cuts sessions that were open when it happened (they are deleted at suspension; this is the backstop).
    db.run("DELETE FROM session WHERE userId = ?", user.id);
    return null;
  }
  const roles = activeRoles(db, user.id);
  const u = user as typeof user & { twoFactorEnabled?: boolean | null; preferredLanguage?: string | null };
  const signedInAt = new Date(session.createdAt).getTime();
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    preferredLanguage: u.preferredLanguage === "tr" ? "tr" : "en",
    sessionId: session.id,
    signedInAt,
    mfaEnabled: u.twoFactorEnabled === true,
    mfaVerified: db.get("SELECT 1 AS x FROM session_mfa WHERE session_id = ?", session.id) !== undefined,
    roles,
    permissions: permissionsFor(roles),
    privileged: isPrivileged(roles),
    recentAuth: Date.now() - signedInAt <= config.reauthWindowSeconds * 1000,
  };
}

/** Sets `principal` or answers 401. */
export const requireUser = (services: Services): MiddlewareHandler<AppEnv> => async (c, next) => {
  const principal = await loadPrincipal(services, c.req.raw.headers);
  if (!principal) return c.json({ error: "unauthenticated", message: "Sign in to continue." }, 401);
  c.set("principal", principal);
  return next();
};

/** BUSW features: blocked for accounts restricted from BUSW, without touching the shared identity. */
export const requireApp = (services: Services, appId: AppId): MiddlewareHandler<AppEnv> => async (c, next) => {
  const p = c.get("principal");
  if (appAccessStatus(services.db, p.userId, appId) === "restricted") return c.json({ error: "app_restricted", message: "Access to this application is restricted for your account." }, 403);
  connectApp(services.db, p.userId, appId);
  return next();
};

/** Why a principal may not use a permission right now, or null if they may. Shared by routes and asset downloads. */
export function permissionProblem(services: Services, p: Principal, permission: Permission, opts: { sensitive?: boolean } = {}): { status: 403; body: { error: string; message: string } } | null {
  if (!p.permissions.has(permission)) return { status: 403, body: { error: "forbidden", message: "You do not have access to this." } };
  if (services.config.requireMfaForStaff) {
    if (!p.mfaEnabled) return { status: 403, body: { error: "mfa_enrollment_required", message: "Set up two-step verification to use administration." } };
    if (!p.mfaVerified) return { status: 403, body: { error: "mfa_required", message: "Sign in again and complete two-step verification." } };
  }
  if (opts.sensitive && !p.recentAuth) return { status: 403, body: { error: "reauth_required", message: "Sign in again to confirm this change." } };
  return null;
}

/**
 * Staff gate. A privileged account must have enrolled two-step verification, and this session must have passed it,
 * before any administrative endpoint answers. `sensitive` additionally demands a recent sign-in.
 */
export const requirePermission =
  (services: Services, permission: Permission, opts: { sensitive?: boolean } = {}): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const problem = permissionProblem(services, c.get("principal"), permission, opts);
    if (problem) return c.json(problem.body, problem.status);
    return next();
  };

export async function readJson<T extends z.ZodType>(c: Ctx, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return fail(400, "invalid_json", "The request body must be JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail(422, "invalid_input", parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
  return parsed.data;
}

export const reasonSchema = z.string().trim().min(3, "A reason is required.").max(500);

export const actorOf = (p: Principal) => ({ type: "user", id: p.userId }) as const;
