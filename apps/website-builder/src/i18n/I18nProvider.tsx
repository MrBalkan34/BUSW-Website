import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isLocaleCode, type LocaleCode } from "./locales";
import { initialLocale, LOCALE_STORAGE_KEY, storeLocale } from "./storage";
import { createTranslator, type Translator } from "./translate";

interface I18n extends Translator {
  setLocale(code: LocaleCode): void;
}

const Context = createContext<I18n | null>(null);

/**
 * Holds the interface language. It sits above the whole app and is independent of the project, so changing it
 * never touches the design, the business country, prices or any text the client wrote, and nothing is remounted.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => initialLocale());

  const setLocale = useCallback((code: LocaleCode) => {
    storeLocale(code);
    setLocaleState(code);
  }, []);

  // Keep several open tabs on the same language.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY && isLocaleCode(event.newValue)) setLocaleState(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const translator = useMemo(() => createTranslator(locale), [locale]);

  // Screen readers and the browser's own tools (spell check, hyphenation, translation prompts) read this.
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translator.t("app.title");
  }, [locale, translator]);

  const value = useMemo<I18n>(() => ({ ...translator, setLocale }), [translator, setLocale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(Context);
  if (!value) throw new Error("useI18n must be used inside the I18nProvider");
  return value;
}
