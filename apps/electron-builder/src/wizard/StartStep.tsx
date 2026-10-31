import { useId, useMemo } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { regionLabel } from "../i18n/labels";
import { LIMITS } from "../model/draft";
import { CATALOGUE } from "../pricing/catalogue";
import { countryOptions, formatMoney, regionForCountry } from "../pricing/shared";
import { TextField } from "../ui/controls";
import { useWorkspace } from "./workspace";

/** Picks the business country. It only chooses the price list and currency; it never changes the app. */
export function CountrySelect({ id: idProp, describedBy }: { id?: string; describedBy?: string }) {
  const { draft, setOrder } = useWorkspace();
  const { t, locale } = useI18n();
  const generated = useId();
  const id = idProp ?? generated;
  // Country names follow the interface language; the stored value is the country code, which never changes.
  const options = useMemo(() => countryOptions(locale), [locale]);
  return (
    <select id={id} aria-describedby={describedBy} value={draft.order.country ?? ""} onChange={(e) => setOrder("country", e.target.value === "" ? null : e.target.value)}>
      <option value="">{t("start.countryPlaceholder")}</option>
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

export function RegionNote() {
  const { draft } = useWorkspace();
  const { t, rich } = useI18n();
  const region = regionForCountry(draft.order.country);
  if (!region) return <p className="hint">{t("start.regionHint")}</p>;
  return <p className="region-note">{rich("start.regionNote", { currency: <strong>{region.currency}</strong>, label: regionLabel(t, region.id) })}</p>;
}

export function StartStep() {
  const { draft, estimate, setApp, issues, showErrors } = useWorkspace();
  const { t } = useI18n();
  const countryId = useId();
  const { region } = estimate;
  const nameMissing = draft.app.name.trim() === "";

  return (
    <div className="step start-step">
      <header className="step-header">
        <p className="eyebrow">{t("step.eyebrow", { n: 1, total: 6 })}</p>
        <h1>{t("start.title")}</h1>
        <p className="lede">{t("start.lede")}</p>
        <p className="hint">{t("start.savedHint")}</p>
      </header>

      <section className="panel" aria-labelledby="country-heading">
        <h2 id="country-heading">{t("start.countryHeading")}</h2>
        <div className="field">
          <label htmlFor={countryId}>{t("start.countryLabel")}</label>
          <CountrySelect id={countryId} describedBy={`${countryId}-note`} />
          <div id={`${countryId}-note`}>
            <RegionNote />
          </div>
          {issues.start && draft.order.country === null && <p className="hint warn">{t("issue.start.country")}</p>}
        </div>
      </section>

      <section className="panel form-narrow" aria-labelledby="app-heading">
        <h2 id="app-heading">{t("start.appHeading")}</h2>
        <TextField label={t("start.appNameLabel")} required value={draft.app.name} max={LIMITS.name} hint={t("start.appNameHint")} error={showErrors && nameMissing ? t("issue.start.appName") : undefined} onChange={(v) => setApp("name", v)} />
        <TextField label={t("start.purposeLabel")} multiline value={draft.app.purpose} max={LIMITS.purpose} hint={t("start.purposeHint", { used: draft.app.purpose.length, max: LIMITS.purpose })} onChange={(v) => setApp("purpose", v)} />
      </section>

      <section className="panel" aria-labelledby="included-heading">
        <h2 id="included-heading">{t("start.includedHeading")}</h2>
        <p className="hint">{t("start.includedLede")}</p>
        <ul className="plain-list">
          {([1, 2, 3, 4, 5, 6, 7] as const).map((n) => (
            <li key={n}>{t(`start.included.${n}`)}</li>
          ))}
        </ul>
        <p className="facts-line">
          {region ? (
            <strong>{t("start.basePrice", { price: formatMoney(CATALOGUE["base-desktop-app"].prices[region.id], region), currency: region.currency })}</strong>
          ) : (
            t("start.basePriceNone")
          )}
        </p>
      </section>
    </div>
  );
}
