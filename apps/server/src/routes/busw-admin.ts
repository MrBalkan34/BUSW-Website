import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { recordAudit } from "../audit";
import { isSuspended } from "../authz";
import { nowIso } from "../db";
import { actorOf, fail, reasonSchema, readJson, requirePermission, requireApp, requireUser, type AppEnv, type Ctx } from "../http";
import type { Services } from "../services";
import { quoteView, quotesFor, STATUSES, type AssetRow, type SubmissionRow } from "../submissions";

const statusSchema = z.object({ status: z.enum(["received", "in_review", "quoted", "closed"]), reason: z.string().trim().max(500).optional() }).strict();
const noteSchema = z.object({ body: z.string().trim().min(1).max(4000) }).strict();
const quoteSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(4000),
    oneTimeMinor: z.number().int().min(0).max(100_000_000_00),
    monthlyMinor: z.number().int().min(0).max(100_000_000_00),
  })
  .strict();
const assignSchema = z.object({ userId: z.string().trim().min(1).max(80), reason: reasonSchema }).strict();

type Snapshot = { client: { businessName: string; contactName: string; email: string; notes: string }; country: string; design: unknown; addons: unknown; assets: AssetRow[] | unknown[]; template: { id: string | null } };

export function buswAdminRoutes(services: Services): Hono<AppEnv> {
  const { db } = services;
  const app = new Hono<AppEnv>();
  // BUSW administration is BUSW-only: it needs a BUSW role, and honours a BUSW restriction like any other BUSW access.
  app.use("*", requireUser(services), requireApp(services, "busw"));

  const nameOf = (id: string | null): string | null => (id ? (db.get<{ name: string }>('SELECT name FROM "user" WHERE id = ?', id)?.name ?? null) : null);
  const row = (id: string): SubmissionRow => db.get<SubmissionRow>("SELECT * FROM submission WHERE id = ?", id) ?? fail(404, "not_found", "That submission does not exist.");

  const listItem = (r: SubmissionRow) => {
    const snap = JSON.parse(r.snapshot_json) as Snapshot;
    const est = JSON.parse(r.estimate_json) as { oneTimeTotalMinor: number; monthlyTotalMinor: number };
    return { id: r.id, reference: r.reference, status: r.status, receivedAt: r.received_at, business: snap.client.businessName, contact: snap.client.contactName, currency: r.currency, region: r.region, oneTimeTotalMinor: est.oneTimeTotalMinor, ownershipStatus: r.ownership_status, source: r.source };
  };

  app.get("/submissions", requirePermission(services, "busw.submissions.read"), (c) => {
    const q = c.req.query();
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (q.status && (STATUSES as readonly string[]).includes(q.status)) (where.push("status = ?"), params.push(q.status));
    if (q.ownership === "needs_review") where.push("ownership_status = 'needs_review'");
    if (q.q) {
      where.push("(reference LIKE ? ESCAPE '\\' OR json_extract(snapshot_json, '$.client.businessName') LIKE ? ESCAPE '\\')");
      const like = `%${q.q.replace(/[\\%_]/g, "\\$&")}%`;
      params.push(like, like);
    }
    const page = Math.max(1, Number(q.page) || 1);
    const size = Math.min(50, Math.max(1, Number(q.pageSize) || 20));
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM submission ${clause}`, ...params)?.n ?? 0;
    const rows = db.all<SubmissionRow>(`SELECT * FROM submission ${clause} ORDER BY received_at DESC LIMIT ? OFFSET ?`, ...params, size, (page - 1) * size);
    return c.json({ total, page, pageSize: size, items: rows.map(listItem) });
  });

  app.get("/submissions/:id", requirePermission(services, "busw.submissions.read"), (c) => {
    const r = row(c.req.param("id"));
    const notes = db.all<{ id: string; author_id: string; body: string; created_at: string }>("SELECT id, author_id, body, created_at FROM staff_note WHERE submission_id = ? ORDER BY created_at", r.id);
    return c.json({
      submission: {
        ...listItem(r),
        // Plain data only. The interface shows it as text and never renders client markup, so nothing a client typed can run here.
        snapshot: JSON.parse(r.snapshot_json),
        estimate: JSON.parse(r.estimate_json),
        discrepancies: JSON.parse(r.discrepancies_json),
        owner: r.owner_user_id ? { id: r.owner_user_id, name: nameOf(r.owner_user_id) } : null,
        notifyStatus: r.notify_status,
        locale: r.locale,
        statusChangedAt: r.status_changed_at,
        notes: notes.map((n) => ({ id: n.id, author: nameOf(n.author_id), body: n.body, createdAt: n.created_at })),
        quotes: quotesFor(db, r.id).map(quoteView),
      },
    });
  });

  app.patch("/submissions/:id/status", requirePermission(services, "busw.submissions.manage"), async (c) => {
    const p = c.get("principal");
    const r = row(c.req.param("id"));
    const input = await readJson(c, statusSchema);
    if (input.status === r.status) return c.json({ ok: true, status: r.status });
    db.transaction(() => {
      db.run("UPDATE submission SET status = ?, status_changed_at = ? WHERE id = ?", input.status, nowIso(), r.id);
      recordAudit(db, { actor: actorOf(p), action: "submission.status_changed", target: { type: "submission", id: r.id }, reason: input.reason ?? null, before: { status: r.status }, after: { status: input.status }, requestId: c.get("requestId") });
    });
    return c.json({ ok: true, status: input.status });
  });

  app.post("/submissions/:id/notes", requirePermission(services, "busw.submissions.manage"), async (c) => {
    const r = row(c.req.param("id"));
    const input = await readJson(c, noteSchema);
    const id = randomUUID();
    db.run("INSERT INTO staff_note (id, submission_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)", id, r.id, c.get("principal").userId, input.body, nowIso());
    return c.json({ ok: true, id }, 201);
  });

  app.post("/submissions/:id/quotes", requirePermission(services, "busw.submissions.manage"), async (c) => {
    const p = c.get("principal");
    const r = row(c.req.param("id"));
    const input = await readJson(c, quoteSchema);
    const id = randomUUID();
    db.transaction(() => {
      // The quote is in the currency of the price list the client was shown. It cannot be set to another.
      db.run("INSERT INTO quote (id, submission_id, created_by, title, message, currency, one_time_minor, monthly_minor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", id, r.id, p.userId, input.title, input.message, r.currency, input.oneTimeMinor, input.monthlyMinor, nowIso());
      if (r.status !== "closed" && r.status !== "quoted") db.run("UPDATE submission SET status = 'quoted', status_changed_at = ? WHERE id = ?", nowIso(), r.id);
      recordAudit(db, { actor: actorOf(p), action: "quote.created", target: { type: "submission", id: r.id }, after: { quoteId: id, currency: r.currency, oneTimeMinor: input.oneTimeMinor, monthlyMinor: input.monthlyMinor }, requestId: c.get("requestId") });
    });
    return c.json({ ok: true, id }, 201);
  });

  /**
   * The explicit, audited way a record without an owner gets one. Matching contact emails is never enough:
   * a person with the right permission names the account by its id and gives a reason.
   */
  app.post("/submissions/:id/assign-owner", requirePermission(services, "busw.ownership.assign", { sensitive: true }), async (c: Ctx) => {
    const p = c.get("principal");
    const r = row(c.req.param("id") as string);
    const input = await readJson(c, assignSchema);
    if (r.owner_user_id) return fail(409, "already_owned", "This submission already has an owner.");
    const target = db.get<{ id: string; emailVerified: number }>('SELECT id, emailVerified FROM "user" WHERE id = ?', input.userId);
    if (!target || !target.emailVerified || isSuspended(db, target.id)) return fail(422, "invalid_owner", "That account cannot own this submission.");
    db.transaction(() => {
      db.run("UPDATE submission SET owner_user_id = ?, ownership_status = 'owned' WHERE id = ? AND owner_user_id IS NULL", target.id, r.id);
      db.run("UPDATE asset SET owner_user_id = ? WHERE submission_id = ?", target.id, r.id);
      recordAudit(db, { actor: actorOf(p), action: "submission.owner_assigned", target: { type: "submission", id: r.id }, reason: input.reason, before: { ownerUserId: null, ownershipStatus: r.ownership_status }, after: { ownerUserId: target.id, ownershipStatus: "owned" }, requestId: c.get("requestId") });
    });
    return c.json({ ok: true });
  });

  return app;
}
