import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/messages/en";
import { tr } from "../src/i18n/messages/tr";
import { createTranslator, english } from "../src/i18n/translate";
import { itemLabel, itemScope, itemUnit, quoteLabel, regionLabel, EXCLUSION_KEYS } from "../src/i18n/labels";
import { ITEM_IDS, QUOTE_IDS } from "../src/pricing/catalogue";

const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string).sort();
const entries = (table: Readonly<Partial<Record<string, string>>>) => Object.entries(table) as [string, string][];

describe("translation files", () => {
  it("has only keys that exist in English, so a typo cannot hide", () => {
    const known = new Set(Object.keys(en));
    expect(Object.keys(tr).filter((key) => !known.has(key))).toEqual([]);
  });

  it("translates every English message into Turkish", () => {
    expect(Object.keys(en).filter((key) => !(key in tr))).toEqual([]);
  });

  it("never leaves a translation empty", () => {
    for (const [key, value] of entries(tr)) expect(value.trim(), key).not.toBe("");
  });

  it("uses the same {placeholders} in every language as in English", () => {
    for (const [key, value] of entries(tr)) expect(placeholders(value), key).toEqual(placeholders(en[key as keyof typeof en]));
  });
});

describe("names for catalogue data", () => {
  const turkish = createTranslator("tr");

  it("names, counts and describes every priced item in both languages", () => {
    for (const id of ITEM_IDS) {
      for (const t of [english.t, turkish.t]) {
        expect(itemLabel(t, id), id).not.toBe("");
        expect(itemUnit(t, id), id).not.toBe("");
        expect(itemScope(t, id), id).not.toBe("");
      }
    }
  });

  it("names every quote-only kind, every region and every exclusion in both languages", () => {
    for (const t of [english.t, turkish.t]) {
      for (const id of QUOTE_IDS) expect(quoteLabel(t, id), id).not.toBe("");
      for (const id of ["us", "tr", "intl"] as const) expect(regionLabel(t, id), id).not.toBe("");
      for (const key of EXCLUSION_KEYS) expect(t(`estimate.exclusion.${key}`), key).not.toBe("");
    }
  });

  it("really translates the item names rather than copying English", () => {
    expect(turkish.t("catalogue.additional-screen.label")).toBe("Ek ekran");
    expect(english.t("catalogue.additional-screen.label")).toBe("Additional screen");
  });
});

describe("translator", () => {
  it("fills {placeholders} and formats numbers for the language", () => {
    expect(english.t("start.purposeHint", { used: 1200, max: 1500 })).toContain("1,200 / 1,500");
    expect(createTranslator("tr").t("start.purposeHint", { used: 1200, max: 1500 })).toContain("1.200 / 1.500");
  });

  it("states the nothing-is-sent notice in both languages", () => {
    expect(english.t("review.interimTitle")).toBe("Nothing is sent to BUSW from this page");
    expect(createTranslator("tr").t("review.interimTitle")).toBe("Bu sayfadan BUSW'ya hiçbir şey gönderilmez");
    expect(english.t("review.briefNotSent")).toContain("NOT");
  });

  it("says this is an early preview of a builder still in development, in both languages", () => {
    expect(english.t("wizard.devNotice")).toMatch(/^Early preview\..*still in development/);
    expect(createTranslator("tr").t("wizard.devNotice")).toMatch(/^Erken önizleme\..*geliştirme aşamasındadır/);
    expect(english.t("wizard.brandTag")).toBe("Early preview");
  });
});
