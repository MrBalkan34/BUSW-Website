import type { TranslateFn } from "../i18n/translate";
import type { SubmissionPayload } from "./snapshot";

/**
 * Where submissions are sent. It is deliberately unset: no submission service exists yet, so
 * the builder offers the interim downloadable brief instead of pretending to deliver anything.
 * Set VITE_SUBMISSION_URL at build time to the endpoint once one exists (see README).
 */
export const SUBMISSION_URL: string | undefined = (import.meta.env.VITE_SUBMISSION_URL as string | undefined)?.trim() || undefined;

export type SubmitFailure =
  | { kind: "not-configured"; message: string; retryable: false }
  /** The person is signed out (or the session ended). Their design is untouched; they sign in and try again. */
  | { kind: "signed-out"; message: string; retryable: false; status: number }
  /** Their access to BUSW is restricted, so nothing can be sent. */
  | { kind: "forbidden"; message: string; retryable: false; status: number }
  /** The request never got an answer: offline, DNS, blocked, or a timeout. */
  | { kind: "network"; message: string; retryable: true; timedOut: boolean }
  /** The service answered but could not take it: 5xx, 429 or a gateway error. */
  | { kind: "unavailable"; message: string; retryable: true; status: number }
  /** The service refused the content. Fix the listed problems before trying again. */
  | { kind: "rejected"; message: string; retryable: false; status: number; errors: string[] }
  /** A success status without a usable reference. Delivery cannot be confirmed, so it is NOT reported as sent. */
  | { kind: "unconfirmed"; message: string; retryable: true; status: number };

export type SubmitResult = { ok: true; reference: string } | ({ ok: false } & SubmitFailure);

/** The failure worded in the client's language. `message` stays plain English for logs and tests. */
export function failureMessage(failure: SubmitFailure, t: TranslateFn): string {
  switch (failure.kind) {
    case "not-configured":
      return t("submit.notConfigured");
    case "network":
      return t(failure.timedOut ? "submit.timeout" : "submit.network");
    case "signed-out":
      return t("submit.signedOut");
    case "forbidden":
      return t("submit.forbidden");
    case "unconfirmed":
      return t("submit.unconfirmed");
    case "rejected":
      return t("submit.rejected");
    case "unavailable":
      return t("submit.unavailable");
  }
}

export interface SubmitOptions {
  url: string | undefined;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Sends a submission. Success is reported only when the service replies 2xx with `{ "reference": "<id>" }`.
 * Anything else, including a 2xx with no reference, is a failure the client is told about.
 */
export async function submitToBusw(payload: SubmissionPayload, options: SubmitOptions): Promise<SubmitResult> {
  if (!options.url) {
    return { ok: false, kind: "not-configured", retryable: false, message: "Online submission is not connected yet." };
  }
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await doFetch(options.url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Idempotency-Key": payload.submission.submissionId },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      kind: "network",
      retryable: true,
      timedOut,
      message: timedOut ? "BUSW did not respond in time. Nothing has been confirmed as sent." : "Could not reach BUSW. Check your connection and try again. Nothing has been sent.",
    };
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  if (response.ok) {
    const reference = typeof record.reference === "string" ? record.reference.trim() : "";
    if (reference !== "" && reference.length <= 100) return { ok: true, reference };
    return { ok: false, kind: "unconfirmed", retryable: true, status: response.status, message: "BUSW's server replied without confirming it stored your submission, so it is not counted as sent. Try again, or download the brief instead." };
  }

  if (response.status === 401) return { ok: false, kind: "signed-out", retryable: false, status: 401, message: "You are signed out, so nothing was sent." };
  if (response.status === 403) return { ok: false, kind: "forbidden", retryable: false, status: 403, message: "Access to BUSW is restricted for this account, so nothing was sent." };

  if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
    const errors = Array.isArray(record.errors) ? record.errors.filter((e): e is string => typeof e === "string").slice(0, 10) : [];
    return { ok: false, kind: "rejected", retryable: false, status: response.status, errors, message: "BUSW could not accept the submission as it is." };
  }

  return { ok: false, kind: "unavailable", retryable: true, status: response.status, message: "BUSW's submission service is not available right now. Nothing has been sent. Try again shortly, or download the brief instead." };
}
