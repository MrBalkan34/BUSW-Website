import { main, parseArgs, withServices } from "./run";

// Operator tool: look up an account's stable id by the email it registered with, so the id can be given to bootstrap-owner.
// It prints; it changes nothing. It exists so nobody has to guess an email or copy an id from a screenshot.
main(() =>
  withServices(async ({ db }) => {
    const args = parseArgs(process.argv.slice(2));
    const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
    if (!email) throw new Error("Usage: npm run find-user -- --email <address>");
    const rows = db.all<{ id: string; name: string; email: string; emailVerified: number; createdAt: string }>('SELECT id, name, email, emailVerified, createdAt FROM "user" WHERE lower(email) = ?', email);
    if (rows.length === 0) return console.log("No account has that email address.");
    for (const r of rows) console.log(`id:       ${r.id}\nname:     ${r.name}\nemail:    ${r.email}\nverified: ${r.emailVerified ? "yes" : "no"}\ncreated:  ${r.createdAt}`);
  }),
);
