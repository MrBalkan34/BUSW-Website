import type { QuoteId } from "../model/types";
import type { RegionId } from "./regions";

/** Bump when any price or scope changes. It is recorded on every submission. */
export const CATALOGUE_VERSION = "2026-10.1";

export const ITEM_IDS = [
  "base-website",
  "additional-page",
  "additional-section",
  "custom-page-layout",
  "copywriting-page",
  "image-preparation-batch",
  "photo-gallery",
  "advanced-inquiry-form",
  "booking-integration",
  "blog-cms-setup",
  "extra-language-setup",
  "extra-language-page",
  "analytics-setup",
  "business-email-setup",
  "content-migration-page",
  "extra-revision-round",
  "out-of-scope-hour",
  "managed-hosting-month",
  "website-care-month",
] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export type Billing = "one-time" | "monthly" | "hourly";

export interface CatalogueItem {
  id: ItemId;
  label: string;
  /** What one unit is, shown next to the quantity. */
  unit: string;
  billing: Billing;
  /** What is included in one unit. */
  scope: string;
  /** Integer minor units (cents, kuruş). */
  prices: Record<RegionId, number>;
}

const item = (
  id: ItemId,
  label: string,
  unit: string,
  billing: Billing,
  scope: string,
  us: number,
  tr: number,
  intl: number,
): CatalogueItem => ({ id, label, unit, billing, scope, prices: { us, tr, intl } });

export const CATALOGUE: Record<ItemId, CatalogueItem> = {
  "base-website": item("base-website", "Base website", "website", "one-time", "One template-based page with up to six sections, your text and images, responsive desktop and mobile layouts, one standard contact form, basic page titles and descriptions, deployment to one hosting account, and two consolidated revision rounds. Mobile support, HTTPS, basic accessibility and correction of defects in delivered work are included.", 39900, 1990000, 35900),
  "additional-page": item("additional-page", "Additional page", "page", "one-time", "Up to six sections using the selected design.", 7500, 375000, 6900),
  "additional-section": item("additional-section", "Additional section", "section", "one-time", "A section beyond the six included on each standard page.", 2500, 125000, 2500),
  "custom-page-layout": item("custom-page-layout", "Custom page layout", "page", "one-time", "Replaces the additional-page charge for that page. It is never charged together with it.", 15000, 750000, 13500),
  "copywriting-page": item("copywriting-page", "Copywriting", "page", "one-time", "Up to 500 words per page, with one revision.", 7500, 375000, 6900),
  "image-preparation-batch": item("image-preparation-batch", "Image preparation", "batch", "one-time", "Up to 20 supplied images per batch.", 4000, 200000, 3500),
  "photo-gallery": item("photo-gallery", "Photo gallery", "gallery", "one-time", "Up to 30 supplied images.", 6000, 300000, 5500),
  "advanced-inquiry-form": item("advanced-inquiry-form", "Advanced inquiry form", "form", "one-time", "Up to 12 fields, conditional questions and email delivery. Upgrading the included contact form adds this fee once.", 9000, 450000, 8000),
  "booking-integration": item("booking-integration", "Booking integration", "integration", "one-time", "Configure and embed one existing booking service.", 10000, 500000, 9000),
  "blog-cms-setup": item("blog-cms-setup", "Blog/CMS setup", "setup", "one-time", "One article template and three client-supplied articles.", 20000, 1000000, 18000),
  "extra-language-setup": item("extra-language-setup", "Extra language setup", "language", "one-time", "Setup for each additional language. You supply the translations.", 15000, 750000, 13500),
  "extra-language-page": item("extra-language-page", "Extra language, translated pages", "page per language", "one-time", "Per translated page, for each additional language. You supply the translations.", 4000, 200000, 3500),
  "analytics-setup": item("analytics-setup", "Analytics setup", "setup", "one-time", "One analytics service. Consent tooling is quoted separately if needed.", 6000, 300000, 5500),
  "business-email-setup": item("business-email-setup", "Business email setup", "setup", "one-time", "Configure one mailbox provider.", 4000, 200000, 3500),
  "content-migration-page": item("content-migration-page", "Content migration", "page", "one-time", "Transfer supplied content from an existing site.", 3000, 150000, 2900),
  "extra-revision-round": item("extra-revision-round", "Additional revision round", "round", "one-time", "One consolidated list of changes within the agreed scope.", 6000, 300000, 5500),
  "out-of-scope-hour": item("out-of-scope-hour", "Out-of-scope work", "hour", "hourly", "Work outside the agreed scope. BUSW agrees any hours with you before doing the work.", 4000, 200000, 3500),
  "managed-hosting-month": item("managed-hosting-month", "Managed static-site hosting", "month", "monthly", "Hosting for your finished static site.", 1500, 75000, 1500),
  "website-care-month": item("website-care-month", "Website care including hosting", "month", "monthly", "Hosting plus up to 30 minutes of content edits each month. Unused time does not roll over.", 4900, 245000, 4500),
};

export interface QuoteItem {
  id: QuoteId;
  label: string;
  hint: string;
}

/** Work that is never priced automatically. Requesting it adds no amount to the estimate. */
export const QUOTE_ITEMS: readonly QuoteItem[] = [
  { id: "online-store", label: "Online store", hint: "Selling products or services on the site." },
  { id: "customer-accounts", label: "Customer accounts", hint: "Visitors signing in to a personal area." },
  { id: "payment-system", label: "Payment system", hint: "Taking payments on the site." },
  { id: "custom-database", label: "Custom database", hint: "Storing and managing your own data." },
  { id: "api-integration", label: "API integration", hint: "Connecting the site to another system." },
  { id: "complex-animations", label: "Complex animations", hint: "Animation beyond simple, standard effects." },
  { id: "base-page-custom-layout", label: "Custom redesign of the home page", hint: "A bespoke layout for the first page instead of the template." },
];

/** Stable English wording. It is stored in submissions for BUSW; the interface shows its own translated text. */
export const ESTIMATE_NOTICE = "Estimated price. BUSW confirms scope and price after reviewing your submission, before any work starts.";
export const TAX_NOTICE = "Applicable taxes are not included and are itemized in the final quote.";
export const EXCLUSIONS = [
  "Domain registration",
  "Email subscriptions",
  "Paid plugins",
  "Stock images and other assets",
  "Translation services",
  "Other third-party fees",
] as const;
export const EXCLUSIONS_NOTICE = `Not included, and quoted separately if needed: ${EXCLUSIONS.map((e) => e.toLowerCase()).join(", ")}.`;
