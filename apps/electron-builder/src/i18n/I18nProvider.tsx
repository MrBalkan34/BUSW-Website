import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { initialLocale, isLocaleCode, LOCALE_STORAGE_KEY, LOCALES, storeLocale, type LocaleCode } from "./locales";
import { createTranslator, type Translator } from "./translate";

interface I18n extends Translator {
  setLocale(code: LocaleCode): void;
}

const Context = createContext<I18n | null>(null);

/** Holds the interface language, independent of the draft: changing it never touches the client's answers or prices. */
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

/** Each language is shown by its own name and tagged with its own `lang`, so screen readers pronounce it correctly. */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t("lang.switcher")}>
      {LOCALES.map((l) => (
        <button key={l.code} type="button" lang={l.code} aria-pressed={locale === l.code} onClick={() => setLocale(l.code)}>
          {l.name}
        </button>
      ))}
    </div>
  );
}
