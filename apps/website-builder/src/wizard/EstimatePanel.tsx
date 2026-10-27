import { useI18n } from "../i18n/I18nProvider";
import { EXCLUSION_KEYS, itemLabel, itemUnit, quoteLabel, regionLabel } from "../i18n/labels";
import type { EstimateLine } from "../pricing/estimate";
import { formatMoney, formatTotal } from "../pricing/format";
import { countryName, type Region } from "../pricing/regions";
import { useWorkspace } from "./workspace";

function Line({ line, region }: { line: EstimateLine; region: Region }) {
  const { t, formatNumber } = useI18n();
  const unit = itemUnit(t, line.id);
  const detail = line.quantity === 1 ? unit : `${formatNumber(line.quantity)} × ${unit}`;
  return (
    <li className="est-line">
      <span className="est-label">
        <span className="est-name">{itemLabel(t, line.id)}</span>
        <span className="est-detail">
          {detail}
          {line.quantity > 1 && <> {t("estimate.at", { price: formatMoney(line.unitPriceMinor, region) })}</>}
          {line.source === "design" && ` · ${t("estimate.fromDesign")}`}
        </span>
      </span>
      <span className="est-amount">{formatMoney(line.totalMinor, region)}</span>
    </li>
  );
}

/** The itemized estimate. Everything in it is calculated from the design and selections, never typed in. */
export function EstimatePanel({ headingLevel = 2, idPrefix = "estimate" }: { headingLevel?: 2 | 3; idPrefix?: string }) {
  const headingId = `${idPrefix}-heading`;
  const { estimate, project, goto } = useWorkspace();
  const { t, rich, locale } = useI18n();
  const Heading = `h${headingLevel}` as "h2" | "h3";
  const { region } = estimate;

  if (!region) {
    return (
      <section className="estimate" aria-labelledby={headingId}>
        <Heading id={headingId}>{t("estimate.heading")}</Heading>
        <p>{t("estimate.chooseCountryText")}</p>
        <button type="button" className="btn" onClick={() => goto("start")}>
          {t("wizard.chooseCountry")}
        </button>
      </section>
    );
  }

  const oneTime = estimate.lines.filter((l) => l.billing === "one-time");
  const monthly = estimate.lines.filter((l) => l.billing === "monthly");
  const exclusions = EXCLUSION_KEYS.map((key) => t(`estimate.exclusion.${key}`)).join(", ");

  return (
    <section className="estimate" aria-labelledby={headingId}>
      <Heading id={headingId}>{t("estimate.heading")}</Heading>
      <p className="est-region">
        {rich("estimate.regionLine", { country: <strong>{countryName(project.order.country ?? "", locale)}</strong>, currency: <strong>{region.currency}</strong>, label: regionLabel(t, region.id) })}{" "}
        <button type="button" className="link-button" onClick={() => goto("start")}>
          {t("estimate.changeCountry")}
        </button>
      </p>

      <h3 className="est-subhead">{t("estimate.oneTime")}</h3>
      <ul className="est-lines">
        {oneTime.map((line) => (
          <Line key={line.id} line={line} region={region} />
        ))}
      </ul>
      <p className="est-total" aria-live="polite">
        <span>{t("estimate.oneTimeTotal")}</span>
        <strong>{formatTotal(estimate.oneTimeTotalMinor, region)}</strong>
      </p>

      <h3 className="est-subhead">{t("estimate.monthly")}</h3>
      {monthly.length > 0 ? (
        <>
          <ul className="est-lines">
            {monthly.map((line) => (
              <Line key={line.id} line={line} region={region} />
            ))}
          </ul>
          <p className="est-total">
            <span>{t("estimate.monthlyTotal")}</span>
            <strong>{t("estimate.perMonth", { amount: formatTotal(estimate.monthlyTotalMinor, region) })}</strong>
          </p>
        </>
      ) : (
        <p className="est-none">{t("estimate.noneMonthly")}</p>
      )}

      {estimate.quoteOnly.length > 0 && (
        <div className="notice-box">
          <h3 className="est-subhead">{t("estimate.quoteHeading")}</h3>
          <ul>
            {estimate.quoteOnly.map((q) => (
              <li key={q.id}>{quoteLabel(t, q.id)}</li>
            ))}
          </ul>
          <p>
            <strong>{t("estimate.quoteExcluded")}</strong> {t("estimate.quoteSeparately")}
          </p>
        </div>
      )}

      <div className="est-notes">
        <p>
          <strong>{t("estimate.notice")}</strong>
        </p>
        <p>{t("estimate.tax")}</p>
        <p>{t("estimate.exclusions", { list: exclusions })}</p>
        {estimate.hourlyRateMinor !== null && <p>{t("estimate.hourly", { rate: formatMoney(estimate.hourlyRateMinor, region), currency: region.currency })}</p>}
        <p>{t("estimate.addonsNote")}</p>
      </div>
    </section>
  );
}
