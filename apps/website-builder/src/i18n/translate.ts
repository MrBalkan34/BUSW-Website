import { createElement, Fragment, type ReactNode } from "react";
import { CATALOGUES } from "./catalogues";
import { DEFAULT_LOCALE, intlLocale, type LocaleCode } from "./locales";
import type { TranslationKey } from "./messages/en";

export type Params = Record<string, string | number>;
export type RichParams = Record<string, ReactNode>;

/** Just the text lookup, for functions that only need to produce a message. */
export type TranslateFn = Translator["t"];

export interface Translator {
  locale: LocaleCode;
  /** Plain text. Numbers in `params` are formatted for the locale. A numeric `count` param also picks the plural form. */
  t(key: TranslationKey, params?: Params): string;
  /** Text with elements spliced in at `{name}` markers, for example a link or <strong>. */
  rich(key: TranslationKey, parts: RichParams): ReactNode;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  formatDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions): string;
  /** Compares strings the way the locale sorts them (Turkish puts Ç, Ğ, İ, Ö, Ş and Ü in their own places). */
  collate(a: string, b: string): number;
}

const TOKEN = /\{(\w+)\}/g;

/**
 * Finds the message for a key: the current language first, then English. A key that exists in neither
 * (impossible while the types hold) yields an empty string, never the raw key.
 */
function resolve(locale: LocaleCode, key: string, count: number | undefined): string {
  const candidates: string[] = [];
  if (count !== undefined) {
    const category = new Intl.PluralRules(intlLocale(locale)).select(count);
    candidates.push(`${key}_${category}`, `${key}_other`);
  }
  candidates.push(key);
  const order = locale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [locale, DEFAULT_LOCALE];
  for (const code of order) {
    const table = CATALOGUES[code];
    for (const candidate of candidates) {
      const found = table[candidate];
      if (found !== undefined) return found;
    }
  }
  return "";
}

export function createTranslator(locale: LocaleCode): Translator {
  const tag = intlLocale(locale);
  const numberFormat = new Intl.NumberFormat(tag);
  const collator = new Intl.Collator(tag);

  const format = (value: string | number): string => (typeof value === "number" ? numberFormat.format(value) : value);

  const t: Translator["t"] = (key, params) => {
    const count = typeof params?.count === "number" ? params.count : undefined;
    const template = resolve(locale, key, count);
    return template.replace(TOKEN, (match, name: string) => (params && name in params ? format(params[name] as string | number) : match));
  };

  const rich: Translator["rich"] = (key, parts) => {
    const template = resolve(locale, key, undefined);
    const out: ReactNode[] = [];
    let last = 0;
    let n = 0;
    for (const match of template.matchAll(TOKEN)) {
      const index = match.index ?? 0;
      if (index > last) out.push(template.slice(last, index));
      const name = match[1] as string;
      out.push(name in parts ? createElement(Fragment, { key: n }, parts[name]) : match[0]);
      n += 1;
      last = index + match[0].length;
    }
    if (last < template.length) out.push(template.slice(last));
    return createElement(Fragment, null, ...out);
  };

  return {
    locale,
    t,
    rich,
    formatNumber: (value, options) => new Intl.NumberFormat(tag, options).format(value),
    formatDate: (value, options = { dateStyle: "medium", timeStyle: "short" }) => new Intl.DateTimeFormat(tag, options).format(new Date(value)),
    collate: (a, b) => collator.compare(a, b),
  };
}

/** English, for code that runs outside the interface: tests, the server-side verifier and default arguments. */
export const english: Translator = createTranslator(DEFAULT_LOCALE);
