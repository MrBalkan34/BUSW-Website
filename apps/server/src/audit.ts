import { randomUUID } from "node:crypto";
import type { Db } from "./db";
import { nowIso } from "./db";

export type Actor = { type: "user"; id: string } | { type: "operator"; id: string } | { type: "system"; id: string };

export interface AuditInput {
  actor: Actor;
  action: string;
  target: { type: string; id: string };
  reason?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  requestId?: string | null;
}

export interface AuditRow {
  id: string;
  at: string;
  actor_type: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  before_json: string | null;
  after_json: string | null;
  request_id: string | null;
}

/** Field names that must never reach the audit trail, whatever calls it. */
const SECRET_KEY = /pass(word)?|token|secret|hash|cookie|authorization|otp|totp|backup|code|link|url|dataurl/i;

export function redact(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    out[key] = typeof v === "string" && v.length > 500 ? `${v.slice(0, 500)}…` : v;
  }
  return out;
}

/** Appends one event. The table refuses updates and deletes, so what is written here is permanent. */
export function recordAudit(db: Db, input: AuditInput): string {
  const id = randomUUID();
  db.run(
    "INSERT INTO audit_event (id, at, actor_type, actor_id, action, target_type, target_id, reason, before_json, after_json, request_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    id,
    nowIso(),
    input.actor.type,
    input.actor.id,
    input.action,
    input.target.type,
    input.target.id,
    input.reason ?? null,
    JSON.stringify(redact(input.before)),
    JSON.stringify(redact(input.after)),
    input.requestId ?? null,
  );
  return id;
}

export interface AuditFilter {
  actor?: string;
  target?: string;
  action?: string;
  before?: string;
  limit?: number;
}

export function listAudit(db: Db, filter: AuditFilter): { items: AuditRow[]; next: string | null } {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter.actor) (where.push("actor_id = ?"), params.push(filter.actor));
  if (filter.target) (where.push("target_id = ?"), params.push(filter.target));
  if (filter.action) (where.push("action = ?"), params.push(filter.action));
  if (filter.before) (where.push("at < ?"), params.push(filter.before));
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
  const rows = db.all<AuditRow>(`SELECT * FROM audit_event ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY at DESC, id DESC LIMIT ?`, ...params, limit + 1);
  const items = rows.slice(0, limit);
  return { items, next: rows.length > limit ? (items[items.length - 1]?.at ?? null) : null };
}
