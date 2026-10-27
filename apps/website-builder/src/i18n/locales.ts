/**
 * The interface languages BUSW supports for this app. This is separate from the language of a client's
 * own website (`project.site.lang`) and from the paid "additional language" add-on.
 *
 * To add a language: add an entry here, add a `messages/<code>.ts` dictionary, and register it in `catalogues.ts`.
 */
export const LOCALES = [
  { code: "en", name: "English", intl: "en" },
  { code: "tr", name: "Türkçe", intl: "tr-TR" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: LocaleCode = "en";

export function isLocaleCode(value: unknown): value is LocaleCode {
  return LOCALES.some((l) => l.code === value);
}

export function intlLocale(code: LocaleCode): string {
  return LOCALES.find((l) => l.code === code)?.intl ?? "en";
}

/** The best supported language for a browser language list such as `navigator.languages`, or null if none match. */
export function matchLocale(languages: readonly string[]): LocaleCode | null {
  for (const language of languages) {
    const primary = language.toLowerCase().split("-")[0];
    const found = LOCALES.find((l) => l.code === primary);
    if (found) return found.code;
  }
  return null;
}
