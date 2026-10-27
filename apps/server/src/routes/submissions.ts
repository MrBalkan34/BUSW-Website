import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { mailCopy, toLang } from "../mail";
import { permissionProblem, fail, requireApp, requireUser, type AppEnv } from "../http";
import type { Services } from "../services";
import { LIMITS, verifySubmission } from "../shared";
import { clientView, matchesMime, readAssetFile, storeSubmission, type AssetInput, type AssetRow, type SubmissionRow } from "../submissions";

/** 60 images of up to 4 MB, inline as base64, plus the design itself. */
const MAX_SUBMISSION_BYTES = 360_000_000;

export function submissionRoutes(services: Services): Hono<AppEnv> {
  const { db, mailer, config } = services;
  const app = new Hono<AppEnv>();
  app.use("*", requireUser(services), requireApp(services, "busw"));

  /**
   * POST /api/submissions: the contract described in the builder README. Success (201 with a reference) is returned
   * only after the submission and its images are stored. The signed-in account becomes the owner; the contact email
   * the client typed has no bearing on ownership.
   */
  app.post(
    "/",
    bodyLimit({ maxSize: MAX_SUBMISSION_BYTES, onError: (c) => c.json({ error: "too_large", message: "That submission is too large." }, 413) }),
    async (c) => {
      const p = c.get("principal");
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return fail(400, "invalid_json", "The request body must be JSON.");
      }
      const result = verifySubmission(body);
      if (!result.ok) return c.json({ error: "invalid_submission", message: "The submission could not be accepted.", errors: result.errors.slice(0, 20) }, 422);
      const { trusted } = result;

      // Retrying the same submission returns the same reference instead of storing a duplicate.
      const key = c.req.header("idempotency-key") ?? trusted.submissionId;
      if (key !== trusted.submissionId) return fail(422, "idempotency_mismatch", "The Idempotency-Key must equal the submission id.");
      const existing = db.get<SubmissionRow>("SELECT * FROM submission WHERE owner_user_id = ? AND idempotency_key = ?", p.userId, key);
      if (existing) return c.json({ reference: existing.reference, replayed: true }, 201);

      const input = body as { submission: { assets: { id: string; name?: unknown; mime: string; width?: unknown; height?: unknown }[] }; assetData: Record<string, string> };
      const assets: AssetInput[] = [];
      for (const ref of input.submission.assets) {
        const data = input.assetData[ref.id] as string;
        const bytes = Buffer.from(data.slice(data.indexOf(",") + 1), "base64");
        if (!matchesMime(bytes, ref.mime)) return c.json({ error: "invalid_submission", message: "The submission could not be accepted.", errors: [`Image ${ref.id} is not a real ${ref.mime} file.`] }, 422);
        if (bytes.length > LIMITS.assetBytes) return c.json({ error: "invalid_submission", message: "The submission could not be accepted.", errors: [`Image ${ref.id} is too large.`] }, 422);
        const dimension = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 10_000 ? v : 1);
        assets.push({ clientId: ref.id, name: typeof ref.name === "string" ? ref.name : "image", mime: ref.mime as AssetInput["mime"], width: dimension(ref.width), height: dimension(ref.height), bytes });
      }

      let row: SubmissionRow;
      try {
        row = storeSubmission(services, { trusted, assets, ownerUserId: p.userId, source: "builder", locale: p.preferredLanguage });
      } catch (error) {
        console.error("storing a submission failed", error instanceof Error ? error.message : error);
        return fail(500, "store_failed", "The submission could not be stored. Nothing was sent.");
      }

      // BUSW is told with a link, never the content. The submission stands whether or not this email goes out.
      if (config.email.staffNotifyTo) {
        const mail = mailCopy(toLang("en")).staff(row.reference, `${config.appOrigin}/admin/busw/${row.id}`);
        const status = await mailer.send({ to: config.email.staffNotifyTo, ...mail }).then(
          () => "sent",
          () => "failed",
        );
        db.run("UPDATE submission SET notify_status = ? WHERE id = ?", status, row.id);
      }
      return c.json({ reference: row.reference }, 201);
    },
  );

  app.get("/", (c) => {
    const rows = db.all<SubmissionRow>("SELECT * FROM submission WHERE owner_user_id = ? ORDER BY received_at DESC", c.get("principal").userId);
    return c.json({ submissions: rows.map((r) => clientView(db, r)) });
  });

  app.get("/:id", (c) => {
    const row = db.get<SubmissionRow>("SELECT * FROM submission WHERE id = ? AND owner_user_id = ?", c.req.param("id"), c.get("principal").userId);
    if (!row) return fail(404, "not_found", "That submission does not exist.");
    return c.json({ submission: clientView(db, row) });
  });

  return app;
}

/** Private images: the owner, or BUSW staff who pass the same gate as the admin screens. Nobody else, ever. */
export function assetRoutes(services: Services): Hono<AppEnv> {
  const { db } = services;
  const app = new Hono<AppEnv>();
  app.use("*", requireUser(services), requireApp(services, "busw"));

  app.get("/:id", (c) => {
    const p = c.get("principal");
    const asset = db.get<AssetRow>("SELECT * FROM asset WHERE id = ?", c.req.param("id"));
    const owner = asset !== undefined && asset.owner_user_id === p.userId;
    if (!asset || !(owner || permissionProblem(services, p, "busw.submissions.read") === null)) return fail(404, "not_found", "That image does not exist.");
    const bytes = readAssetFile(services, asset.id);
    c.header("Content-Type", asset.mime);
    c.header("Content-Disposition", "inline");
    c.header("Cache-Control", "private, no-store");
    // Even if a file were somehow not an image, the browser must not run it.
    c.header("Content-Security-Policy", "default-src 'none'; sandbox");
    return c.body(new Uint8Array(bytes));
  });

  return app;
}
