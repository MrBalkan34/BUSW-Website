import { createElement, Fragment, type ReactNode } from "react";
import { DEFAULT_LOCALE, intlLocale, type LocaleCode } from "./locales";
import { en, type TranslationKey } from "./messages/en";
import { tr } from "./messages/tr";

export type Params = Record<string, string | number>;
export type RichParams = Record<string, ReactNode>;
export type TranslateFn = Translator["t"];

export interface Translator {
  locale: LocaleCode;
  /** Plain text. Numbers in `params` are formatted for the locale. */
  t(key: TranslationKey, params?: Params): string;
  /** Text with elements spliced in at `{name}` markers, for example a link or <strong>. */
  rich(key: TranslationKey, parts: RichParams): ReactNode;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  formatDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions): string;
}

/** One dictionary per language. English is complete; the others may omit keys and fall back to English. */
export const CATALOGUES: Record<LocaleCode, Readonly<Partial<Record<string, string>>>> = { en, tr };

const TOKEN = /\{(\w+)\}/g;

/** The current language first, then English. A key in neither (impossible while the types hold) gives "". */
function resolve(locale: LocaleCode, key: string): string {
  return CATALOGUES[locale][key] ?? CATALOGUES[DEFAULT_LOCALE][key] ?? "";
}

export function createTranslator(locale: LocaleCode): Translator {
  const tag = intlLocale(locale);
  const numberFormat = new Intl.NumberFormat(tag);
  const format = (value: string | number): string => (typeof value === "number" ? numberFormat.format(value) : value);

  return {
    locale,
    t: (key, params) => resolve(locale, key).replace(TOKEN, (match, name: string) => (params && name in params ? format(params[name] as string | number) : match)),
    rich: (key, parts) => {
      const template = resolve(locale, key);
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
    },
    formatNumber: (value, options) => new Intl.NumberFormat(tag, options).format(value),
    formatDate: (value, options = { dateStyle: "medium", timeStyle: "short" }) => new Intl.DateTimeFormat(tag, options).format(new Date(value)),
  };
}

/** English, for code that runs outside the interface: tests and default arguments. */
export const english: Translator = createTranslator(DEFAULT_LOCALE);
