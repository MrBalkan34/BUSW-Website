import { useI18n } from "./I18nProvider";
import { LOCALES } from "./locales";

/**
 * Chooses the language of this builder's interface. Each language is shown by its own name and tagged with its own
 * `lang`, so screen readers pronounce "Türkçe" correctly whichever language is active. It changes nothing else.
 */
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
