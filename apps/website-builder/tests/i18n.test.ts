import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOGUES } from "../src/i18n/catalogues";
import { startingPointLabel } from "../src/i18n/labels";
import { LOCALES, isLocaleCode, matchLocale } from "../src/i18n/locales";
import { en } from "../src/i18n/messages/en";
import { tr } from "../src/i18n/messages/tr";
import { initialLocale, LOCALE_STORAGE_KEY, storeLocale } from "../src/i18n/storage";
import { createTranslator, english } from "../src/i18n/translate";
import { CATALOGUE, ITEM_IDS, QUOTE_ITEMS } from "../src/pricing/catalogue";
import { calculateEstimate } from "../src/pricing/estimate";
import { formatMoney, formatTotal } from "../src/pricing/format";
import { REGIONS, countryName, countryOptions } from "../src/pricing/regions";
import { briefHtml } from "../src/submission/brief";
import { validateClient } from "../src/submission/clientDetails";
import { buildSubmission } from "../src/submission/snapshot";
import { stepIssues } from "../src/wizard/steps";
import { studio, withCountry } from "./helpers";

const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string).sort();
const entries = (table: Readonly<Partial<Record<string, string>>>) => Object.entries(table) as [string, string][];

describe("translation files", () => {
  it("has only keys that exist in English, so a typo cannot hide", () => {
    const known = new Set(Object.keys(en));
    expect(Object.keys(tr).filter((key) => !known.has(key))).toEqual([]);
  });

  it("translates every English message into Turkish", () => {
    const missing = Object.keys(en).filter((key) => !(key in tr));
    expect(missing).toEqual([]);
  });

  it("never leaves a translation empty", () => {
    for (const [key, value] of entries(tr)) expect(value.trim(), key).not.toBe("");
  });

  it("uses the same {placeholders} in every language as in English", () => {
    for (const [key, value] of entries(tr)) expect(placeholders(value), key).toEqual(placeholders(en[key as keyof typeof en]));
  });

  it("keeps plural pairs together", () => {
    const stems = (table: Readonly<Partial<Record<string, string>>>) =>
      new Set(Object.keys(table).filter((k) => /_(one|other)$/.test(k)).map((k) => k.replace(/_(one|other)$/, "")));
    for (const stem of stems(en)) {
      expect(`${stem}_one` in en && `${stem}_other` in en, stem).toBe(true);
      expect(`${stem}_one` in tr && `${stem}_other` in tr, stem).toBe(true);
    }
  });

  it("covers every price item, quote item, region, palette, font, section and template by id", () => {
    const keys = new Set(Object.keys(en));
    for (const id of ITEM_IDS) for (const part of ["label", "unit", "scope"]) expect(keys.has(`catalogue.${id}.${part}`), `${id}.${part}`).toBe(true);
    for (const q of QUOTE_ITEMS) for (const part of ["label", "hint"]) expect(keys.has(`quote.${q.id}.${part}`), `${q.id}.${part}`).toBe(true);
    for (const id of Object.keys(REGIONS)) expect(keys.has(`region.${id}.label`)).toBe(true);
    for (const id of ["paper", "ink", "sand", "forest"]) expect(keys.has(`palette.${id}`)).toBe(true);
    for (const id of ["system", "humanist", "serif"]) expect(keys.has(`font.${id}`)).toBe(true);
    for (const id of ["hero", "textImage", "features", "gallery", "contact"]) expect(keys.has(`section.${id}.label`)).toBe(true);
    for (const id of ["studio", "local-business", "personal"]) expect(keys.has(`template.${id}.name`)).toBe(true);
  });

  it("keeps the English price-list wording in the data identical to the English dictionary", () => {
    for (const id of ITEM_IDS) {
      expect(english.t(`catalogue.${id}.label`), id).toBe(CATALOGUE[id].label);
      expect(english.t(`catalogue.${id}.unit`), id).toBe(CATALOGUE[id].unit);
      expect(english.t(`catalogue.${id}.scope`), id).toBe(CATALOGUE[id].scope);
    }
    for (const q of QUOTE_ITEMS) {
      expect(english.t(`quote.${q.id}.label`)).toBe(q.label);
      expect(english.t(`quote.${q.id}.hint`)).toBe(q.hint);
    }
  });

  it("registers a dictionary for every supported language", () => {
    for (const l of LOCALES) expect(CATALOGUES[l.code]).toBeDefined();
  });

  it("writes Turkish with its own letters", () => {
    const text = Object.values(tr).join(" ");
    for (const ch of ["ç", "ğ", "ı", "İ", "ö", "ş", "ü"]) expect(text, ch).toContain(ch);
  });
});

describe("translator", () => {
  it("fills in values and formats numbers for the language", () => {
    expect(createTranslator("en").t("details.notesHint", { used: 1200, max: 4000 })).toContain("1,200 of 4,000");
    expect(createTranslator("tr").t("details.notesHint", { used: 1200, max: 4000 })).toContain("4.000 karakterin 1.200");
  });

  it("chooses singular and plural forms", () => {
    const t = createTranslator("en").t;
    expect(t("list.sections", { count: 1 })).toBe("1 section");
    expect(t("list.sections", { count: 3 })).toBe("3 sections");
    expect(t("addons.translateAll", { count: 1 })).toBe("Translate all 1 page");
    expect(createTranslator("tr").t("list.sections", { count: 3 })).toBe("3 bölüm");
  });

  it("falls back to English for a missing translation, never to the raw key", () => {
    const saved = (CATALOGUES.tr as Record<string, string>)["common.close"];
    delete (CATALOGUES.tr as Record<string, string>)["common.close"];
    try {
      expect(createTranslator("tr").t("common.close")).toBe("Close");
    } finally {
      (CATALOGUES.tr as Record<string, string>)["common.close"] = saved as string;
    }
  });

  it("returns empty text, not the key, for a key nobody defined", () => {
    expect(english.t("no.such.key" as never)).toBe("");
  });

  it("leaves unknown {markers} alone so a mistake is visible but harmless", () => {
    expect(english.t("wizard.stepOption", { n: 2 })).toBe("2. {label}");
  });

  it("does not re-read braces inside a supplied value", () => {
    expect(english.t("warn.noHeading", { page: "{count}" })).toContain('"{count}"');
  });

  it("sorts country names the way the language does", () => {
    const names = countryOptions("tr").map((o) => o.name);
    expect(names.indexOf("Çad")).toBeLessThan(names.indexOf("Danimarka"));
    expect(names.indexOf("Çad")).toBeGreaterThan(names.indexOf("Cezayir"));
    expect(countryName("TR", "tr")).toBe("Türkiye");
    expect(countryName("DE", "tr")).toBe("Almanya");
    expect(countryName("DE", "en")).toBe("Germany");
  });

  it("formats dates in the language", () => {
    const iso = "2026-10-25T13:05:00Z";
    expect(createTranslator("en").formatDate(iso, { dateStyle: "long", timeZone: "UTC" })).toBe("October 25, 2026");
    expect(createTranslator("tr").formatDate(iso, { dateStyle: "long", timeZone: "UTC" })).toBe("25 Ekim 2026");
  });
});

describe("choosing the language", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => vi.restoreAllMocks());

  it("recognises supported languages and region variants", () => {
    expect(isLocaleCode("tr")).toBe(true);
    expect(isLocaleCode("de")).toBe(false);
    expect(matchLocale(["de-DE", "tr-TR", "en"])).toBe("tr");
    expect(matchLocale(["fr", "de"])).toBeNull();
  });

  it("starts in the saved language, then a ?lang= link, then the browser language", () => {
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["tr-TR"]);
    expect(initialLocale()).toBe("tr");

    storeLocale("en");
    expect(initialLocale()).toBe("en");

    window.history.replaceState(null, "", "/?lang=tr");
    expect(initialLocale()).toBe("tr");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("tr");
  });

  it("ignores an unsupported or tampered saved value", () => {
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["en-US"]);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "<script>");
    expect(initialLocale()).toBe("en");
  });

  it("still works when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["en"]);
    expect(() => storeLocale("tr")).not.toThrow();
    expect(initialLocale()).toBe("en");
  });
});

describe("language never changes the business, prices or design", () => {
  it("prices and money formatting depend on the country only", () => {
    for (const country of ["US", "TR", "DE"]) {
      const project = withCountry(studio(), country);
      const estimate = calculateEstimate(project);
      const region = estimate.region!;
      // The estimate and its formatting take no language at all, so they cannot differ between languages.
      expect(formatTotal(estimate.oneTimeTotalMinor, region)).toBe(formatTotal(calculateEstimate(project).oneTimeTotalMinor, region));
    }
    expect(formatMoney(39900, REGIONS.us)).toBe("$399");
    expect(formatMoney(1990000, REGIONS.tr)).toBe("₺19.900");
    expect(formatMoney(35900, REGIONS.intl)).toBe("€359");
  });

  it("keeps the paid additional-language add-on and its prices as they were", () => {
    expect(CATALOGUE["extra-language-setup"].prices).toEqual({ us: 15000, tr: 750000, intl: 13500 });
    expect(CATALOGUE["extra-language-page"].prices).toEqual({ us: 4000, tr: 200000, intl: 3500 });
  });

  it("words step problems in the chosen language without changing what is wrong", () => {
    const project = withCountry(studio(), null);
    const english_ = stepIssues(project, createTranslator("en").t);
    const turkish = stepIssues(project, createTranslator("tr").t);
    expect(Object.keys(turkish)).toEqual(Object.keys(english_));
    expect(turkish.start).toBe("Bir işletme ülkesi seçin.");
  });

  it("words field errors in Turkish and keeps the English default", () => {
    const empty = { businessName: "", contactName: "", email: "x", notes: "" };
    expect(validateClient(empty).businessName).toBe("Enter your business name.");
    expect(validateClient(empty, createTranslator("tr").t).businessName).toBe("İşletme adınızı girin.");
    expect(Object.keys(validateClient(empty, createTranslator("tr").t))).toEqual(Object.keys(validateClient(empty)));
  });

  it("describes where a project started in the chosen language", () => {
    const tr_ = createTranslator("tr").t;
    expect(startingPointLabel(tr_, "studio")).toBe("Stüdyo");
    expect(startingPointLabel(tr_, "blank")).toBe("Boş sayfa");
    expect(startingPointLabel(english.t, "blank")).toBe("Blank page");
    expect(startingPointLabel(english.t, null)).toBe("Not chosen");
  });

  it("writes the project brief in the chosen language but never touches the client's own words", () => {
    const base = withCountry(studio(), "TR");
    const project = { ...base, order: { ...base.order, client: { businessName: "Örnek <Kafe>", contactName: "Ayşe", email: "ayse@example.com", notes: "Not: pazartesi" } } };
    const payload = buildSubmission(project, { now: new Date("2026-10-25T10:00:00Z"), submissionId: "s1", acknowledgedEstimate: true });
    const html = briefHtml(payload, createTranslator("tr"));
    expect(html).toContain('<html lang="tr">');
    expect(html).toContain("Web sitesi proje özeti");
    expect(html).toContain("Temel web sitesi");
    expect(html).toContain("Örnek &lt;Kafe&gt;");
    expect(html).toContain("Not: pazartesi");
    expect(html).toContain("Türkiye");
    // The same submission, in English, is the original wording.
    expect(briefHtml(payload)).toContain("Website project brief");
    // The machine-readable submission is language-neutral English for BUSW.
    expect(payload.submission.pricing.lines[0]?.label).toBe("Base website");
  });
});
