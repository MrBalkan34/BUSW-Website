import { referencedAssetIds } from "../model/order";
import { TEMPLATES } from "../templates/templates";
import type { Addons, Asset, ClientDetails, Page, Project, SiteSettings, ThemeSettings, HeaderProps, FooterProps } from "../model/types";
import { ESTIMATE_NOTICE, EXCLUSIONS, TAX_NOTICE } from "../pricing/catalogue";
import { calculateEstimate, type Estimate } from "../pricing/estimate";
import { countryName, type CurrencyCode, type RegionId } from "../pricing/regions";

/** A readable name for a project that did not start from one of the built-in templates. */
export function templateLabel(id: string | null): string | null {
  if (id === null) return null;
  return id === "blank" ? "Blank page" : "Custom design";
}

export const SUBMISSION_SCHEMA = "busw-website-submission/1";

export interface SubmissionAssetRef {
  id: string;
  name: string;
  mime: Asset["mime"];
  width: number;
  height: number;
  bytes: number;
  /** Where the image sits inside the brief package: assets/<id>.<ext>. */
  file: string;
}

export interface PricedLineSnapshot {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  totalMinor: number;
  billing: "one-time" | "monthly";
  source: "included" | "design" | "selection";
}

export interface Submission {
  schema: typeof SUBMISSION_SCHEMA;
  /** Stable across retries of the same submission, so a server can ignore duplicates. */
  submissionId: string;
  projectId: string;
  /** ISO 8601 time the client pressed submit (or downloaded the brief). */
  submittedAt: string;
  /** The client confirmed they understand the price is an estimate. */
  acknowledgedEstimate: boolean;
  client: ClientDetails;
  location: {
    country: string;
    countryName: string;
    region: RegionId;
    currency: CurrencyCode;
    catalogueVersion: string;
  };
  template: { id: string | null; name: string | null };
  design: { site: SiteSettings; theme: ThemeSettings; header: HeaderProps | null; footer: FooterProps | null; pages: Page[] };
  /** References to the images the design uses. The image data travels separately. */
  assets: SubmissionAssetRef[];
  addons: Addons;
  pricing: {
    lines: PricedLineSnapshot[];
    oneTimeTotalMinor: number;
    monthlyTotalMinor: number;
    quoteOnly: { id: string; label: string }[];
    hourlyRateMinor: number | null;
    notices: { estimate: string; tax: string; exclusions: string[] };
  };
}

export interface SubmissionPayload {
  submission: Submission;
  /** data: URL for each referenced asset id. */
  assetData: Record<string, string>;
}

const EXTENSION = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function assetFileName(asset: Pick<Asset, "id" | "mime">): string {
  return `assets/${asset.id}.${EXTENSION[asset.mime]}`;
}

function snapshotLines(estimate: Estimate): PricedLineSnapshot[] {
  return estimate.lines.map(({ id, label, quantity, unit, unitPriceMinor, totalMinor, billing, source }) => ({ id, label, quantity, unit, unitPriceMinor, totalMinor, billing, source }));
}

export interface SnapshotOptions {
  now: Date;
  submissionId: string;
  acknowledgedEstimate: boolean;
}

/** Freezes the design, selections and estimate into one self-contained record. */
export function buildSubmission(project: Project, options: SnapshotOptions): SubmissionPayload {
  const estimate = calculateEstimate(project);
  const region = estimate.region;
  if (!region || project.order.country === null) throw new Error("A country must be selected before a submission can be built.");

  const used = referencedAssetIds(project.pages);
  const assets: SubmissionAssetRef[] = [];
  const assetData: Record<string, string> = {};
  for (const id of used) {
    const asset = project.assets[id];
    if (!asset) continue;
    assets.push({ id, name: asset.name, mime: asset.mime, width: asset.width, height: asset.height, bytes: dataUrlBytes(asset.dataUrl), file: assetFileName(asset) });
    assetData[id] = asset.dataUrl;
  }

  const template = TEMPLATES.find((t) => t.id === project.templateId);
  return {
    submission: {
      schema: SUBMISSION_SCHEMA,
      submissionId: options.submissionId,
      projectId: project.id,
      submittedAt: options.now.toISOString(),
      acknowledgedEstimate: options.acknowledgedEstimate,
      client: project.order.client,
      location: {
        country: project.order.country,
        countryName: countryName(project.order.country),
        region: region.id,
        currency: region.currency,
        catalogueVersion: estimate.catalogueVersion,
      },
      template: { id: project.templateId, name: template?.name ?? templateLabel(project.templateId) },
      design: { site: project.site, theme: project.theme, header: project.header, footer: project.footer, pages: project.pages },
      assets,
      addons: project.order.addons,
      pricing: {
        lines: snapshotLines(estimate),
        oneTimeTotalMinor: estimate.oneTimeTotalMinor,
        monthlyTotalMinor: estimate.monthlyTotalMinor,
        quoteOnly: estimate.quoteOnly.map(({ id, label }) => ({ id, label })),
        hourlyRateMinor: estimate.hourlyRateMinor,
        notices: { estimate: ESTIMATE_NOTICE, tax: TAX_NOTICE, exclusions: [...EXCLUSIONS] },
      },
    },
    assetData,
  };
}

/** Small stable fingerprint of the parts of a submission the client controls (not its time or id). */
export function submissionFingerprint(payload: SubmissionPayload): string {
  const { submittedAt, submissionId, ...stable } = payload.submission;
  void submittedAt;
  void submissionId;
  const text = JSON.stringify(stable) + Object.keys(payload.assetData).sort().join(",");
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
