import { recordAudit } from "./audit";
import { grantRole, holdsRole, isSuspended, ownerExists } from "./authz";
import { nowIso } from "./db";
import type { Services } from "./services";

export interface BootstrapInput {
  /** The stable, opaque account id. Never a guessed or inferred email. */
  userId: string;
  /** The operator retypes the account's email after seeing it, so the wrong account cannot be promoted by a slip. */
  confirmEmail: string;
  /** Who is running the command, for the audit trail, for example "operator:alice@host". */
  operator: string;
}

export interface Identity {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  mfaEnabled: boolean;
}

export const describeAccount = (services: Pick<Services, "db">, userId: string): Identity | null => {
  const row = services.db.get<{ id: string; name: string; email: string; emailVerified: number; createdAt: string; twoFactorEnabled: number | null }>('SELECT id, name, email, emailVerified, createdAt, twoFactorEnabled FROM "user" WHERE id = ?', userId);
  return row ? { id: row.id, name: row.name, email: row.email, emailVerified: Boolean(row.emailVerified), createdAt: row.createdAt, mfaEnabled: Boolean(row.twoFactorEnabled) } : null;
};

/**
 * Makes an existing, verified account the platform owner and founder. This is a trusted operator action run on the
 * server (see docs); no HTTP route calls it. Ownership and BUSW administration are two separate assignments, and the
 * founder designation is a third, separate record that grants nothing by itself.
 */
export function bootstrapOwner(services: Pick<Services, "db">, input: BootstrapInput): { ownerRoleId: string; buswRoleId: string | null } {
  const { db } = services;
  const identity = describeAccount(services, input.userId);
  if (!identity) throw new Error("No account has that id. Use `npm run find-user` to look the id up.");
  if (!identity.emailVerified) throw new Error("That account has not verified its email address yet.");
  if (isSuspended(db, identity.id)) throw new Error("That account is suspended.");
  if (input.confirmEmail.trim().toLowerCase() !== identity.email.toLowerCase()) throw new Error("The confirmation email does not match the account. Nothing was changed.");
  if (ownerExists(db)) throw new Error("A platform owner already exists. Further owners are granted by an existing owner in the administration screens, not by this command.");
  if (db.get("SELECT 1 AS x FROM founder_designation")) throw new Error("A founder designation already exists.");

  return db.transaction(() => {
    const ownerRoleId = grantRole(db, identity.id, "platform", "owner", input.operator);
    recordAudit(db, { actor: { type: "operator", id: input.operator }, action: "role.granted", target: { type: "account", id: identity.id }, reason: "Initial platform owner provisioning", before: null, after: { scope: "platform", role: "owner", assignmentId: ownerRoleId } });

    let buswRoleId: string | null = null;
    if (!holdsRole(db, identity.id, "busw:admin")) {
      buswRoleId = grantRole(db, identity.id, "busw", "admin", input.operator);
      recordAudit(db, { actor: { type: "operator", id: input.operator }, action: "role.granted", target: { type: "account", id: identity.id }, reason: "Initial platform owner provisioning", before: null, after: { scope: "busw", role: "admin", assignmentId: buswRoleId } });
    }

    db.run("INSERT INTO founder_designation (user_id, designated_at, designated_by) VALUES (?, ?, ?)", identity.id, nowIso(), input.operator);
    recordAudit(db, { actor: { type: "operator", id: input.operator }, action: "founder.designated", target: { type: "account", id: identity.id }, reason: "Initial platform owner provisioning", before: null, after: { designated: true } });
    return { ownerRoleId, buswRoleId };
  });
}
