import { describe, expect, it } from "vitest";
import { CATALOGUE, CATALOGUE_VERSION, HOURLY_RATE, ITEM_IDS, QUOTE_ITEMS, type ItemId, type QuoteId } from "../src/pricing/catalogue";
import { calculateEstimate, careablePlatforms, emptyOrder, type ElectronOrder } from "../src/pricing/estimate";
import { COUNTRY_CODES, REGIONS, formatMoney } from "../src/pricing/shared";
import { CATALOGUE as WEBSITE_CATALOGUE } from "../../website-builder/src/pricing/catalogue";

/** The draft catalogue, transcribed independently of the code, in whole currency units: id, hours, USD, TRY, EUR. */
const DRAFT: [ItemId, number, number, number, number][] = [
  ["base-desktop-app", 30, 1199, 59900, 1049],
  ["additional-screen", 4, 160, 8000, 140],
  ["custom-screen-design", 3, 120, 6000, 105],
  ["native-integration", 3, 120, 6000, 105],
  ["local-database", 8, 320, 16000, 280],
  ["rest-api-integration", 6, 240, 12000, 210],
  ["platform-macos", 10, 400, 20000, 350],
  ["platform-linux", 6, 240, 12000, 210],
  ["platform-windows-arm64", 2, 80, 4000, 70],
  ["code-signing-setup", 3, 120, 6000, 105],
  ["auto-update-setup", 6, 240, 12000, 210],
  ["ci-release-pipeline", 5, 200, 10000, 175],
  ["error-reporting-setup", 3, 120, 6000, 105],
  ["extra-language-setup", 3, 120, 6000, 105],
  ["user-guide", 4, 160, 8000, 140],
  ["extra-revision-round", 2, 80, 4000, 70],
  ["out-of-scope-hour", 1, 40, 2000, 35],
  ["app-care-month", 3, 120, 6000, 105],
  ["app-care-extra-platform-month", 1, 40, 2000, 35],
];

const order = (country: string | null, patch: Partial<ElectronOrder> = {}): ElectronOrder => ({ ...emptyOrder(country), ...patch });
const lineOf = (e: ReturnType<typeof calculateEstimate>, id: ItemId) => e.lines.find((l) => l.id === id);

describe("draft catalogue", () => {
  it("is marked as a draft with the agreed version", () => {
    expect(CATALOGUE_VERSION).toBe("electron-2026-11.0-draft");
  });

  it("lists exactly the 19 catalogued items", () => {
    expect([...ITEM_IDS].sort()).toEqual(DRAFT.map((d) => d[0]).sort());
    expect(Object.keys(CATALOGUE)).toHaveLength(19);
  });

  it.each(DRAFT)("%s has %i hours and matches the USD, TRY and EUR prices", (id, hours, usd, tr, eur) => {
    expect(CATALOGUE[id].hours).toBe(hours);
    expect(CATALOGUE[id].prices).toEqual({ us: usd * 100, tr: tr * 100, intl: eur * 100 });
  });

  it("prices every add-on at exactly hours × the hourly rate; only the base is rounded", () => {
    for (const item of Object.values(CATALOGUE)) {
      if (item.id === "base-desktop-app") continue;
      for (const region of ["us", "tr", "intl"] as const) expect(item.prices[region], `${item.id} ${region}`).toBe(item.hours * HOURLY_RATE[region]);
    }
    const base = CATALOGUE["base-desktop-app"];
    expect(base.prices.us).toBeLessThan(base.hours * HOURLY_RATE.us);
    expect(base.prices.us / 100).toBe(1199);
  });

  it("uses the Website Builder's hourly rate, so one rate serves both products", () => {
    expect(CATALOGUE["out-of-scope-hour"].prices).toEqual(WEBSITE_CATALOGUE["out-of-scope-hour"].prices);
    expect(HOURLY_RATE).toEqual(WEBSITE_CATALOGUE["out-of-scope-hour"].prices);
  });

  it("keeps the regional ratios of the Website Builder: TRY = 50 × USD, EUR = 0.875 × USD on the hourly rate", () => {
    expect(HOURLY_RATE.tr).toBe(50 * HOURLY_RATE.us);
    expect(HOURLY_RATE.intl).toBe(0.875 * HOURLY_RATE.us);
  });

  it("stores only integer minor units and describes every item", () => {
    for (const item of Object.values(CATALOGUE)) {
      for (const price of Object.values(item.prices)) expect(Number.isInteger(price) && price > 0).toBe(true);
      expect(item.unit.length).toBeGreaterThan(0);
      expect(item.scope.length).toBeGreaterThan(10);
      expect(item.hours).toBeGreaterThan(0);
    }
  });

  it("marks only the two care plans as monthly and out-of-scope work as hourly", () => {
    const monthly = Object.values(CATALOGUE).filter((i) => i.billing === "monthly").map((i) => i.id);
    expect(monthly.sort()).toEqual(["app-care-extra-platform-month", "app-care-month"]);
    expect(CATALOGUE["out-of-scope-hour"].billing).toBe("hourly");
  });

  it("has the same item shape as the Website Builder so one estimator can serve both", () => {
    const keys = (o: object) => Object.keys(o).filter((k) => k !== "hours").sort();
    expect(keys(CATALOGUE["base-desktop-app"])).toEqual(keys(WEBSITE_CATALOGUE["base-website"]));
    expect(Object.keys(CATALOGUE["base-desktop-app"].prices).sort()).toEqual(Object.keys(WEBSITE_CATALOGUE["base-website"].prices).sort());
  });

  it("keeps the eight quote-only kinds out of the catalogue", () => {
    const expected: QuoteId[] = ["store-submission", "native-addons-hardware", "accounts-backend-sync", "payments-licensing", "offline-first-sync", "background-services-kiosk", "enterprise-deployment", "migrate-existing-app"];
    expect(QUOTE_ITEMS.map((q) => q.id)).toEqual(expected);
    for (const q of QUOTE_ITEMS) expect(Object.keys(CATALOGUE)).not.toContain(q.id);
  });
});

describe("base app and regions", () => {
  it.each([
    ["US", 119900, "USD"],
    ["TR", 5990000, "TRY"],
    ["DE", 104900, "EUR"],
    ["JP", 104900, "EUR"],
  ])("a base app in %s costs the base price only (%i minor units, %s)", (country, total, currency) => {
    const e = calculateEstimate(order(country));
    expect(e.region?.currency).toBe(currency);
    expect(e.lines.map((l) => l.id)).toEqual(["base-desktop-app"]);
    expect(e.oneTimeTotalMinor).toBe(total);
    expect(e.monthlyTotalMinor).toBe(0);
    expect(e.oneTimeHours).toBe(30);
  });

  it("prices every country, with US in USD, Türkiye in TRY and the rest in EUR", () => {
    for (const code of COUNTRY_CODES) {
      const e = calculateEstimate(order(code));
      expect(e.region?.currency, code).toBe(code === "US" ? "USD" : code === "TR" ? "TRY" : "EUR");
    }
  });

  it("returns an empty estimate until a valid country is chosen", () => {
    for (const country of [null, "XX", "us", ""]) {
      const e = calculateEstimate(order(country, { localDatabase: true }));
      expect(e.region).toBeNull();
      expect(e.lines).toEqual([]);
      expect(e.oneTimeTotalMinor).toBe(0);
      expect(e.hourlyRateMinor).toBeNull();
    }
  });

  it("changing the country changes only the prices, never the lines or quantities", () => {
    const o = order("US", { extraScreens: 3, localDatabase: true, platforms: { macos: true, linux: false, windowsArm64: false }, care: true });
    const shape = (e: ReturnType<typeof calculateEstimate>) => e.lines.map((l) => [l.id, l.quantity]);
    const us = calculateEstimate(o);
    expect(shape(calculateEstimate({ ...o, country: "TR" }))).toEqual(shape(us));
    expect(shape(calculateEstimate({ ...o, country: "FR" }))).toEqual(shape(us));
  });
});

describe("add-ons", () => {
  it("multiplies quantity add-ons by their unit price", () => {
    const e = calculateEstimate(order("DE", { extraScreens: 3, customScreenDesigns: 2, nativeIntegrations: 4, restApis: 2, extraLanguages: 2, userGuides: 1, extraRevisions: 2 }));
    expect(lineOf(e, "additional-screen")).toMatchObject({ quantity: 3, totalMinor: 42000, hours: 12 });
    expect(lineOf(e, "custom-screen-design")).toMatchObject({ quantity: 2, totalMinor: 21000 });
    expect(lineOf(e, "native-integration")).toMatchObject({ quantity: 4, totalMinor: 42000 });
    expect(lineOf(e, "rest-api-integration")).toMatchObject({ quantity: 2, totalMinor: 42000 });
    expect(lineOf(e, "extra-language-setup")).toMatchObject({ quantity: 2, totalMinor: 21000 });
    expect(lineOf(e, "user-guide")).toMatchObject({ quantity: 1, totalMinor: 14000 });
    expect(lineOf(e, "extra-revision-round")).toMatchObject({ quantity: 2, totalMinor: 14000 });
  });

  it("charges switched-on add-ons once", () => {
    const e = calculateEstimate(order("US", { localDatabase: true, autoUpdate: true, ciPipeline: true, errorReporting: true }));
    expect(lineOf(e, "local-database")).toMatchObject({ quantity: 1, totalMinor: 32000 });
    expect(lineOf(e, "auto-update-setup")?.totalMinor).toBe(24000);
    expect(lineOf(e, "ci-release-pipeline")?.totalMinor).toBe(20000);
    expect(lineOf(e, "error-reporting-setup")?.totalMinor).toBe(12000);
  });

  it("clamps invalid quantities instead of producing negative or fractional charges", () => {
    const e = calculateEstimate(order("US", { extraScreens: -3, customScreenDesigns: 2.9, nativeIntegrations: Number.NaN, restApis: 5000, extraRevisions: Number.POSITIVE_INFINITY }));
    expect(lineOf(e, "additional-screen")).toBeUndefined();
    expect(lineOf(e, "custom-screen-design")?.quantity).toBe(2);
    expect(lineOf(e, "native-integration")).toBeUndefined();
    expect(lineOf(e, "rest-api-integration")?.quantity).toBe(99);
    expect(lineOf(e, "extra-revision-round")).toBeUndefined();
    expect(Number.isInteger(e.oneTimeTotalMinor)).toBe(true);
  });

  it("adds a platform build only when it is ordered", () => {
    const e = calculateEstimate(order("US", { platforms: { macos: true, linux: true, windowsArm64: true } }));
    expect(e.lines.map((l) => l.id)).toEqual(["base-desktop-app", "platform-macos", "platform-linux", "platform-windows-arm64"]);
    expect(e.oneTimeTotalMinor).toBe(119900 + 40000 + 24000 + 8000);
  });
});

describe("code signing, auto-update and their dependencies", () => {
  it("charges signing once for each operating system", () => {
    const both = calculateEstimate(order("US", { platforms: { macos: true, linux: false, windowsArm64: false }, signing: { windows: true, macos: true } }));
    expect(lineOf(both, "code-signing-setup")).toMatchObject({ quantity: 2, totalMinor: 24000 });
    const windows = calculateEstimate(order("US", { signing: { windows: true, macos: false } }));
    expect(lineOf(windows, "code-signing-setup")?.quantity).toBe(1);
  });

  it("does not charge macOS signing without the macOS build, and says so", () => {
    const e = calculateEstimate(order("US", { signing: { windows: false, macos: true } }));
    expect(lineOf(e, "code-signing-setup")).toBeUndefined();
    expect(e.issues.map((i) => i.code)).toEqual(["macos-signing-needs-macos-build"]);
  });

  it("flags auto-update on a macOS build that is not signed, but still prices it", () => {
    const e = calculateEstimate(order("US", { autoUpdate: true, platforms: { macos: true, linux: false, windowsArm64: false } }));
    expect(e.issues.map((i) => i.code)).toEqual(["macos-auto-update-needs-signing"]);
    expect(lineOf(e, "auto-update-setup")).toBeDefined();
  });

  it("raises no issue for a consistent order", () => {
    const e = calculateEstimate(order("US", { autoUpdate: true, platforms: { macos: true, linux: false, windowsArm64: false }, signing: { windows: true, macos: true } }));
    expect(e.issues).toEqual([]);
  });
});

describe("monthly app care", () => {
  const care = (patch: Partial<ElectronOrder>, country = "US") => calculateEstimate(order(country, { care: true, ...patch }));

  it("is off by default and kept out of the one-time total", () => {
    expect(calculateEstimate(order("US")).monthlyTotalMinor).toBe(0);
    const e = care({});
    expect(e.oneTimeTotalMinor).toBe(119900);
    expect(e.monthlyTotalMinor).toBe(12000);
    expect(e.lines.filter((l) => l.billing === "monthly").map((l) => l.id)).toEqual(["app-care-month"]);
  });

  it("adds one extra-platform charge for each platform beyond Windows", () => {
    expect(care({ platforms: { macos: true, linux: false, windowsArm64: false } }).monthlyTotalMinor).toBe(12000 + 4000);
    expect(care({ platforms: { macos: true, linux: true, windowsArm64: false } }).monthlyTotalMinor).toBe(12000 + 2 * 4000);
  });

  it("does not count Windows on Arm as an extra platform", () => {
    const o = order("US", { platforms: { macos: false, linux: false, windowsArm64: true } });
    expect(careablePlatforms(o)).toBe(1);
    expect(care({ platforms: o.platforms }).monthlyTotalMinor).toBe(12000);
  });

  it("uses each currency's own monthly prices", () => {
    const platforms = { macos: true, linux: true, windowsArm64: false };
    expect(care({ platforms }, "TR").monthlyTotalMinor).toBe(600000 + 2 * 200000);
    expect(care({ platforms }, "ES").monthlyTotalMinor).toBe(10500 + 2 * 3500);
  });
});

describe("quote-only work and informational rates", () => {
  it("lists quote-only requests but adds no price for them", () => {
    const plain = calculateEstimate(order("US"));
    const quoted = calculateEstimate(order("US", { quoteRequests: ["store-submission", "payments-licensing", "migrate-existing-app"] }));
    expect(quoted.quoteOnly.map((q) => q.id)).toEqual(["store-submission", "payments-licensing", "migrate-existing-app"]);
    expect(quoted.oneTimeTotalMinor).toBe(plain.oneTimeTotalMinor);
    expect(quoted.lines).toEqual(plain.lines);
  });

  it("exposes the out-of-scope hourly rate for display but never adds hours to the total", () => {
    for (const [country, rate] of [["US", 4000], ["TR", 200000], ["BR", 3500]] as const) {
      const e = calculateEstimate(order(country));
      expect(e.hourlyRateMinor).toBe(rate);
      expect(e.lines.some((l) => l.id === "out-of-scope-hour")).toBe(false);
    }
  });
});

describe("worked examples from the catalogue", () => {
  const windows = { macos: false, linux: false, windowsArm64: false };
  const A = (country: string) => order(country, { extraScreens: 2, localDatabase: true, signing: { windows: true, macos: false }, autoUpdate: true, care: true, platforms: windows });
  const B = (country: string) =>
    order(country, {
      extraScreens: 4,
      platforms: { macos: true, linux: true, windowsArm64: false },
      signing: { windows: true, macos: true },
      autoUpdate: true,
      ciPipeline: true,
      nativeIntegrations: 3,
      restApis: 1,
      care: true,
    });

  it.each([
    ["A", A, "US", 55, 219900, 12000],
    ["A", A, "TR", 55, 10990000, 600000],
    ["A", A, "DE", 55, 192400, 10500],
    ["B", B, "US", 94, 375900, 20000],
    ["B", B, "TR", 94, 18790000, 1000000],
    ["B", B, "DE", 94, 328900, 17500],
  ])("example %s in %s: %i hours, %i one-time, %i per month", (_name, build, country, hours, oneTime, monthly) => {
    const e = calculateEstimate(build(country));
    expect(e.oneTimeHours).toBe(hours);
    expect(e.oneTimeTotalMinor).toBe(oneTime);
    expect(e.monthlyTotalMinor).toBe(monthly);
    expect(e.issues).toEqual([]);
  });

  it("formats the examples the way the catalogue prints them", () => {
    const a = calculateEstimate(A("US"));
    const b = calculateEstimate(B("DE"));
    expect(formatMoney(a.oneTimeTotalMinor, REGIONS.us)).toBe("$2,199");
    expect(formatMoney(b.oneTimeTotalMinor, REGIONS.intl)).toBe("€3,289");
    expect(formatMoney(calculateEstimate(A("TR")).oneTimeTotalMinor, REGIONS.tr)).toContain("109.900");
  });
});
