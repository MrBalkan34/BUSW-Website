import { mkdirSync } from "node:fs";
import { createAuth, migrateIdentity, type Auth } from "./auth";
import type { Config } from "./config";
import { Db } from "./db";
import { createMailer, type Mailer } from "./mail";
import { runOwnMigrations } from "./migrations";

export interface Services {
  config: Config;
  db: Db;
  mailer: Mailer;
  auth: Auth;
}

/** Opens the database, applies every migration (identity tables first, then ours) and wires the services together. */
export async function createServices(config: Config, overrides: { mailer?: Mailer } = {}): Promise<Services> {
  if (config.databasePath !== ":memory:") mkdirSync(config.dataDir, { recursive: true });
  mkdirSync(config.assetsDir, { recursive: true });
  const db = new Db(config.databasePath);
  const mailer = overrides.mailer ?? createMailer(config);
  const auth = createAuth(config, db, mailer);
  await migrateIdentity(auth);
  runOwnMigrations(db);
  return { config, db, mailer, auth };
}
