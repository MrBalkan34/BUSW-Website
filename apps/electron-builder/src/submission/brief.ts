import { strToU8, zipSync } from "fflate";
import { EXCLUSION_KEYS, itemLabel, itemUnit, quoteLabel, regionLabel } from "../i18n/labels";
import { english, type Translator } from "../i18n/translate";
import type { Draft } from "../model/draft";
import { CATALOGUE_VERSION, ITEM_IDS, QUOTE_IDS, type ItemId, type QuoteId } from "../pricing/catalogue";
import { calculateEstimate, type Estimate } from "../pricing/estimate";
import { countryName, formatMoney, formatTotal, REGIONS } from "../pricing/shared";

export const CONTACT_EMAIL = "contact@busoftwareworks.com";

const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const e = escapeHtml;

const isItemId = (id: string): id is ItemId => (ITEM_IDS as readonly string[]).includes(id);
const isQuoteId = (id: string): id is QuoteId => (QUOTE_IDS as readonly string[]).includes(id);

/** The machine-readable request. Prices are integer minor units; wording stays in stable English. */
export interface Submission {
  format: 1;
  product: "busw-electron-app-builder";
  catalogueVersion: string;
  catalogueStatus: "draft";
  /** Nothing in this file has been sent anywhere. */
  delivery: "downloaded-brief-not-sent";
  createdAt: string;
  interfaceLanguage: string;
  location: { country: string; region: string; currency: string };
  client: Draft["client"];
  app: Draft["app"];
  order: Draft["order"];
  pricing: {
    oneTimeTotalMinor: number;
    monthlyTotalMinor: number;
    /** Planning hours behind the one-time total. For BUSW only. */
    oneTimeHours: number;
    hourlyRateMinor: number | null;
    lines: { id: string; label: string; quantity: number; unit: string; unitPriceMinor: number; totalMinor: number; hours: number; billing: string }[];
    quoteOnly: { id: string; label: string }[];
    issues: { code: string; message: string }[];
  };
}

export function buildSubmission(draft: Draft, now: Date, locale: string): Submission | null {
  const estimate = calculateEstimate(draft.order);
  const { region } = estimate;
  if (!region || draft.order.country === null) return null;
  return {
    format: 1,
    product: "busw-electron-app-builder",
    catalogueVersion: CATALOGUE_VERSION,
    catalogueStatus: "draft",
    delivery: "downloaded-brief-not-sent",
    createdAt: now.toISOString(),
    interfaceLanguage: locale,
    location: { country: draft.order.country, region: region.id, currency: region.currency },
    client: draft.client,
    app: draft.app,
    order: draft.order,
    pricing: {
      oneTimeTotalMinor: estimate.oneTimeTotalMinor,
      monthlyTotalMinor: estimate.monthlyTotalMinor,
      oneTimeHours: estimate.oneTimeHours,
      hourlyRateMinor: estimate.hourlyRateMinor,
      lines: estimate.lines.map((l) => ({ id: l.id, label: l.label, quantity: l.quantity, unit: l.unit, unitPriceMinor: l.unitPriceMinor, totalMinor: l.totalMinor, hours: l.hours, billing: l.billing })),
      quoteOnly: estimate.quoteOnly.map((q) => ({ id: q.id, label: q.label })),
      issues: estimate.issues.map((i) => ({ code: i.code, message: i.message })),
    },
  };
}

/** The platforms ordered, as words: the base Windows build plus whatever was added. */
export function platformSummary(draft: Draft, i18n: Translator = english): string {
  const { t } = i18n;
  const p = draft.order.platforms;
  return [t("release.windowsIncluded"), p.macos && itemLabel(t, "platform-macos"), p.linux && itemLabel(t, "platform-linux"), p.windowsArm64 && itemLabel(t, "platform-windows-arm64")].filter(Boolean).join(", ");
}

export function signingSummary(draft: Draft, i18n: Translator = english): string {
  const { t } = i18n;
  const s = draft.order.signing;
  const parts = [s.windows && t("release.signingWindows"), s.macos && draft.order.platforms.macos && t("release.signingMacos")].filter(Boolean);
  return parts.length ? parts.join(", ") : t("review.none");
}

/** A readable, printable summary of the request for BUSW and for the client's own records. */
export function briefHtml(draft: Draft, estimate: Estimate, createdAt: string, i18n: Translator = english): string {
  const { t } = i18n;
  const region = estimate.region ?? REGIONS.intl;
  const money = (minor: number) => formatMoney(minor, region);
  const oneTime = estimate.lines.filter((l) => l.billing === "one-time");
  const monthly = estimate.lines.filter((l) => l.billing === "monthly");
  const exclusions = EXCLUSION_KEYS.map((key) => t(`estimate.exclusion.${key}`)).join(", ");
  const country = draft.order.country ?? "";

  const rows = (lines: typeof oneTime) =>
    lines
      .map((l) => `<tr><td>${e(isItemId(l.id) ? itemLabel(t, l.id) : l.label)}</td><td>${i18n.formatNumber(l.quantity)} ${e(isItemId(l.id) ? itemUnit(t, l.id) : l.unit)}</td><td class="n">${money(l.unitPriceMinor)}</td><td class="n">${money(l.totalMinor)}</td></tr>`)
      .join("");

  return `<!doctype html>
<html lang="${i18n.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(t("brief.title", { business: draft.client.businessName }))}</title>
<style>
body{font:16px/1.55 system-ui,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;color:#16181d}
h1{font-size:1.6rem}h2{font-size:1.1rem;margin-top:2rem;border-bottom:1px solid #d5d8de;padding-bottom:.25rem}
table{border-collapse:collapse;width:100%}td,th{padding:.35rem .5rem;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}
.n{text-align:right;white-space:nowrap}.notice{background:#fff4e5;border:1px solid #f0c27b;padding:.75rem 1rem;border-radius:6px}
dt{color:#4b5260;font-size:.875rem}dd{margin:0 0 .5rem}
</style></head><body>
<h1>${e(t("brief.h1"))}</h1>
<p class="notice"><strong>${e(t("brief.notice"))}</strong>${e(t("brief.noticeBody", { email: CONTACT_EMAIL }))}</p>
<p class="notice">${e(t("brief.draft"))}</p>

<h2>${e(t("brief.client"))}</h2>
<dl><dt>${e(t("brief.business"))}</dt><dd>${e(draft.client.businessName)}</dd><dt>${e(t("brief.contact"))}</dt><dd>${e(draft.client.contactName)}</dd><dt>${e(t("brief.email"))}</dt><dd>${e(draft.client.email)}</dd>
<dt>${e(t("brief.notes"))}</dt><dd>${draft.client.notes.trim() ? e(draft.client.notes).replace(/\n/g, "<br>") : e(t("brief.none"))}</dd></dl>

<h2>${e(t("brief.app"))}</h2>
<dl><dt>${e(t("brief.appName"))}</dt><dd>${e(draft.app.name)}</dd><dt>${e(t("brief.purpose"))}</dt><dd>${draft.app.purpose.trim() ? e(draft.app.purpose).replace(/\n/g, "<br>") : e(t("brief.none"))}</dd>
<dt>${e(t("brief.platforms"))}</dt><dd>${e(platformSummary(draft, i18n))}</dd><dt>${e(t("brief.signing"))}</dt><dd>${e(signingSummary(draft, i18n))}</dd></dl>

<h2>${e(t("brief.project"))}</h2>
<dl><dt>${e(t("brief.created"))}</dt><dd>${e(createdAt)}</dd>
<dt>${e(t("brief.country"))}</dt><dd>${e(countryName(country, i18n.locale))} (${e(country)})</dd>
<dt>${e(t("brief.catalogue"))}</dt><dd>${e(t("brief.catalogueValue", { label: regionLabel(t, region.id), currency: region.currency, version: estimate.catalogueVersion }))}</dd></dl>

${estimate.quoteOnly.length ? `<h2>${e(t("brief.quoteRequests"))}</h2><ul>${estimate.quoteOnly.map((q) => `<li>${e(isQuoteId(q.id) ? quoteLabel(t, q.id) : q.label)}</li>`).join("")}</ul><p><strong>${e(t("brief.quoteNotIncluded"))}</strong>${e(t("brief.quoteSeparately"))}</p>` : ""}
${estimate.issues.length ? `<h2>${e(t("brief.issues"))}</h2><ul>${estimate.issues.map((i) => `<li>${e(t(`release.issue.${i.code}`))}</li>`).join("")}</ul>` : ""}

<h2>${e(t("brief.estimate"))}</h2>
<table><thead><tr><th>${e(t("brief.colItem"))}</th><th>${e(t("brief.colQuantity"))}</th><th class="n">${e(t("brief.colUnitPrice"))}</th><th class="n">${e(t("brief.colTotal"))}</th></tr></thead><tbody>${rows(oneTime)}</tbody>
<tfoot><tr><th colspan="3">${e(t("estimate.oneTimeTotal"))}</th><th class="n">${formatTotal(estimate.oneTimeTotalMinor, region)}</th></tr></tfoot></table>
${monthly.length ? `<table style="margin-top:1rem"><tbody>${rows(monthly)}</tbody><tfoot><tr><th colspan="3">${e(t("estimate.monthlyTotal"))}</th><th class="n">${formatTotal(estimate.monthlyTotalMinor, region)}</th></tr></tfoot></table>` : ""}
<p>${e(t("estimate.notice"))} ${e(t("estimate.tax"))}</p>
<p>${e(t("brief.notIncluded", { list: exclusions }))}</p>
${estimate.hourlyRateMinor !== null ? `<p>${e(t("brief.hourly", { rate: money(estimate.hourlyRateMinor), currency: region.currency }))}</p>` : ""}
</body></html>
`;
}

export interface BriefPackage {
  filename: string;
  zip: Uint8Array;
}

/** Folds Turkish and other accented letters to plain ones, so "Örnek Ağ" becomes "ornek-ag", not "rnek-a". */
export function fileSlug(text: string): string {
  const folded = text
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  return folded.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

/** Everything BUSW needs, in one file: the readable brief and the machine-readable request. */
export function buildBriefPackage(draft: Draft, now: Date, i18n: Translator = english): BriefPackage | null {
  const submission = buildSubmission(draft, now, i18n.locale);
  if (!submission) return null;
  const estimate = calculateEstimate(draft.order);
  const files: Record<string, Uint8Array> = {
    "brief.html": strToU8(briefHtml(draft, estimate, submission.createdAt, i18n)),
    "request.json": strToU8(JSON.stringify(submission, null, 2)),
  };
  const slug = fileSlug(draft.client.businessName) || "electron-app";
  return { filename: `busw-electron-brief-${slug}-${submission.createdAt.slice(0, 10)}.zip`, zip: zipSync(files, { level: 6 }) };
}
