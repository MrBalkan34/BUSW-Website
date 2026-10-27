import { describe, expect, it, vi } from "vitest";
import { CATALOGUE, CATALOGUE_VERSION, ITEM_IDS, QUOTE_ITEMS, type ItemId } from "../src/pricing/catalogue";
import { calculateEstimate, designCounts, translatedPages } from "../src/pricing/estimate";
import { formatMoney, formatTotal } from "../src/pricing/format";
import { COUNTRY_CODES, REGIONS, countryName, countryOptions, regionForCountry } from "../src/pricing/regions";
import { INCLUDED_SECTIONS_PER_PAGE, type Project } from "../src/model/types";
import { newId } from "../src/model/ids";
import { newPage, studio, withCountry, withHomeSections, withPages } from "./helpers";

/** The approved prices, transcribed independently of the catalogue, in whole currency units. */
const APPROVED: [ItemId, number, number, number][] = [
  ["base-website", 399, 19900, 359],
  ["additional-page", 75, 3750, 69],
  ["additional-section", 25, 1250, 25],
  ["custom-page-layout", 150, 7500, 135],
  ["copywriting-page", 75, 3750, 69],
  ["image-preparation-batch", 40, 2000, 35],
  ["photo-gallery", 60, 3000, 55],
  ["advanced-inquiry-form", 90, 4500, 80],
  ["booking-integration", 100, 5000, 90],
  ["blog-cms-setup", 200, 10000, 180],
  ["extra-language-setup", 150, 7500, 135],
  ["extra-language-page", 40, 2000, 35],
  ["analytics-setup", 60, 3000, 55],
  ["business-email-setup", 40, 2000, 35],
  ["content-migration-page", 30, 1500, 29],
  ["extra-revision-round", 60, 3000, 55],
  ["out-of-scope-hour", 40, 2000, 35],
  ["managed-hosting-month", 15, 750, 15],
  ["website-care-month", 49, 2450, 45],
];

const priced = (country: string | null, mutate: (p: Project) => Project = (p) => p) => calculateEstimate(mutate(withCountry(studio(), country)));
const withAddons = (p: Project, patch: Partial<Project["order"]["addons"]>): Project => ({ ...p, order: { ...p.order, addons: { ...p.order.addons, ...patch } } });
const lineOf = (e: ReturnType<typeof calculateEstimate>, id: ItemId) => e.lines.find((l) => l.id === id);

describe("price catalogue", () => {
  it("lists exactly the 19 approved items", () => {
    expect([...ITEM_IDS].sort()).toEqual(APPROVED.map((a) => a[0]).sort());
    expect(Object.keys(CATALOGUE)).toHaveLength(19);
  });

  it.each(APPROVED)("%s matches the approved USD, TRY and EUR prices", (id, usd, tr, eur) => {
    expect(CATALOGUE[id].prices).toEqual({ us: usd * 100, tr: tr * 100, intl: eur * 100 });
  });

  it("stores only integer minor units", () => {
    for (const item of Object.values(CATALOGUE)) {
      for (const price of Object.values(item.prices)) expect(Number.isInteger(price) && price > 0).toBe(true);
    }
  });

  it("has a version and describes every item's unit and scope", () => {
    expect(CATALOGUE_VERSION).toMatch(/^\d{4}-\d{2}\.\d+$/);
    for (const item of Object.values(CATALOGUE)) {
      expect(item.unit.length).toBeGreaterThan(0);
      expect(item.scope.length).toBeGreaterThan(10);
    }
  });

  it("marks only hosting and care as monthly and out-of-scope work as hourly", () => {
    const monthly = Object.values(CATALOGUE).filter((i) => i.billing === "monthly").map((i) => i.id);
    expect(monthly.sort()).toEqual(["managed-hosting-month", "website-care-month"]);
    expect(CATALOGUE["out-of-scope-hour"].billing).toBe("hourly");
  });

  it("keeps quote-only work out of the catalogue", () => {
    expect(QUOTE_ITEMS.map((q) => q.id)).toEqual(["online-store", "customer-accounts", "payment-system", "custom-database", "api-integration", "complex-animations", "base-page-custom-layout"]);
    for (const q of QUOTE_ITEMS) expect(Object.keys(CATALOGUE)).not.toContain(q.id);
  });
});

describe("regions", () => {
  it("prices the United States in USD, Türkiye in TRY and every other country in EUR", () => {
    expect(regionForCountry("US")).toBe(REGIONS.us);
    expect(regionForCountry("US")?.currency).toBe("USD");
    expect(regionForCountry("TR")?.currency).toBe("TRY");
    for (const code of COUNTRY_CODES.filter((c) => c !== "US" && c !== "TR")) {
      expect(regionForCountry(code)?.currency, code).toBe("EUR");
    }
  });

  it("returns no region until a valid country is selected", () => {
    expect(regionForCountry(null)).toBeNull();
    expect(regionForCountry("XX")).toBeNull();
    expect(regionForCountry("us")).toBeNull();
    expect(regionForCountry("")).toBeNull();
  });

  it("has all 249 ISO country codes, each with a real name", () => {
    expect(COUNTRY_CODES).toHaveLength(249);
    expect(new Set(COUNTRY_CODES).size).toBe(249);
    for (const code of COUNTRY_CODES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
      expect(countryName(code), code).not.toBe(code);
    }
  });

  it("sorts country options by name and includes the three key countries", () => {
    const options = countryOptions();
    const names = options.map((o) => o.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
    expect(options.find((o) => o.code === "US")?.name).toBe("United States");
    expect(options.find((o) => o.code === "TR")).toBeDefined();
  });

  it("ignores the browser language: only the selected country decides", () => {
    vi.stubGlobal("navigator", { language: "tr-TR", languages: ["tr-TR"] });
    try {
      expect(priced("US").region?.currency).toBe("USD");
      expect(priced("DE").region?.currency).toBe("EUR");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("base price and region switching", () => {
  it.each([
    ["US", 39900, "USD"],
    ["TR", 1990000, "TRY"],
    ["DE", 35900, "EUR"],
    ["JP", 35900, "EUR"],
  ])("a single-page site in %s costs the base price only (%i minor units, %s)", (country, total, currency) => {
    const e = priced(country);
    expect(e.region?.currency).toBe(currency);
    expect(e.lines.map((l) => l.id)).toEqual(["base-website"]);
    expect(e.oneTimeTotalMinor).toBe(total);
    expect(e.monthlyTotalMinor).toBe(0);
  });

  it("returns an empty estimate before a country is chosen", () => {
    const e = priced(null);
    expect(e.region).toBeNull();
    expect(e.lines).toEqual([]);
    expect(e.oneTimeTotalMinor).toBe(0);
    expect(e.hourlyRateMinor).toBeNull();
  });

  it("changing the country changes only the prices, never the design or the quantities", () => {
    const design = withPages(studio(), newPage("A", "a", 8), newPage("B", "b", 2, { customLayout: true }));
    const us = calculateEstimate(withCountry(design, "US"));
    const tr = calculateEstimate(withCountry(design, "TR"));
    const eu = calculateEstimate(withCountry(design, "FR"));
    const shape = (e: typeof us) => e.lines.map((l) => [l.id, l.quantity]);
    expect(shape(tr)).toEqual(shape(us));
    expect(shape(eu)).toEqual(shape(us));
    expect(withCountry(design, "TR").pages).toBe(design.pages);
    expect(tr.oneTimeTotalMinor).not.toBe(us.oneTimeTotalMinor);
  });
});

describe("pages and sections are counted from the design", () => {
  it("charges each additional standard page once and not the home page", () => {
    const project = withPages(studio(), newPage("A", "a"), newPage("B", "b"), newPage("C", "c"));
    const e = calculateEstimate(withCountry(project, "US"));
    expect(lineOf(e, "additional-page")).toMatchObject({ quantity: 3, unitPriceMinor: 7500, totalMinor: 22500, source: "design" });
    expect(e.oneTimeTotalMinor).toBe(39900 + 22500);
  });

  it("includes six sections per page and charges only the sections beyond that", () => {
    const at = (n: number) => calculateEstimate(withCountry(withHomeSections(studio(), n), "US"));
    expect(lineOf(at(1), "additional-section")).toBeUndefined();
    expect(lineOf(at(INCLUDED_SECTIONS_PER_PAGE), "additional-section")).toBeUndefined();
    expect(lineOf(at(7), "additional-section")?.quantity).toBe(1);
    expect(lineOf(at(10), "additional-section")).toMatchObject({ quantity: 4, totalMinor: 10000 });
  });

  it("counts the six included sections separately on every page", () => {
    const project = withHomeSections(withPages(studio(), newPage("A", "a", 6), newPage("B", "b", 8)), 7);
    const counts = designCounts(project);
    expect(counts.extraSections).toBe(1 + 0 + 2);
    expect(lineOf(calculateEstimate(withCountry(project, "US")), "additional-section")?.quantity).toBe(3);
  });

  it("does not count the header or footer as sections", () => {
    const p = withHomeSections(studio(), 6);
    expect(p.header).not.toBeNull();
    expect(p.footer).not.toBeNull();
    expect(lineOf(calculateEstimate(withCountry(p, "US")), "additional-section")).toBeUndefined();
  });
});

describe("custom page layout replaces the additional-page charge", () => {
  it("charges the custom layout instead of, never together with, the standard page", () => {
    const project = withPages(studio(), newPage("Custom", "custom", 3, { customLayout: true }));
    const e = calculateEstimate(withCountry(project, "US"));
    expect(lineOf(e, "additional-page")).toBeUndefined();
    expect(lineOf(e, "custom-page-layout")).toMatchObject({ quantity: 1, totalMinor: 15000 });
    expect(e.oneTimeTotalMinor).toBe(39900 + 15000);
  });

  it("prices a mix of standard and custom pages correctly in every currency", () => {
    const project = withPages(studio(), newPage("A", "a"), newPage("B", "b"), newPage("C", "c", 1, { customLayout: true }));
    expect(calculateEstimate(withCountry(project, "US")).oneTimeTotalMinor).toBe(39900 + 2 * 7500 + 15000);
    expect(calculateEstimate(withCountry(project, "TR")).oneTimeTotalMinor).toBe(1990000 + 2 * 375000 + 750000);
    expect(calculateEstimate(withCountry(project, "GB")).oneTimeTotalMinor).toBe(35900 + 2 * 6900 + 13500);
  });

  it("still charges extra sections on a custom page beyond the six included", () => {
    const project = withPages(studio(), newPage("Custom", "custom", 8, { customLayout: true }));
    expect(lineOf(calculateEstimate(withCountry(project, "US")), "additional-section")?.quantity).toBe(2);
  });

  it("never applies a custom-layout charge to the home page", () => {
    const base = studio();
    const home = { ...base.pages[0]!, customLayout: true };
    const e = calculateEstimate(withCountry({ ...base, pages: [home] }, "US"));
    expect(lineOf(e, "custom-page-layout")).toBeUndefined();
    expect(e.oneTimeTotalMinor).toBe(39900);
  });

  it("treats a custom home-page redesign as a quote request with no price", () => {
    const e = priced("US", (p) => withAddons(p, { quoteRequests: ["base-page-custom-layout"] }));
    expect(e.quoteOnly.map((q) => q.id)).toEqual(["base-page-custom-layout"]);
    expect(e.oneTimeTotalMinor).toBe(39900);
  });
});

describe("copywriting", () => {
  it("charges per page the client asked BUSW to write, including the home page", () => {
    const project = withPages(studio(), newPage("A", "a", 1, { copywriting: true }), newPage("B", "b"));
    const home = { ...project.pages[0]!, copywriting: true };
    const e = calculateEstimate(withCountry({ ...project, pages: [home, ...project.pages.slice(1)] }, "US"));
    expect(lineOf(e, "copywriting-page")).toMatchObject({ quantity: 2, totalMinor: 15000 });
  });
});

describe("additional languages", () => {
  const lang = (name: string, allPages: boolean, pageCount = 0) => ({ id: newId("l"), name, allPages, pageCount });
  const site = (n: number) => withPages(studio(), ...Array.from({ length: n - 1 }, (_, i) => newPage(`P${i}`, `p-${i}`)));
  const calc = (p: Project, languages: ReturnType<typeof lang>[], country = "US") => calculateEstimate(withCountry(withAddons(p, { languages }), country));

  it("charges one setup fee per language plus a fee for each translated page of each language", () => {
    const e = calc(site(3), [lang("German", true), lang("French", true)]);
    expect(lineOf(e, "extra-language-setup")).toMatchObject({ quantity: 2, totalMinor: 30000 });
    expect(lineOf(e, "extra-language-page")).toMatchObject({ quantity: 6, totalMinor: 24000 });
  });

  it("charges only the chosen number of pages when a language does not cover every page", () => {
    const e = calc(site(4), [lang("German", false, 2), lang("French", true)]);
    expect(lineOf(e, "extra-language-page")?.quantity).toBe(2 + 4);
  });

  it("never charges for more pages than the site has", () => {
    expect(translatedPages(withAddons(site(2), { languages: [lang("German", false, 15)] }))).toBe(2);
  });

  it("follows the design when pages are added to an all-pages language", () => {
    const languages = [lang("German", true)];
    expect(translatedPages(withAddons(site(2), { languages }))).toBe(2);
    expect(translatedPages(withAddons(site(5), { languages }))).toBe(5);
  });

  it("charges nothing for languages when none are added", () => {
    const e = calc(site(3), []);
    expect(lineOf(e, "extra-language-setup")).toBeUndefined();
    expect(lineOf(e, "extra-language-page")).toBeUndefined();
  });

  it("uses each currency's own language prices", () => {
    const languages = [lang("German", true)];
    const tr = calc(site(2), languages, "TR");
    expect(tr.lines.filter((l) => l.id.startsWith("extra-language")).reduce((s, l) => s + l.totalMinor, 0)).toBe(750000 + 2 * 200000);
    const eu = calc(site(2), languages, "ES");
    expect(eu.lines.filter((l) => l.id.startsWith("extra-language")).reduce((s, l) => s + l.totalMinor, 0)).toBe(13500 + 2 * 3500);
  });
});

describe("add-ons and quantities", () => {
  it("charges toggled add-ons once", () => {
    const e = priced("US", (p) => withAddons(p, { advancedForm: true, booking: true, blog: true, analytics: true, businessEmail: true }));
    expect(lineOf(e, "advanced-inquiry-form")).toMatchObject({ quantity: 1, totalMinor: 9000 });
    expect(lineOf(e, "booking-integration")?.totalMinor).toBe(10000);
    expect(lineOf(e, "blog-cms-setup")?.totalMinor).toBe(20000);
    expect(lineOf(e, "analytics-setup")?.totalMinor).toBe(6000);
    expect(lineOf(e, "business-email-setup")?.totalMinor).toBe(4000);
  });

  it("multiplies quantity add-ons and shows their units", () => {
    const e = priced("DE", (p) => withAddons(p, { photoGalleries: 2, imagePrepBatches: 3, migrationPages: 5, extraRevisions: 2 }));
    expect(lineOf(e, "photo-gallery")).toMatchObject({ quantity: 2, unit: "gallery", totalMinor: 11000 });
    expect(lineOf(e, "image-preparation-batch")).toMatchObject({ quantity: 3, unit: "batch", totalMinor: 10500 });
    expect(lineOf(e, "content-migration-page")).toMatchObject({ quantity: 5, unit: "page", totalMinor: 14500 });
    expect(lineOf(e, "extra-revision-round")).toMatchObject({ quantity: 2, totalMinor: 11000 });
  });

  it("clamps invalid quantities instead of producing negative or fractional charges", () => {
    const e = priced("US", (p) => withAddons(p, { photoGalleries: -3, imagePrepBatches: 2.9, migrationPages: Number.NaN, extraRevisions: 5000 }));
    expect(lineOf(e, "photo-gallery")).toBeUndefined();
    expect(lineOf(e, "image-preparation-batch")?.quantity).toBe(2);
    expect(lineOf(e, "content-migration-page")).toBeUndefined();
    expect(lineOf(e, "extra-revision-round")?.quantity).toBe(99);
    expect(Number.isInteger(e.oneTimeTotalMinor)).toBe(true);
  });
});

describe("hosting and website care", () => {
  const monthly = (hosting: "none" | "hosting" | "care", country = "US") => calculateEstimate(withCountry(withAddons(studio(), { hosting }), country));

  it("charges nothing monthly by default, and neither is required", () => {
    const e = monthly("none");
    expect(e.monthlyTotalMinor).toBe(0);
    expect(e.lines.some((l) => l.billing === "monthly")).toBe(false);
  });

  it("charges hosting alone or care alone, never both", () => {
    const hosting = monthly("hosting");
    const care = monthly("care");
    expect(hosting.lines.filter((l) => l.billing === "monthly").map((l) => l.id)).toEqual(["managed-hosting-month"]);
    expect(care.lines.filter((l) => l.billing === "monthly").map((l) => l.id)).toEqual(["website-care-month"]);
    expect(hosting.monthlyTotalMinor).toBe(1500);
    expect(care.monthlyTotalMinor).toBe(4900);
  });

  it("uses each currency's monthly prices", () => {
    expect(monthly("hosting", "TR").monthlyTotalMinor).toBe(75000);
    expect(monthly("care", "TR").monthlyTotalMinor).toBe(245000);
    expect(monthly("care", "IT").monthlyTotalMinor).toBe(4500);
  });

  it("keeps monthly charges out of the one-time total", () => {
    const e = monthly("care");
    expect(e.oneTimeTotalMinor).toBe(39900);
    expect(e.monthlyTotalMinor).toBe(4900);
  });
});

describe("quote-only work and informational rates", () => {
  it("lists quote-only requests but adds no price for them", () => {
    const plain = priced("US");
    const quoted = priced("US", (p) => withAddons(p, { quoteRequests: ["online-store", "payment-system", "complex-animations"] }));
    expect(quoted.quoteOnly.map((q) => q.id)).toEqual(["online-store", "payment-system", "complex-animations"]);
    expect(quoted.oneTimeTotalMinor).toBe(plain.oneTimeTotalMinor);
    expect(quoted.lines).toEqual(plain.lines);
  });

  it("exposes the out-of-scope hourly rate for display but never adds hours to the total", () => {
    for (const [country, rate] of [["US", 4000], ["TR", 200000], ["BR", 3500]] as const) {
      const e = priced(country);
      expect(e.hourlyRateMinor).toBe(rate);
      expect(e.lines.some((l) => l.id === "out-of-scope-hour")).toBe(false);
    }
  });
});

describe("worked example", () => {
  const project = (): Project => {
    const base = withHomeSections(studio(), 8);
    return withAddons(
      withPages(
        { ...base, pages: [{ ...base.pages[0]!, copywriting: true }] },
        newPage("Services", "services", 7, { copywriting: true }),
        newPage("About", "about", 2),
        newPage("Special", "special", 6, { customLayout: true }),
      ),
      { languages: [{ id: "l1", name: "German", allPages: true, pageCount: 0 }], photoGalleries: 1, imagePrepBatches: 2, booking: true, extraRevisions: 2, hosting: "care" },
    );
  };

  it.each([
    ["US", 159400, 4900],
    ["TR", 7965000, 245000],
    ["NL", 144500, 4500],
  ])("totals correctly in %s (hand-calculated)", (country, oneTime, monthly) => {
    const e = calculateEstimate(withCountry(project(), country));
    expect(e.oneTimeTotalMinor).toBe(oneTime);
    expect(e.monthlyTotalMinor).toBe(monthly);
    expect(e.lines.filter((l) => l.billing === "one-time").reduce((s, l) => s + l.totalMinor, 0)).toBe(oneTime);
  });
});

describe("formatting", () => {
  it("formats whole amounts without decimals and fractional ones with two", () => {
    expect(formatMoney(39900, REGIONS.us)).toBe("$399");
    expect(formatMoney(35950, REGIONS.intl)).toBe("€359.50");
    expect(formatMoney(1990000, REGIONS.tr)).toContain("19.900");
    expect(formatMoney(1990000, REGIONS.tr)).toContain("₺");
  });

  it("shows the currency code beside totals", () => {
    expect(formatTotal(39900, REGIONS.us)).toBe("$399 USD");
    expect(formatTotal(35900, REGIONS.intl)).toBe("€359 EUR");
    expect(formatTotal(1990000, REGIONS.tr)).toMatch(/TRY$/);
  });

  it("formats with the region's own locale, not the browser's", () => {
    vi.stubGlobal("navigator", { language: "de-DE" });
    try {
      expect(formatMoney(123456, REGIONS.us)).toBe("$1,234.56");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
