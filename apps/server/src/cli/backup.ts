import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadConfig } from "../config";
import { main, parseArgs } from "./run";

// A consistent copy of everything the server keeps: the database and the private images.
//
//   npm run backup -- --to /path/to/backups
//
// Safe to run while the server is up: the database is copied with SQLite's own VACUUM INTO, which gives a point-in-time
// snapshot. It writes a new dated folder each time and never overwrites. Copy that folder off the machine afterwards.
// To restore, stop the server, put `bu-account.sqlite` and `assets/` back into DATA_DIR, and start it.
main(async () => {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args.to !== "string") throw new Error("Usage: npm run backup -- --to <folder>");
  const config = loadConfig();
  if (!existsSync(config.databasePath)) throw new Error(`No database at ${config.databasePath}.`);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(resolve(args.to), `bu-account-${stamp}`);
  mkdirSync(target, { recursive: true });

  const db = new DatabaseSync(config.databasePath, { readOnly: true });
  try {
    db.exec(`VACUUM INTO '${join(target, "bu-account.sqlite").replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }
  if (existsSync(config.assetsDir)) cpSync(config.assetsDir, join(target, "assets"), { recursive: true });

  const count = existsSync(join(target, "assets")) ? readdirSync(join(target, "assets")).length : 0;
  console.log(`Backup written to ${target}\n  database: bu-account.sqlite\n  images:   ${count} file(s)`);
  console.log("Copy this folder somewhere off this machine. It contains personal data: protect it like the live data.");
});
