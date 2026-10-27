import { strToU8, zipSync } from "fflate";
import { escapeHtml } from "../export/exportSite";
import { EXCLUSION_KEYS, fontLabel, itemLabel, itemUnit, paletteLabel, quoteLabel, regionLabel, startingPointLabel } from "../i18n/labels";
import { english, type TranslateFn, type Translator } from "../i18n/translate";
import { pruneAssets } from "../model/reducer";
import type { Addons, Project, QuoteId } from "../model/types";
import { ITEM_IDS, QUOTE_ITEMS, type ItemId } from "../pricing/catalogue";
import { formatMoney, formatTotal } from "../pricing/format";
import { countryName, REGIONS } from "../pricing/regions";
import { assetFileName, type SubmissionPayload } from "./snapshot";

function decode(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const e = escapeHtml;

const isItemId = (id: string): id is ItemId => (ITEM_IDS as readonly string[]).includes(id);
const quoteIds: readonly string[] = QUOTE_ITEMS.map((q) => q.id);

/** The add-ons the client selected, as plain sentences. Shared by the brief and the review screen. */
export function selectionSummary(a: Addons, t: TranslateFn = english.t): string[] {
  return [
    a.advancedForm && itemLabel(t, "advanced-inquiry-form"),
    a.booking && itemLabel(t, "booking-integration"),
    a.blog && itemLabel(t, "blog-cms-setup"),
    a.analytics && itemLabel(t, "analytics-setup"),
    a.businessEmail && itemLabel(t, "business-email-setup"),
    a.photoGalleries > 0 && t("selection.gallery", { count: a.photoGalleries }),
    a.imagePrepBatches > 0 && t("selection.imagePrep", { count: a.imagePrepBatches }),
    a.migrationPages > 0 && t("selection.migration", { count: a.migrationPages }),
    a.extraRevisions > 0 && t("selection.revisions", { count: a.extraRevisions }),
    ...a.languages.map((l) =>
      t("selection.language", { name: l.name || t("selection.languageUnnamed"), scope: l.allPages ? t("selection.allPages") : t("selection.nPages", { count: l.pageCount }) }),
    ),
    a.hosting === "hosting" && t("selection.hostingMonthly"),
    a.hosting === "care" && t("selection.careMonthly"),
  ].filter(Boolean) as string[];
}

/** A readable, printable summary of the submission for BUSW and for the client's own records. */
export function briefHtml(payload: SubmissionPayload, i18n: Translator = english): string {
  const { t } = i18n;
  const s = payload.submission;
  const region = REGIONS[s.location.region];
  const money = (minor: number) => formatMoney(minor, region);
  const sectionCount = (n: number) => t("list.sections", { count: n });
  const oneTime = s.pricing.lines.filter((l) => l.billing === "one-time");
  const monthly = s.pricing.lines.filter((l) => l.billing === "monthly");

  const rows = (lines: typeof oneTime) =>
    lines
      .map((l) => `<tr><td>${e(isItemId(l.id) ? itemLabel(t, l.id) : l.label)}</td><td>${i18n.formatNumber(l.quantity)} ${e(isItemId(l.id) ? itemUnit(t, l.id) : l.unit)}</td><td class="n">${money(l.unitPriceMinor)}</td><td class="n">${money(l.totalMinor)}</td></tr>`)
      .join("");

  const pages = s.design.pages
    .map((p) => `<li><strong>${e(p.title)}</strong> (${e(p.slug)}.html), ${e(sectionCount(p.sections.length))}${p.customLayout ? e(t("brief.customLayoutRequested")) : ""}${p.copywriting ? e(t("brief.copywritingRequested")) : ""}</li>`)
    .join("");

  const selections = selectionSummary(s.addons, t);
  const exclusions = EXCLUSION_KEYS.map((key) => t(`estimate.exclusion.${key}`)).join(", ");

  return `<!doctype html>
<html lang="${i18n.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(t("brief.title", { business: s.client.businessName }))}</title>
<style>
body{font:16px/1.55 system-ui,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;color:#16181d}
h1{font-size:1.6rem}h2{font-size:1.1rem;margin-top:2rem;border-bottom:1px solid #d5d8de;padding-bottom:.25rem}
table{border-collapse:collapse;width:100%}td,th{padding:.35rem .5rem;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}
.n{text-align:right;white-space:nowrap}.notice{background:#fff4e5;border:1px solid #f0c27b;padding:.75rem 1rem;border-radius:6px}
dt{color:#4b5260;font-size:.875rem}dd{margin:0 0 .5rem}
</style></head><body>
<h1>${e(t("brief.h1"))}</h1>
<p class="notice"><strong>${e(t("brief.notice"))}</strong>${e(t("brief.noticeBody", { email: "contact@busoftwareworks.com" }))}</p>

<h2>${e(t("brief.client"))}</h2>
<dl><dt>${e(t("brief.business"))}</dt><dd>${e(s.client.businessName)}</dd><dt>${e(t("brief.contact"))}</dt><dd>${e(s.client.contactName)}</dd><dt>${e(t("brief.email"))}</dt><dd>${e(s.client.email)}</dd>
<dt>${e(t("brief.notes"))}</dt><dd>${s.client.notes.trim() ? e(s.client.notes).replace(/\n/g, "<br>") : e(t("brief.none"))}</dd></dl>

<h2>${e(t("brief.project"))}</h2>
<dl><dt>${e(t("brief.projectId"))}</dt><dd>${e(s.projectId)}</dd><dt>${e(t("brief.created"))}</dt><dd>${e(s.submittedAt)}</dd>
<dt>${e(t("brief.country"))}</dt><dd>${e(countryName(s.location.country, i18n.locale))} (${e(s.location.country)})</dd>
<dt>${e(t("brief.catalogue"))}</dt><dd>${e(t("brief.catalogueValue", { label: regionLabel(t, region.id), currency: s.location.currency, version: s.location.catalogueVersion }))}</dd>
<dt>${e(t("brief.template"))}</dt><dd>${e(startingPointLabel(t, s.template.id))}</dd><dt>${e(t("brief.style"))}</dt><dd>${e(t("review.styleValue", { palette: paletteLabel(t, s.design.theme.palette), font: fontLabel(t, s.design.theme.font) }))}</dd></dl>

<h2>${e(t("brief.pages"))}</h2><ul>${pages}</ul>

<h2>${e(t("brief.addons"))}</h2>${selections.length ? `<ul>${selections.map((x) => `<li>${e(x)}</li>`).join("")}</ul>` : `<p>${e(t("brief.noneSelected"))}</p>`}
${s.pricing.quoteOnly.length ? `<h2>${e(t("brief.quoteRequests"))}</h2><ul>${s.pricing.quoteOnly.map((q) => `<li>${e(quoteIds.includes(q.id) ? quoteLabel(t, q.id as QuoteId) : q.label)}</li>`).join("")}</ul><p><strong>${e(t("brief.quoteNotIncluded"))}</strong>${e(t("brief.quoteSeparately"))}</p>` : ""}

<h2>${e(t("brief.estimate"))}</h2>
<table><thead><tr><th>${e(t("brief.colItem"))}</th><th>${e(t("brief.colQuantity"))}</th><th class="n">${e(t("brief.colUnitPrice"))}</th><th class="n">${e(t("brief.colTotal"))}</th></tr></thead><tbody>${rows(oneTime)}</tbody>
<tfoot><tr><th colspan="3">${e(t("estimate.oneTimeTotal"))}</th><th class="n">${formatTotal(s.pricing.oneTimeTotalMinor, region)}</th></tr></tfoot></table>
${monthly.length ? `<table style="margin-top:1rem"><tbody>${rows(monthly)}</tbody><tfoot><tr><th colspan="3">${e(t("estimate.monthlyTotal"))}</th><th class="n">${formatTotal(s.pricing.monthlyTotalMinor, region)}</th></tr></tfoot></table>` : ""}
<p>${e(t("estimate.notice"))} ${e(t("estimate.tax"))}</p>
<p>${e(t("brief.notIncluded", { list: exclusions }))}</p>
${s.pricing.hourlyRateMinor !== null ? `<p>${e(t("brief.hourly", { rate: money(s.pricing.hourlyRateMinor), currency: s.location.currency }))}</p>` : ""}
<p>${e(t("brief.addonsNote"))}</p>
</body></html>
`;
}

export interface BriefPackage {
  filename: string;
  zip: Uint8Array;
}

/** Everything BUSW needs, in one file: the brief, the machine-readable submission, the design and the images. */
export function buildBriefPackage(project: Project, payload: SubmissionPayload, i18n: Translator = english): BriefPackage {
  const files: Record<string, Uint8Array> = {
    "brief.html": strToU8(briefHtml(payload, i18n)),
    "submission.json": strToU8(JSON.stringify(payload.submission, null, 2)),
    "design.busw-site.json": strToU8(JSON.stringify(pruneAssets(project))),
  };
  for (const ref of payload.submission.assets) {
    const data = payload.assetData[ref.id];
    if (data) files[assetFileName(ref)] = decode(data);
  }
  const slug = payload.submission.client.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "website";
  const date = payload.submission.submittedAt.slice(0, 10);
  return { filename: `busw-brief-${slug}-${date}.zip`, zip: zipSync(files, { level: 6 }) };
}
