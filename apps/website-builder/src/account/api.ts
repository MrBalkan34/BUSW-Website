import type { TranslateFn } from "../i18n/translate";

/** The account server. Empty means the same origin as this page (how it is served in production and through the dev proxy). */
export const API_BASE: string = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/+$/, "");

export interface ApiResult<T = any> {
  ok: boolean;
  status: number;
  data: T;
  /** A machine-readable reason from the server, or "network" when it could not be reached at all. */
  code: string | null;
}

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    const record = (typeof data === "object" && data !== null ? data : {}) as { error?: unknown; code?: unknown };
    const code = typeof record.error === "string" ? record.error : typeof record.code === "string" ? record.code : null;
    return { ok: response.ok, status: response.status, data: data as T, code };
  } catch {
    return { ok: false, status: 0, data: null as T, code: "network" };
  }
}

export interface Me {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  preferredLanguage: "en" | "tr";
  business: { name: string; country: string | null };
  badge: { label: string } | null;
  roles: { scope: string; role: string }[];
  security: { mfaEnabled: boolean; mfaVerifiedThisSession: boolean; recentAuth: boolean; reauthWindowSeconds: number };
  access: { busw: "active" | "restricted"; buswAdmin: boolean; accountAdmin: boolean; isOwner: boolean; staffNeedsMfa: boolean };
  apps: { id: string; connectedAt: string }[];
  ownerProvisioned: boolean;
}

/** A reader-friendly message for a failed call, in the person's language. Never shows a server's raw wording. */
export function errorText(t: TranslateFn, result: Pick<ApiResult, "status" | "code">): string {
  const code = result.code ?? "";
  if (code === "network" || result.status === 0) return t("acct.error.network");
  if (result.status === 429 || code === "rate_limited") return t("acct.error.rateLimited");
  if (code === "email_unavailable" || code === "EMAIL_UNAVAILABLE") return t("acct.error.emailUnavailable");
  if (code === "reauth_required") return t("acct.error.reauth");
  if (code === "app_restricted") return t("acct.error.appRestricted");
  if (code === "ACCOUNT_SUSPENDED") return t("acct.error.suspended");
  const specific = `admin.acct.err.${code}`;
  if (code === "owner_protected" || code === "last_owner" || code === "self_target" || code === "already_granted" || code === "invalid_target" || code === "forbidden") return t(specific as "admin.acct.err.forbidden");
  return t("acct.error.generic");
}
