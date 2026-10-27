import { DEFAULT_LOCALE, isLocaleCode, matchLocale, type LocaleCode } from "./locales";

export const LOCALE_STORAGE_KEY = "busw.lang";
const QUERY_PARAM = "lang";

function readStored(): LocaleCode | null {
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocaleCode(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeLocale(code: LocaleCode): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    // Storage can be blocked (private windows, site data off). The language still applies for this visit.
  }
}

/**
 * The language to start in: an explicit `?lang=` link wins (so another BUSW site can hand the choice over),
 * then the visitor's saved choice, then the first supported browser language, then English.
 */
export function initialLocale(): LocaleCode {
  try {
    const fromLink = new URLSearchParams(window.location.search).get(QUERY_PARAM);
    if (isLocaleCode(fromLink)) {
      storeLocale(fromLink);
      return fromLink;
    }
  } catch {
    // Ignore malformed URLs.
  }
  const browser = typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]);
  return readStored() ?? matchLocale(browser) ?? DEFAULT_LOCALE;
}
