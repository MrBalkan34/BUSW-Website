import { randomBytes } from "node:crypto";
import { main, withServices } from "./run";

// Development only: creates one verified demo client so the interface can be explored. Refuses to run in production,
// and its account lives only in your local data folder. It prints a random password once and stores nothing else.
main(() =>
  withServices(async ({ auth, db, config }) => {
    if (config.isProduction) throw new Error("seed:dev never runs in production.");
    const email = "demo-client@example.test";
    if (db.get('SELECT 1 AS x FROM "user" WHERE email = ?', email)) return console.log(`${email} already exists.`);
    const password = randomBytes(12).toString("base64url");
    await auth.api.signUpEmail({ body: { name: "Demo Client", email, password } });
    db.run('UPDATE "user" SET emailVerified = 1 WHERE email = ?', email);
    console.log(`Created ${email} (verified). Password: ${password}\n(Shown once. This account exists only in ${config.dataDir}.)`);
  }),
);
