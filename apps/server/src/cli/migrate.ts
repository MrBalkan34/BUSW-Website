import { main, withServices } from "./run";

// createServices applies every migration (identity tables, then ours). This command just does that and reports.
main(() =>
  withServices(async ({ db, config }) => {
    const applied = db.all<{ id: string }>("SELECT id FROM schema_migrations ORDER BY id").map((r) => r.id);
    console.log(`Database: ${config.databasePath}`);
    console.log(`Migrations applied: ${applied.join(", ") || "(none)"}`);
  }),
);
