import { randomUUID } from "node:crypto";
import type { Db } from "./db";
import { nowIso } from "./db";

/**
 * Roles are scoped. A BUSW administrator administers BUSW and nothing else; a BU Account administrator administers
 * accounts but cannot read BUSW client content; the platform owner can grant and revoke administrative roles but
 * holds no BUSW or other application permissions of its own. Each is a separate, explicit assignment.
 */
export const SCOPES = ["platform", "bu-account", "busw"] as const;
export type Scope = (typeof SCOPES)[number];

export const ROLES = {
  platform: ["owner"],
  "bu-account": ["admin", "support"],
  busw: ["admin", "staff"],
} as const;

export type RoleKey = "platform:owner" | "bu-account:admin" | "bu-account:support" | "busw:admin" | "busw:staff";
export const ALL_ROLE_KEYS: readonly RoleKey[] = ["platform:owner", "bu-account:admin", "bu-account:support", "busw:admin", "busw:staff"];

export const roleKey = (scope: Scope, role: string): RoleKey => `${scope}:${role}` as RoleKey;

export function isValidRole(scope: string, role: string): scope is Scope {
  return (SCOPES as readonly string[]).includes(scope) && (ROLES[scope as Scope] as readonly string[]).includes(role);
}

/** Applications a user can be connected to or restricted from. The first is BUSW; future applications are added here. */
export const APPS = ["busw"] as const;
export type AppId = (typeof APPS)[number];
export const isAppId = (value: string): value is AppId => (APPS as readonly string[]).includes(value);

export type Permission =
  | "roles.manage"
  | "accounts.read.limited"
  | "accounts.read.full"
  | "accounts.recovery.assist"
  | "accounts.suspend"
  | "accounts.sessions.revoke"
  | "accounts.appaccess.manage"
  | "audit.read"
  | "busw.submissions.read"
  | "busw.submissions.manage"
  | "busw.ownership.assign";

const BU_ACCOUNT_ADMIN: Permission[] = ["accounts.read.limited", "accounts.read.full", "accounts.recovery.assist", "accounts.suspend", "accounts.sessions.revoke", "accounts.appaccess.manage", "audit.read"];

const GRANTS: Record<RoleKey, Permission[]> = {
  "platform:owner": ["roles.manage", ...BU_ACCOUNT_ADMIN],
  "bu-account:admin": BU_ACCOUNT_ADMIN,
  "bu-account:support": ["accounts.read.limited", "accounts.recovery.assist"],
  "busw:admin": ["busw.submissions.read", "busw.submissions.manage", "busw.ownership.assign"],
  "busw:staff": ["busw.submissions.read", "busw.submissions.manage"],
};

export const permissionsFor = (roles: readonly RoleKey[]): Set<Permission> => new Set(roles.flatMap((r) => GRANTS[r] ?? []));

export interface RoleRow {
  id: string;
  user_id: string;
  scope: Scope;
  role: string;
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
}

export function activeRoles(db: Db, userId: string): RoleKey[] {
  return db.all<{ scope: Scope; role: string }>("SELECT scope, role FROM role_assignment WHERE user_id = ? AND revoked_at IS NULL", userId).map((r) => roleKey(r.scope, r.role));
}

export function activeRoleRows(db: Db, userId: string): RoleRow[] {
  return db.all<RoleRow>("SELECT * FROM role_assignment WHERE user_id = ? AND revoked_at IS NULL ORDER BY granted_at", userId);
}

export const isPrivileged = (roles: readonly RoleKey[]): boolean => roles.length > 0;

export function isSuspended(db: Db, userId: string): boolean {
  return db.get<{ status: string }>("SELECT status FROM account_state WHERE user_id = ?", userId)?.status === "suspended";
}

/** BUSW is open to everyone by default; a restriction row switches one account off for that application only. */
export function appAccessStatus(db: Db, userId: string, appId: AppId): "active" | "restricted" {
  return db.get<{ status: "active" | "restricted" }>("SELECT status FROM app_access WHERE user_id = ? AND app_id = ?", userId, appId)?.status ?? "active";
}

export function connectApp(db: Db, userId: string, appId: AppId): void {
  db.run("INSERT OR IGNORE INTO app_connection (user_id, app_id, connected_at) VALUES (?, ?, ?)", userId, appId, nowIso());
}

export function countActiveOwners(db: Db): number {
  return (
    db.get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM role_assignment r
       WHERE r.scope = 'platform' AND r.role = 'owner' AND r.revoked_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM account_state s WHERE s.user_id = r.user_id AND s.status = 'suspended')`,
    )?.n ?? 0
  );
}

export const ownerExists = (db: Db): boolean => countActiveOwners(db) > 0;

export const holdsRole = (db: Db, userId: string, key: RoleKey): boolean => activeRoles(db, userId).includes(key);

export function grantRole(db: Db, userId: string, scope: Scope, role: string, grantedBy: string): string {
  const id = randomUUID();
  db.run("INSERT INTO role_assignment (id, user_id, scope, role, granted_by, granted_at) VALUES (?, ?, ?, ?, ?, ?)", id, userId, scope, role, grantedBy, nowIso());
  return id;
}

export function revokeRole(db: Db, assignmentId: string, revokedBy: string): void {
  db.run("UPDATE role_assignment SET revoked_at = ?, revoked_by = ? WHERE id = ? AND revoked_at IS NULL", nowIso(), revokedBy, assignmentId);
}

/**
 * The only way to learn whether someone is the founder, for this app and for future ones. The designation is a
 * protected, server-written record; it only counts while the platform-owner role is active and the account is in good standing,
 * so a revoked role can never leave a stale badge. It carries no email or other account detail.
 */
export function getVerifiedBadge(db: Db, userId: string): { label: "Founder · Admin" } | null {
  const designated = db.get<{ user_id: string }>("SELECT user_id FROM founder_designation WHERE user_id = ?", userId);
  if (!designated) return null;
  if (isSuspended(db, userId)) return null;
  return holdsRole(db, userId, "platform:owner") ? { label: "Founder · Admin" } : null;
}
