import { readFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { recordAudit } from "../audit";
import { matchesMime, storeSubmission, type AssetInput } from "../submissions";
import { verifySubmission } from "../shared";
import { main, operatorName, parseArgs, withServices } from "./run";

// Brings a submission that arrived as a brief package (the .zip a client emailed before the server existed) into the
// database. The record is stored WITHOUT an owner and flagged "needs review": it is never attached to an account just
// because its contact email matches one. A BUSW administrator assigns an owner explicitly, by account id, in the admin screens.
//
//   npm run import-legacy -- --zip path/to/busw-brief-example-2026-10-25.zip
main(() =>
  withServices(async (services) => {
    const args = parseArgs(process.argv.slice(2));
    if (typeof args.zip !== "string") throw new Error("Usage: npm run import-legacy -- --zip <brief package>");
    const files = unzipSync(new Uint8Array(readFileSync(args.zip)));
    const raw = files["submission.json"];
    if (!raw) throw new Error("That package has no submission.json.");
    const submission = JSON.parse(strFromU8(raw)) as { submissionId?: string; assets?: { id: string; mime: string; file: string; name?: string; width?: number; height?: number }[] };

    if (typeof submission.submissionId === "string" && services.db.get("SELECT 1 AS x FROM submission WHERE idempotency_key = ? AND source = 'legacy-import'", submission.submissionId)) {
      console.log("Already imported. Nothing changed.");
      return;
    }

    const assetData: Record<string, string> = {};
    const assets: AssetInput[] = [];
    for (const ref of submission.assets ?? []) {
      const bytes = files[ref.file];
      if (!bytes) throw new Error(`The package is missing ${ref.file}.`);
      assetData[ref.id] = `data:${ref.mime};base64,${Buffer.from(bytes).toString("base64")}`;
      if (!matchesMime(Buffer.from(bytes), ref.mime)) throw new Error(`${ref.file} is not a real ${ref.mime} image.`);
      assets.push({ clientId: ref.id, name: ref.name ?? ref.file, mime: ref.mime as AssetInput["mime"], width: ref.width ?? 1, height: ref.height ?? 1, bytes: Buffer.from(bytes) });
    }

    const verified = verifySubmission({ submission: { ...submission, acknowledgedEstimate: true }, assetData });
    if (!verified.ok) throw new Error(`The package did not validate:\n - ${verified.errors.join("\n - ")}`);

    const row = storeSubmission(services, { trusted: verified.trusted, assets, ownerUserId: null, source: "legacy-import", locale: null });
    recordAudit(services.db, { actor: { type: "operator", id: operatorName() }, action: "submission.legacy_imported", target: { type: "submission", id: row.id }, after: { reference: row.reference, ownershipStatus: row.ownership_status } });
    console.log(`Imported as ${row.reference}. It has no owner and is flagged "needs review" until an administrator assigns one.`);
  }),
);
