// The interface languages and the saved choice are the Website Builder's, so one language choice carries across
// BUSW's pages and both builders (same `busw.lang` setting and `?lang=` link).
export { LOCALES, DEFAULT_LOCALE, isLocaleCode, intlLocale, matchLocale, type LocaleCode } from "../../../website-builder/src/i18n/locales";
export { initialLocale, storeLocale, LOCALE_STORAGE_KEY } from "../../../website-builder/src/i18n/storage";
