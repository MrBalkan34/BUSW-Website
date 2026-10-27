import { bootstrapOwner, describeAccount } from "../bootstrap";
import { ask, main, operatorName, parseArgs, withServices } from "./run";

// Makes one existing, verified account the platform owner and founder.
//
//   npm run bootstrap-owner -- --user-id <account id>
//
// The account is shown first; you then type its email address to confirm. For scripted use, pass
// --confirm-email <address> as well. Run it on the server, where the database is. It is never reachable over HTTP.
main(() =>
  withServices(async (services) => {
    const args = parseArgs(process.argv.slice(2));
    const userId = typeof args["user-id"] === "string" ? args["user-id"] : "";
    if (!userId) throw new Error("Usage: npm run bootstrap-owner -- --user-id <account id>   (find the id with: npm run find-user -- --email <address>)");

    const identity = describeAccount(services, userId);
    if (!identity) throw new Error("No account has that id.");
    console.log("\nYou are about to make this account the PLATFORM OWNER and FOUNDER of Balkan Universal Account,");
    console.log("and BUSW administrator. Two-step verification will be required before administration opens.\n");
    console.log(`  id:        ${identity.id}\n  name:      ${identity.name}\n  email:     ${identity.email}\n  verified:  ${identity.emailVerified ? "yes" : "NO"}\n  created:   ${identity.createdAt}\n  2-step:    ${identity.mfaEnabled ? "already set up" : "not yet set up (set it up after this)"}\n`);

    const confirmEmail = typeof args["confirm-email"] === "string" ? args["confirm-email"] : await ask("Type this account's email address to confirm, or press Enter to cancel: ");
    if (!confirmEmail) {
      console.log("Cancelled. Nothing was changed.");
      return;
    }
    const result = bootstrapOwner(services, { userId, confirmEmail, operator: operatorName() });
    console.log(`\nDone. Platform owner assignment ${result.ownerRoleId}${result.buswRoleId ? `, BUSW administrator assignment ${result.buswRoleId}` : ""}.`);
    console.log("The founder badge shows for as long as the owner role is active. Administration itself opens once two-step verification is set up.");
    console.log("Next: sign in as this account, open Account > Security, and turn on two-step verification.");
  }),
);
