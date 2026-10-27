/**
 * Server-side checks for a submission. This module deliberately has no DOM or React
 * dependency so it can run unchanged in a Node function.
 *
 * Contract: the browser's prices are never trusted. Everything the server stores or quotes comes from
 * `trusted`, which is recalculated here from the design and selections using the server's own catalogue.
 */
import { referencedAssetIds } from "../model/order";
import { LIMITS, PROJECT_VERSION, type Project } from "../model/types";
import { parseProject } from "../model/validate";
import { calculateEstimate, type Estimate } from "../pricing/estimate";
import { regionForCountry } from "../pricing/regions";
import { validateClient } from "./clientDetails";
import { SUBMISSION_SCHEMA, dataUrlBytes } from "./snapshot";

export interface TrustedSubmission {
  submissionId: string;
  projectId: string;
  submittedAt: string;
  /** The design and selections, validated. Asset data is not included. */
  project: Project;
  /** Prices recalculated from the server's catalogue. These are the only prices to store or quote. */
  estimate: Estimate;
  /** Where the browser's figures differed from the recalculation. Informational: the trusted figures win. */
  discrepancies: string[];
}

export type VerifyResult = { ok: true; trusted: TrustedSubmission } | { ok: false; errors: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const MIMES = ["image/jpeg", "image/png", "image/webp"];
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

export function verifySubmission(input: unknown): VerifyResult {
  if (!isRecord(input) || !isRecord(input.submission)) return { ok: false, errors: ["The request must contain a submission object."] };
  const s = input.submission;
  const errors: string[] = [];

  if (s.schema !== SUBMISSION_SCHEMA) errors.push(`Unsupported schema. Expected ${SUBMISSION_SCHEMA}.`);
  for (const key of ["submissionId", "projectId"] as const) {
    if (typeof s[key] !== "string" || s[key] === "" || (s[key] as string).length > 80) errors.push(`${key} is missing or invalid.`);
  }
  const submittedAt = typeof s.submittedAt === "string" ? Date.parse(s.submittedAt) : Number.NaN;
  if (Number.isNaN(submittedAt)) errors.push("submittedAt is not a valid date.");
  if (s.acknowledgedEstimate !== true) errors.push("The client must confirm they understand the price is an estimate.");

  const location = isRecord(s.location) ? s.location : {};
  const design = isRecord(s.design) ? s.design : null;
  const client = isRecord(s.client) ? s.client : null;
  const template = isRecord(s.template) ? s.template : {};
  if (!design) errors.push("design is missing.");
  if (!client) errors.push("client is missing.");
  if (!isRecord(s.addons)) errors.push("addons is missing.");
  if (!Array.isArray(s.assets)) errors.push("assets is missing.");
  if (errors.length > 0 || !design || !client) return { ok: false, errors };

  // Rebuild a project from the submission and run it through the same strict validator as an opened file.
  const candidate = {
    ...design,
    version: PROJECT_VERSION,
    id: s.projectId,
    templateId: typeof template.id === "string" ? template.id : null,
    assets: {},
    order: { country: location.country ?? null, addons: s.addons, client },
  };
  const parsed = parseProject(candidate);
  if (!parsed.ok) return { ok: false, errors: [parsed.error] };
  const project = parsed.project;

  const region = regionForCountry(project.order.country);
  if (!region) errors.push("order.country: a valid country is required.");

  const clientErrors = validateClient(project.order.client);
  for (const message of Object.values(clientErrors)) errors.push(message);

  // Every image the design uses must be listed, with data that is a real, bounded image.
  const refs = s.assets as unknown[];
  if (refs.length > LIMITS.assets) errors.push(`More than ${LIMITS.assets} images.`);
  const listed = new Set<string>();
  for (const ref of refs) {
    if (!isRecord(ref) || typeof ref.id !== "string" || !MIMES.includes(String(ref.mime))) {
      errors.push("An asset reference is malformed.");
      continue;
    }
    listed.add(ref.id);
  }
  const assetData = isRecord(input.assetData) ? input.assetData : {};
  for (const id of referencedAssetIds(project.pages)) {
    if (!listed.has(id)) errors.push(`The design uses image ${id}, which is not listed in assets.`);
  }
  for (const id of listed) {
    const data = assetData[id];
    if (typeof data !== "string" || !DATA_URL.test(data)) errors.push(`Image ${id} is missing or is not a supported image.`);
    else if (dataUrlBytes(data) > LIMITS.assetBytes) errors.push(`Image ${id} is larger than ${LIMITS.assetBytes / 1_000_000} MB.`);
  }

  if (errors.length > 0) return { ok: false, errors };

  const estimate = calculateEstimate(project);
  const pricing = isRecord(s.pricing) ? s.pricing : {};
  const discrepancies: string[] = [];
  if (location.currency !== region?.currency) discrepancies.push(`Currency: browser said ${String(location.currency)}, catalogue says ${region?.currency}.`);
  if (location.region !== region?.id) discrepancies.push(`Region: browser said ${String(location.region)}, catalogue says ${region?.id}.`);
  if (location.catalogueVersion !== estimate.catalogueVersion) discrepancies.push(`Catalogue version: browser used ${String(location.catalogueVersion)}, server uses ${estimate.catalogueVersion}.`);
  if (pricing.oneTimeTotalMinor !== estimate.oneTimeTotalMinor) discrepancies.push(`One-time total: browser said ${String(pricing.oneTimeTotalMinor)}, recalculated ${estimate.oneTimeTotalMinor}.`);
  if (pricing.monthlyTotalMinor !== estimate.monthlyTotalMinor) discrepancies.push(`Monthly total: browser said ${String(pricing.monthlyTotalMinor)}, recalculated ${estimate.monthlyTotalMinor}.`);

  return {
    ok: true,
    trusted: {
      submissionId: s.submissionId as string,
      projectId: s.projectId as string,
      submittedAt: new Date(submittedAt).toISOString(),
      project,
      estimate,
      discrepancies,
    },
  };
}
