import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type EmailTransportKind = "smtp" | "dev-outbox" | "memory";

export interface Config {
  env: "development" | "test" | "production";
  isProduction: boolean;
  port: number;
  /** The public origin of the app and API, for example https://account.busoftwareworks.com. Cookies are scoped to it alone. */
  appOrigin: string;
  /** Other origins allowed to read the small public session summary and to be named in callback URLs (the marketing site). */
  trustedOrigins: string[];
  secret: string;
  dataDir: string;
  databasePath: string;
  assetsDir: string;
  email: {
    kind: EmailTransportKind;
    from: string;
    smtpUrl: string | null;
    /** Where new submissions are announced (a link, never the content). Optional. */
    staffNotifyTo: string | null;
  };
  privacyUrl: string | null;
  termsUrl: string | null;
  /** Seconds since sign-in during which privilege changes and email changes are allowed without signing in again. */
  reauthWindowSeconds: number;
  /** Staff must have two-step verification enrolled. Never switch this off in production. */
  requireMfaForStaff: boolean;
  /** Trust X-Forwarded-For for client addresses. Only behind a proxy you control. */
  trustProxy: boolean;
}

type Env = Record<string, string | undefined>;

const list = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const clean = (value: string | undefined): string | null => (value && value.trim() !== "" ? value.trim() : null);

function assertOrigin(name: string, value: string, production: boolean): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} is not a valid URL: ${value}`);
  }
  if (url.pathname !== "/" || url.search || url.hash) throw new Error(`${name} must be an origin only (scheme, host, port): ${value}`);
  if (production && url.protocol !== "https:") throw new Error(`${name} must use https in production.`);
}

/** A development secret kept out of source control. Production must supply BETTER_AUTH_SECRET itself. */
function developmentSecret(dataDir: string): string {
  mkdirSync(dataDir, { recursive: true });
  const file = join(dataDir, "dev.secret");
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  const created = randomBytes(48).toString("base64url");
  writeFileSync(file, created, { mode: 0o600 });
  return created;
}

export function loadConfig(env: Env = process.env): Config {
  const mode = env.NODE_ENV === "production" ? "production" : env.NODE_ENV === "test" ? "test" : "development";
  const isProduction = mode === "production";
  const dataDir = resolve(env.DATA_DIR ?? "./data");

  const appOrigin = (env.APP_ORIGIN ?? "http://localhost:5174").replace(/\/+$/, "");
  assertOrigin("APP_ORIGIN", appOrigin, isProduction);
  const trustedOrigins = list(env.TRUSTED_ORIGINS);
  for (const origin of trustedOrigins) assertOrigin("TRUSTED_ORIGINS", origin, isProduction);

  const kindRaw = env.EMAIL_TRANSPORT ?? (isProduction ? "smtp" : "dev-outbox");
  if (kindRaw !== "smtp" && kindRaw !== "dev-outbox" && kindRaw !== "memory") throw new Error(`EMAIL_TRANSPORT must be smtp or dev-outbox, not ${kindRaw}.`);
  const kind = kindRaw;
  const smtpUrl = clean(env.SMTP_URL);

  let secret = clean(env.BETTER_AUTH_SECRET);
  if (!secret) {
    if (isProduction) throw new Error("BETTER_AUTH_SECRET is required in production (at least 32 random characters).");
    secret = mode === "test" ? "test-secret-test-secret-test-secret-0123456789" : developmentSecret(dataDir);
  }
  if (secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be at least 32 characters.");

  if (isProduction) {
    if (kind !== "smtp") throw new Error("EMAIL_TRANSPORT must be smtp in production. The development outbox shows verification links on screen and must never run in production.");
    if (!smtpUrl) throw new Error("SMTP_URL is required in production so verification and recovery emails are really delivered.");
    if (env.REQUIRE_MFA_FOR_STAFF === "false") throw new Error("REQUIRE_MFA_FOR_STAFF cannot be disabled in production.");
  }
  if (kind === "smtp" && !smtpUrl) throw new Error("EMAIL_TRANSPORT=smtp needs SMTP_URL.");

  return {
    env: mode,
    isProduction,
    port: Number(env.PORT ?? 8787),
    appOrigin,
    trustedOrigins,
    secret,
    dataDir,
    databasePath: mode === "test" ? ":memory:" : join(dataDir, "bu-account.sqlite"),
    assetsDir: join(dataDir, "assets"),
    email: {
      kind,
      from: clean(env.EMAIL_FROM) ?? "Balkan Universal Account <no-reply@busoftwareworks.com>",
      smtpUrl,
      staffNotifyTo: clean(env.STAFF_NOTIFY_TO),
    },
    privacyUrl: clean(env.PRIVACY_URL),
    termsUrl: clean(env.TERMS_URL),
    reauthWindowSeconds: Number(env.REAUTH_WINDOW_SECONDS ?? 900),
    requireMfaForStaff: env.REQUIRE_MFA_FOR_STAFF !== "false",
    trustProxy: env.TRUST_PROXY === "true",
  };
}

/** Everything the app may be reached from: the app itself plus the marketing site. */
export const allowedOrigins = (config: Config): string[] => [config.appOrigin, ...config.trustedOrigins];
