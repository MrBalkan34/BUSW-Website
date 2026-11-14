/**
 * The part of the builder that BUSW's submission endpoint (api/submit.js) runs on the server. It is bundled into
 * api/_lib/submission.mjs by tools/build-submission-function.mjs, because the endpoint is deployed without the `apps/`
 * folder and so cannot import this source directly.
 *
 * It trusts nothing the browser claims: the submission is re-validated and the price recalculated here from the same
 * catalogue the builder uses, and the brief that BUSW receives is built from those trusted figures.
 */
import type { Asset, Project } from "../src/model/types";
import { CATALOGUE_VERSION } from "../src/pricing/catalogue";
import { formatTotal } from "../src/pricing/format";
import { countryName } from "../src/pricing/regions";
import { buildBriefPackage } from "../src/submission/brief";
import { buildSubmission } from "../src/submission/snapshot";
import { verifySubmission } from "../src/submission/verify";

/** Lets a test and the endpoint check that this bundle was built from the current catalogue. */
export const catalogueVersion: string = CATALOGUE_VERSION;

export interface ProcessedSubmission {
  ok: true;
  submissionId: string;
  /** The brief as one file: brief.html, submission.json, the importable design and the images. */
  filename: string;
  zip: Uint8Array;
  summary: {
    business: string;
    contact: string;
    email: string;
    country: string;
    currency: string;
    oneTime: string;
    monthly: string;
    pages: number;
    images: number;
    quoteOnly: string[];
  };
  /** Where the browser's figures differed from the recalculation. The recalculated figures are the ones in the brief. */
  discrepancies: string[];
}

export type ProcessResult = ProcessedSubmission | { ok: false; errors: string[] };

interface AssetRef {
  id: string;
  name?: unknown;
  mime: Asset["mime"];
  width?: unknown;
  height?: unknown;
}

export function processSubmission(input: unknown): ProcessResult {
  const verified = verifySubmission(input);
  if (!verified.ok) return verified;
  const { trusted } = verified;

  const { submission, assetData } = input as { submission: { assets: AssetRef[] }; assetData: Record<string, string> };
  const assets: Record<string, Asset> = {};
  for (const ref of submission.assets) {
    const dataUrl = assetData[ref.id];
    if (typeof dataUrl !== "string") continue;
    assets[ref.id] = {
      id: ref.id,
      name: typeof ref.name === "string" ? ref.name.slice(0, 200) : ref.id,
      mime: ref.mime,
      width: typeof ref.width === "number" ? ref.width : 0,
      height: typeof ref.height === "number" ? ref.height : 0,
      dataUrl,
    };
  }

  const project: Project = { ...trusted.project, assets };
  const payload = buildSubmission(project, { now: new Date(trusted.submittedAt), submissionId: trusted.submissionId, acknowledgedEstimate: true });
  const brief = buildBriefPackage(project, payload);
  const { estimate } = trusted;
  const region = estimate.region;
  if (!region) return { ok: false, errors: ["order.country: a valid country is required."] };

  return {
    ok: true,
    submissionId: trusted.submissionId,
    filename: brief.filename,
    zip: brief.zip,
    summary: {
      business: project.order.client.businessName,
      contact: project.order.client.contactName,
      email: project.order.client.email,
      country: countryName(project.order.country ?? ""),
      currency: region.currency,
      oneTime: formatTotal(estimate.oneTimeTotalMinor, region),
      monthly: formatTotal(estimate.monthlyTotalMinor, region),
      pages: project.pages.length,
      images: Object.keys(assets).length,
      quoteOnly: estimate.quoteOnly.map((q) => q.label),
    },
    discrepancies: trusted.discrepancies,
  };
}
