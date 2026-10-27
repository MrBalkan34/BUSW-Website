import type { Db } from "./db";

/**
 * BU Account's own tables. Better Auth creates and migrates the identity tables itself (user, session, account,
 * verification, twoFactor, rateLimit); see `migrate()` in migrate.ts, which runs those first.
 *
 * Shared identity (Better Auth) is deliberately separate from everything below: BUSW-specific profile,
 * roles, application access, projects, submissions and the audit trail all reference the opaque user id and
 * never the email address.
 */
const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "001-access",
    sql: `
CREATE TABLE account_state (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active','suspended')),
  reason TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL
);

CREATE TABLE app_access (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','restricted')),
  reason TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, app_id)
);

CREATE TABLE app_connection (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  PRIMARY KEY (user_id, app_id)
);

CREATE TABLE role_assignment (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('platform','bu-account','busw')),
  role TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  revoked_at TEXT,
  revoked_by TEXT,
  CHECK ((scope = 'platform' AND role = 'owner') OR (scope = 'bu-account' AND role IN ('admin','support')) OR (scope = 'busw' AND role IN ('admin','staff')))
);
CREATE UNIQUE INDEX role_assignment_active ON role_assignment (user_id, scope, role) WHERE revoked_at IS NULL;

-- The founder designation is written only by the operator command. No HTTP route reads or writes it directly.
CREATE TABLE founder_designation (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  designated_at TEXT NOT NULL,
  designated_by TEXT NOT NULL
);

CREATE TABLE audit_event (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user','operator','system')),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  before_json TEXT,
  after_json TEXT,
  request_id TEXT
);
CREATE INDEX audit_event_target ON audit_event (target_type, target_id, at);
CREATE INDEX audit_event_actor ON audit_event (actor_id, at);
CREATE INDEX audit_event_at ON audit_event (at);

-- The audit trail is append-only: not even a bug in this server can edit or erase it.
CREATE TRIGGER audit_event_no_update BEFORE UPDATE ON audit_event BEGIN SELECT RAISE(ABORT, 'audit_event is append-only'); END;
CREATE TRIGGER audit_event_no_delete BEFORE DELETE ON audit_event BEGIN SELECT RAISE(ABORT, 'audit_event is append-only'); END;
`,
  },
  {
    id: "002-busw",
    sql: `
CREATE TABLE busw_profile (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT '',
  business_country TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE project (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id TEXT,
  data_json TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('cloud','local-import')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX project_owner ON project (owner_user_id, updated_at);

-- A submission is a frozen record: what the client sent and what the server priced. Only its status moves.
CREATE TABLE submission (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL,
  owner_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  ownership_status TEXT NOT NULL CHECK (ownership_status IN ('owned','needs_review')),
  source TEXT NOT NULL CHECK (source IN ('builder','legacy-import')),
  submitted_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('received','in_review','quoted','closed')),
  status_changed_at TEXT NOT NULL,
  locale TEXT,
  currency TEXT NOT NULL,
  region TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  estimate_json TEXT NOT NULL,
  discrepancies_json TEXT NOT NULL,
  notify_status TEXT NOT NULL DEFAULT 'not_attempted' CHECK (notify_status IN ('not_attempted','sent','failed')),
  CHECK ((ownership_status = 'owned' AND owner_user_id IS NOT NULL) OR ownership_status = 'needs_review')
);
CREATE UNIQUE INDEX submission_idempotency ON submission (owner_user_id, idempotency_key) WHERE owner_user_id IS NOT NULL;
CREATE INDEX submission_owner ON submission (owner_user_id, received_at);
CREATE INDEX submission_status ON submission (status, received_at);

CREATE TRIGGER submission_frozen BEFORE UPDATE OF reference, snapshot_json, estimate_json, discrepancies_json, submitted_at, received_at, currency, region, source ON submission
BEGIN SELECT RAISE(ABORT, 'a submission snapshot is immutable'); END;
CREATE TRIGGER submission_owner_once BEFORE UPDATE OF owner_user_id ON submission WHEN OLD.owner_user_id IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'a submission owner cannot be changed'); END;
CREATE TRIGGER submission_no_delete BEFORE DELETE ON submission BEGIN SELECT RAISE(ABORT, 'submissions are never deleted'); END;

CREATE TABLE asset (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  submission_id TEXT NOT NULL REFERENCES submission(id),
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime TEXT NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp')),
  bytes INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX asset_client ON asset (submission_id, client_id);

-- What BUSW tells the client. Staff-only notes live in their own table and never appear in client responses.
CREATE TABLE quote (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submission(id),
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  currency TEXT NOT NULL,
  one_time_minor INTEGER NOT NULL,
  monthly_minor INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX quote_submission ON quote (submission_id, created_at);
CREATE TRIGGER quote_no_update BEFORE UPDATE ON quote BEGIN SELECT RAISE(ABORT, 'quotes are append-only'); END;

CREATE TABLE staff_note (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submission(id),
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX staff_note_submission ON staff_note (submission_id, created_at);
`,
  },
  {
    id: "003-session-mfa",
    sql: `
-- Better Auth does not record whether a session passed the second step. We do: a row exists only for sessions that did.
CREATE TABLE session_mfa (
  session_id TEXT PRIMARY KEY REFERENCES session(id) ON DELETE CASCADE,
  verified_at TEXT NOT NULL
);
`,
  },
  {
    id: "004-used-links",
    sql: `
-- Verification links are signed tokens, which on their own can be clicked twice. We remember each one (only a hash of it)
-- the first time it is used, so a link works exactly once.
CREATE TABLE used_link (
  hash TEXT PRIMARY KEY,
  used_at TEXT NOT NULL
);
`,
  },
];

export function runOwnMigrations(db: Db): string[] {
  db.raw.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const applied = new Set(db.all<{ id: string }>("SELECT id FROM schema_migrations").map((r) => r.id));
  const ran: string[] = [];
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.transaction(() => {
      db.raw.exec(migration.sql);
      db.run("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)", migration.id, new Date().toISOString());
    });
    ran.push(migration.id);
  }
  return ran;
}
