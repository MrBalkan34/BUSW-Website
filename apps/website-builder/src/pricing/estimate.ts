import { INCLUDED_SECTIONS_PER_PAGE, LIMITS, type Project } from "../model/types";
import { CATALOGUE, CATALOGUE_VERSION, QUOTE_ITEMS, type ItemId, type QuoteItem } from "./catalogue";
import { regionForCountry, type Region } from "./regions";

export interface EstimateLine {
  id: ItemId;
  label: string;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  totalMinor: number;
  billing: "one-time" | "monthly";
  /** "design": counted from the pages and sections. "selection": chosen as an add-on. */
  source: "included" | "design" | "selection";
  /** Short explanation of how the quantity was reached. */
  detail: string;
}

export interface Estimate {
  catalogueVersion: string;
  region: Region | null;
  lines: EstimateLine[];
  oneTimeTotalMinor: number;
  monthlyTotalMinor: number;
  /** Quote-only work the client asked for. Its price is NOT in the totals. */
  quoteOnly: QuoteItem[];
  /** Informational hourly rate for out-of-scope work. Never added to the totals. */
  hourlyRateMinor: number | null;
}

export interface DesignCounts {
  pages: number;
  additionalStandardPages: number;
  customLayoutPages: number;
  /** Sections beyond the six included on each page. */
  extraSections: number;
  copywritingPages: number;
}

export function designCounts(project: Project): DesignCounts {
  const additional = project.pages.slice(1);
  const customLayoutPages = additional.filter((p) => p.customLayout).length;
  return {
    pages: project.pages.length,
    additionalStandardPages: additional.length - customLayoutPages,
    customLayoutPages,
    extraSections: project.pages.reduce((sum, p) => sum + Math.max(0, p.sections.length - INCLUDED_SECTIONS_PER_PAGE), 0),
    copywritingPages: project.pages.filter((p) => p.copywriting).length,
  };
}

const quantity = (value: number): number => (Number.isFinite(value) ? Math.min(LIMITS.quantity, Math.max(0, Math.trunc(value))) : 0);

/** Number of translated pages, summed over all additional languages. */
export function translatedPages(project: Project): number {
  const pages = project.pages.length;
  return project.order.addons.languages.reduce((sum, l) => sum + (l.allPages ? pages : Math.min(pages, quantity(l.pageCount))), 0);
}

export function calculateEstimate(project: Project): Estimate {
  const region = regionForCountry(project.order.country);
  const empty: Estimate = {
    catalogueVersion: CATALOGUE_VERSION,
    region,
    lines: [],
    oneTimeTotalMinor: 0,
    monthlyTotalMinor: 0,
    quoteOnly: [],
    hourlyRateMinor: null,
  };
  if (!region) return empty;

  const a = project.order.addons;
  const d = designCounts(project);
  const lines: EstimateLine[] = [];

  const add = (id: ItemId, qty: number, source: EstimateLine["source"], detail: string) => {
    if (qty <= 0) return;
    const entry = CATALOGUE[id];
    const unitPriceMinor = entry.prices[region.id];
    lines.push({
      id,
      label: entry.label,
      quantity: qty,
      unit: entry.unit,
      unitPriceMinor,
      totalMinor: unitPriceMinor * qty,
      billing: entry.billing === "monthly" ? "monthly" : "one-time",
      source,
      detail,
    });
  };

  add("base-website", 1, "included", "Home page with up to six sections");
  add("additional-page", d.additionalStandardPages, "design", "Counted from the pages in your design");
  add("custom-page-layout", d.customLayoutPages, "design", "Replaces the additional-page charge for those pages");
  add("additional-section", d.extraSections, "design", `Sections beyond ${INCLUDED_SECTIONS_PER_PAGE} on a page, counted from your design`);
  add("copywriting-page", d.copywritingPages, "design", "Pages where you asked BUSW to write the text");
  add("image-preparation-batch", quantity(a.imagePrepBatches), "selection", "Batches of up to 20 images");
  add("photo-gallery", quantity(a.photoGalleries), "selection", "Galleries of up to 30 images");
  add("advanced-inquiry-form", a.advancedForm ? 1 : 0, "selection", "Charged once");
  add("booking-integration", a.booking ? 1 : 0, "selection", "One existing booking service");
  add("blog-cms-setup", a.blog ? 1 : 0, "selection", "One article template and three articles");
  add("extra-language-setup", a.languages.length, "selection", "One setup fee for each additional language");
  add("extra-language-page", translatedPages(project), "design", "Pages translated, counted for each additional language");
  add("analytics-setup", a.analytics ? 1 : 0, "selection", "One analytics service");
  add("business-email-setup", a.businessEmail ? 1 : 0, "selection", "One mailbox provider");
  add("content-migration-page", quantity(a.migrationPages), "selection", "Pages moved from your existing site");
  add("extra-revision-round", quantity(a.extraRevisions), "selection", "Beyond the two included rounds");
  if (a.hosting === "hosting") add("managed-hosting-month", 1, "selection", "Billed monthly, optional");
  if (a.hosting === "care") add("website-care-month", 1, "selection", "Billed monthly, includes hosting, optional");

  const sum = (billing: EstimateLine["billing"]) => lines.filter((l) => l.billing === billing).reduce((s, l) => s + l.totalMinor, 0);

  return {
    catalogueVersion: CATALOGUE_VERSION,
    region,
    lines,
    oneTimeTotalMinor: sum("one-time"),
    monthlyTotalMinor: sum("monthly"),
    quoteOnly: QUOTE_ITEMS.filter((q) => a.quoteRequests.includes(q.id)),
    hourlyRateMinor: CATALOGUE["out-of-scope-hour"].prices[region.id],
  };
}
