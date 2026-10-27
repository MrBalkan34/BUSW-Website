import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { nowIso, type Db } from "./db";
import type { Services } from "./services";
import { LIMITS, SUBMISSION_SCHEMA, type Estimate, type TrustedSubmission } from "./shared";

export type SubmissionStatus = "received" | "in_review" | "quoted" | "closed";
export const STATUSES: readonly SubmissionStatus[] = ["received", "in_review", "quoted", "closed"];

export interface SubmissionRow {
  id: string;
  reference: string;
  idempotency_key: string;
  owner_user_id: string | null;
  ownership_status: "owned" | "needs_review";
  source: "builder" | "legacy-import";
  submitted_at: string;
  received_at: string;
  status: SubmissionStatus;
  status_changed_at: string;
  locale: string | null;
  currency: string;
  region: string;
  snapshot_json: string;
  estimate_json: string;
  discrepancies_json: string;
  notify_status: "not_attempted" | "sent" | "failed";
}

export interface AssetRow {
  id: string;
  owner_user_id: string | null;
  submission_id: string;
  client_id: string;
  name: string;
  mime: "image/jpeg" | "image/png" | "image/webp";
  bytes: number;
  width: number;
  height: number;
  sha256: string;
  created_at: string;
}

/** A real image of the type it claims, not just a data URL that says so. */
export function matchesMime(bytes: Buffer, mime: string): boolean {
  if (mime === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newReference(db: Db): string {
  for (;;) {
    const bytes = randomBytes(8);
    const code = [...bytes].map((b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]).join("");
    const reference = `BUSW-${code.slice(0, 4)}-${code.slice(4)}`;
    if (!db.get("SELECT 1 AS x FROM submission WHERE reference = ?", reference)) return reference;
  }
}

export interface AssetInput {
  clientId: string;
  name: string;
  mime: AssetRow["mime"];
  width: number;
  height: number;
  bytes: Buffer;
}

export interface StoreInput {
  trusted: TrustedSubmission;
  assets: AssetInput[];
  ownerUserId: string | null;
  source: SubmissionRow["source"];
  locale: string | null;
}

/**
 * Stores a submission and its images. The snapshot is built only from validated data (never the browser's own
 * totals), and database triggers keep it frozen afterwards. Image files are written first and removed again if the
 * database write fails, so nothing is reported as stored that is not.
 */
export function storeSubmission(services: Pick<Services, "db" | "config">, input: StoreInput): SubmissionRow {
  const { db, config } = services;
  const { trusted } = input;
  const id = randomUUID();
  const project = trusted.project;
  const written: string[] = [];
  try {
    const assetRows = input.assets.map((a) => {
      const assetId = randomUUID();
      const path = join(config.assetsDir, assetId);
      mkdirSync(config.assetsDir, { recursive: true });
      writeFileSync(path, a.bytes, { mode: 0o600 });
      written.push(path);
      return { ...a, assetId, sha256: createHash("sha256").update(a.bytes).digest("hex") };
    });

    const snapshot = {
      schema: SUBMISSION_SCHEMA,
      submissionId: trusted.submissionId,
      projectId: trusted.projectId,
      submittedAt: trusted.submittedAt,
      acknowledgedEstimate: true,
      client: project.order.client,
      country: project.order.country,
      template: { id: project.templateId },
      design: { site: project.site, theme: project.theme, header: project.header, footer: project.footer, pages: project.pages },
      addons: project.order.addons,
      assets: assetRows.map((a) => ({ id: a.assetId, clientId: a.clientId, name: a.name, mime: a.mime, bytes: a.bytes.length, width: a.width, height: a.height, sha256: a.sha256 })),
    };
    const region = trusted.estimate.region;
    if (!region) throw new Error("A submission needs a priced region.");
    const now = nowIso();
    const reference = newReference(db);

    db.transaction(() => {
      db.run(
        `INSERT INTO submission (id, reference, idempotency_key, owner_user_id, ownership_status, source, submitted_at, received_at, status, status_changed_at, locale, currency, region, snapshot_json, estimate_json, discrepancies_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?, ?, ?, ?, ?, ?)`,
        id,
        reference,
        trusted.submissionId,
        input.ownerUserId,
        input.ownerUserId ? "owned" : "needs_review",
        input.source,
        trusted.submittedAt,
        now,
        now,
        input.locale,
        region.currency,
        region.id,
        JSON.stringify(snapshot),
        JSON.stringify(trusted.estimate),
        JSON.stringify(trusted.discrepancies),
      );
      for (const a of assetRows) {
        db.run("INSERT INTO asset (id, owner_user_id, submission_id, client_id, name, mime, bytes, width, height, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", a.assetId, input.ownerUserId, id, a.clientId, a.name.slice(0, 120), a.mime, a.bytes.length, a.width, a.height, a.sha256, now);
      }
    });
    return db.get<SubmissionRow>("SELECT * FROM submission WHERE id = ?", id) as SubmissionRow;
  } catch (error) {
    for (const path of written) {
      try {
        unlinkSync(path);
      } catch {
        // Nothing more can be done for a file that is already gone.
      }
    }
    throw error;
  }
}

export const readAssetFile = (services: Pick<Services, "config">, id: string): Buffer => readFileSync(join(services.config.assetsDir, id));

interface QuoteRow {
  id: string;
  title: string;
  message: string;
  currency: string;
  one_time_minor: number;
  monthly_minor: number;
  created_at: string;
}

export const quotesFor = (db: Db, submissionId: string): QuoteRow[] => db.all<QuoteRow>("SELECT id, title, message, currency, one_time_minor, monthly_minor, created_at FROM quote WHERE submission_id = ? ORDER BY created_at, id", submissionId);

const quoteView = (q: QuoteRow) => ({ id: q.id, title: q.title, message: q.message, currency: q.currency, oneTimeMinor: q.one_time_minor, monthlyMinor: q.monthly_minor, createdAt: q.created_at });

type Snapshot = { design: { pages: { title: string; slug: string; sections: unknown[] }[] }; template: { id: string | null }; assets: { id: string; clientId: string; name: string; mime: string; width: number; height: number }[] };

/**
 * What the client sees of their own submission: status, price summary, quotes BUSW addressed to them.
 * Staff notes, discrepancies and anything about staff are never part of this.
 */
export function clientView(db: Db, row: SubmissionRow) {
  const snapshot = JSON.parse(row.snapshot_json) as Snapshot;
  const estimate = JSON.parse(row.estimate_json) as Estimate;
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    submittedAt: row.submitted_at,
    receivedAt: row.received_at,
    statusChangedAt: row.status_changed_at,
    currency: row.currency,
    region: row.region,
    template: snapshot.template.id,
    pages: snapshot.design.pages.map((p) => ({ title: p.title, slug: p.slug, sections: p.sections.length })),
    pricing: {
      oneTimeTotalMinor: estimate.oneTimeTotalMinor,
      monthlyTotalMinor: estimate.monthlyTotalMinor,
      lines: estimate.lines.map((l) => ({ id: l.id, quantity: l.quantity, unitPriceMinor: l.unitPriceMinor, totalMinor: l.totalMinor, billing: l.billing })),
      quoteOnly: estimate.quoteOnly.map((q) => q.id),
    },
    assets: snapshot.assets.map((a) => ({ id: a.id, name: a.name, mime: a.mime, width: a.width, height: a.height })),
    quotes: quotesFor(db, row.id).map(quoteView),
  };
}

export { quoteView, LIMITS };
