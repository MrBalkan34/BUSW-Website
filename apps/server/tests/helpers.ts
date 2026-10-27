import { createHmac } from "node:crypto";
import type { Hono } from "hono";
import { createApp } from "../src/app";
import { bootstrapOwner } from "../src/bootstrap";
import { grantRole, type Scope } from "../src/authz";
import { loadConfig } from "../src/config";
import type { AppEnv } from "../src/http";
import type { TestMailer } from "../src/mail";
import { createServices, type Services } from "../src/services";

export const PASSWORD = "correct horse battery staple";
export const ORIGIN = "http://localhost:5174";
export const MARKETING = "http://localhost:4173";

export interface World {
  services: Services;
  app: Hono<AppEnv>;
  mailer: TestMailer;
}

export async function world(env: Record<string, string> = {}): Promise<World> {
  const config = loadConfig({ NODE_ENV: "test", EMAIL_TRANSPORT: "memory", TRUSTED_ORIGINS: MARKETING, ...env });
  const services = await createServices(config);
  return { services, app: createApp(services), mailer: services.mailer as TestMailer };
}

/** A browser: keeps its own cookies, always sends the app's origin, like the real single-page app does. */
export class Browser {
  cookies = new Map<string, string>();
  constructor(
    private readonly w: World,
    private readonly origin = ORIGIN,
  ) {}

  get cookieHeader(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private absorb(res: Response): void {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair = ""] = line.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      if (/max-age=0/i.test(line) || value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  async request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Response> {
    const h: Record<string, string> = { origin: this.origin, ...headers };
    if (body !== undefined) h["content-type"] = "application/json";
    if (this.cookies.size) h.cookie = this.cookieHeader;
    const res = await this.w.app.request(path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    this.absorb(res);
    return res;
  }

  get = (path: string) => this.request("GET", path);
  post = (path: string, body?: unknown, headers?: Record<string, string>) => this.request("POST", path, body ?? {}, headers);
  patch = (path: string, body: unknown) => this.request("PATCH", path, body);
  put = (path: string, body: unknown) => this.request("PUT", path, body);
  del = (path: string, body?: unknown) => this.request("DELETE", path, body);

  async json<T = Record<string, unknown>>(res: Response): Promise<T> {
    return (await res.json()) as T;
  }

  async me(): Promise<Record<string, any> | null> {
    const res = await this.get("/api/me");
    return res.status === 200 ? ((await res.json()) as Record<string, any>) : null;
  }
}

export const linkIn = (text: string): string => text.match(/https?:\/\/\S+/)![0];
export const lastMail = (w: World, to: string) => [...w.mailer.outbox].reverse().find((m) => m.to.toLowerCase() === to.toLowerCase());

/** Registers and verifies by following the emailed link, exactly as a person would. Returns the account id. */
export async function register(w: World, email: string, name = "Test Person", password = PASSWORD): Promise<string> {
  const b = new Browser(w);
  const res = await b.post("/api/auth/sign-up/email", { name, email, password });
  if (res.status !== 200) throw new Error(`sign-up failed: ${res.status} ${await res.text()}`);
  const mail = lastMail(w, email);
  if (!mail) throw new Error("No verification email was sent");
  const verify = await w.app.request(linkIn(mail.text).replace(w.services.config.appOrigin, ""), { headers: { origin: ORIGIN } });
  if (![200, 302].includes(verify.status)) throw new Error(`verify failed: ${verify.status}`);
  return (w.services.db.get<{ id: string }>('SELECT id FROM "user" WHERE email = ?', email.toLowerCase()) as { id: string }).id;
}

export async function signIn(w: World, email: string, password = PASSWORD): Promise<Browser> {
  const b = new Browser(w);
  const res = await b.post("/api/auth/sign-in/email", { email, password });
  if (res.status !== 200) throw new Error(`sign-in failed: ${res.status} ${await res.text()}`);
  return b;
}

export async function newUser(w: World, email: string, name?: string): Promise<{ id: string; browser: Browser }> {
  const id = await register(w, email, name);
  return { id, browser: await signIn(w, email) };
}

// ---- TOTP (RFC 6238), so tests can complete two-step verification like an authenticator app would
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Decode(input: string): Buffer {
  let bits = "";
  for (const ch of input.replace(/=+$/, "").toUpperCase()) bits += B32.indexOf(ch).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
export function totp(secretBase32: string, at = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30000)));
  const h = createHmac("sha1", base32Decode(secretBase32)).update(counter).digest();
  const o = (h[h.length - 1] as number) & 0xf;
  const code = (((h[o] as number) & 0x7f) << 24) | (((h[o + 1] as number) & 0xff) << 16) | (((h[o + 2] as number) & 0xff) << 8) | ((h[o + 3] as number) & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

/** Turns on two-step verification for a signed-in browser; its session counts as having passed the second step. */
export async function enrollMfa(b: Browser, password = PASSWORD): Promise<string> {
  const res = await b.post("/api/auth/two-factor/enable", { password });
  if (res.status !== 200) throw new Error(`enable 2fa failed: ${res.status} ${await res.text()}`);
  const { totpURI } = (await res.json()) as { totpURI: string };
  const secret = new URL(totpURI).searchParams.get("secret") as string;
  const verify = await b.post("/api/auth/two-factor/verify-totp", { code: totp(secret) });
  if (verify.status !== 200) throw new Error(`verify 2fa failed: ${verify.status} ${await verify.text()}`);
  return secret;
}

/** Signs in with the password and then the authenticator code. */
export async function signInWithMfa(w: World, email: string, secret: string, password = PASSWORD): Promise<Browser> {
  const b = new Browser(w);
  const first = await b.post("/api/auth/sign-in/email", { email, password });
  const body = (await first.json()) as { twoFactorRedirect?: boolean };
  if (!body.twoFactorRedirect) throw new Error("Expected a two-step challenge");
  const second = await b.post("/api/auth/two-factor/verify-totp", { code: totp(secret) });
  if (second.status !== 200) throw new Error(`2fa sign-in failed: ${second.status} ${await second.text()}`);
  return b;
}

export const makeOwner = (w: World, userId: string, email: string) => bootstrapOwner(w.services, { userId, confirmEmail: email, operator: "operator:test" });
export const give = (w: World, userId: string, scope: Scope, role: string) => grantRole(w.services.db, userId, scope, role, "test");

/** A signed-in staff member who has enrolled two-step verification and signed in with it, as the gate requires. */
export async function staff(w: World, email: string, roles: [Scope, string][], name = "Staff Person"): Promise<{ id: string; browser: Browser; secret: string }> {
  const id = await register(w, email, name);
  for (const [scope, role] of roles) give(w, id, scope, role);
  const first = await signIn(w, email);
  const secret = await enrollMfa(first);
  return { id, secret, browser: await signInWithMfa(w, email, secret) };
}
