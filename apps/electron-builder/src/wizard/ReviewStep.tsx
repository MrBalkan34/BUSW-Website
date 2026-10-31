import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { regionLabel } from "../i18n/labels";
import { CLIENT_FIELDS, isReady, validateClient } from "../model/draft";
import { CATALOGUE_VERSION } from "../pricing/catalogue";
import { countryName } from "../pricing/shared";
import { buildBriefPackage, CONTACT_EMAIL, platformSummary, signingSummary } from "../submission/brief";
import { CheckField } from "../ui/controls";
import { EstimatePanel } from "./EstimatePanel";
import { CountrySelect, RegionNote } from "./StartStep";
import { useWorkspace } from "./workspace";

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ReviewStep() {
  const { draft, estimate, issues, goto, setShowErrors } = useWorkspace();
  const i18n = useI18n();
  const { t, rich, locale } = i18n;
  const [ack, setAck] = useState(false);
  const [brief, setBrief] = useState<{ filename: string } | null>(null);

  const { region } = estimate;
  const ready = isReady(issues) && region !== null;
  const canAct = ready && ack;
  const clientErrors = validateClient(draft.client, t);

  /** Opens the step with every problem shown at once. */
  const fix = (step: "start" | "details") => {
    setShowErrors(true);
    goto(step);
  };

  const downloadBrief = () => {
    if (!canAct) return;
    const pkg = buildBriefPackage(draft, new Date(), i18n);
    if (!pkg) return;
    downloadBlob(pkg.filename, new Blob([pkg.zip as BlobPart], { type: "application/zip" }));
    setBrief({ filename: pkg.filename });
  };

  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <div className="step review-step">
      <header className="step-header">
        <p className="eyebrow">{t("step.eyebrow", { n: 6, total: 6 })}</p>
        <h1>{t("review.title")}</h1>
        <p className="lede">{t("review.lede")}</p>
      </header>

      {!ready && (
        <section className="banner banner-warn" role="alert" aria-labelledby="todo-heading">
          <div>
            <h2 id="todo-heading">{t("review.todoHeading")}</h2>
            <ul>
              {issues.start && (
                <li>
                  {issues.start}{" "}
                  <button type="button" className="link-button" onClick={() => fix("start")}>
                    {t("review.goStep1")}
                  </button>
                </li>
              )}
              {issues.details &&
                CLIENT_FIELDS.filter((field) => clientErrors[field]).map((field) => (
                  <li key={field}>
                    {t(`field.${field}`)}: {clientErrors[field]}{" "}
                    <button type="button" className="link-button" onClick={() => fix("details")}>
                      {t("review.fix")}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </section>
      )}

      <div className="review-grid">
        <div className="review-main">
          <section className="panel" aria-labelledby="where-heading">
            <h2 id="where-heading">{t("start.countryHeading")}</h2>
            <div className="field">
              <label htmlFor="review-country">{t("start.countryLabel")}</label>
              <CountrySelect id="review-country" describedBy="review-country-note" />
              <div id="review-country-note">
                <RegionNote />
              </div>
            </div>
            {region && <p className="facts-line">{rich("review.priceList", { label: <strong>{regionLabel(t, region.id)}</strong>, currency: <strong>{region.currency}</strong>, version: CATALOGUE_VERSION })}</p>}
          </section>

          <section className="panel" aria-labelledby="app-review-heading">
            <h2 id="app-review-heading">{t("review.appHeading")}</h2>
            <dl className="facts">
              <div>
                <dt>{t("review.app")}</dt>
                <dd>{draft.app.name || t("common.notEntered")}</dd>
              </div>
              {draft.app.purpose.trim() && (
                <div>
                  <dt>{t("review.purpose")}</dt>
                  <dd className="pre">{draft.app.purpose}</dd>
                </div>
              )}
            </dl>
            <div className="row">
              <button type="button" className="btn" onClick={() => goto("start")}>
                {t("common.edit")}
              </button>
              <button type="button" className="btn" onClick={() => goto("app")}>
                {t("step.app")}
              </button>
            </div>
          </section>

          <section className="panel" aria-labelledby="release-review-heading">
            <h2 id="release-review-heading">{t("review.platformsHeading")}</h2>
            <dl className="facts">
              <div>
                <dt>{t("review.platforms")}</dt>
                <dd>{platformSummary(draft, i18n)}</dd>
              </div>
              <div>
                <dt>{t("review.signing")}</dt>
                <dd>{signingSummary(draft, i18n)}</dd>
              </div>
            </dl>
            {estimate.issues.length > 0 && (
              <ul className="warnings">
                {estimate.issues.map((issue) => (
                  <li key={issue.code}>{t(`release.issue.${issue.code}`)}</li>
                ))}
              </ul>
            )}
            <div className="row">
              <button type="button" className="btn" onClick={() => goto("release")}>
                {t("step.release")}
              </button>
              <button type="button" className="btn" onClick={() => goto("support")}>
                {t("step.support")}
              </button>
            </div>
          </section>

          <section className="panel" aria-labelledby="client-review-heading">
            <h2 id="client-review-heading">{t("review.clientHeading")}</h2>
            <dl className="facts">
              <div>
                <dt>{t("review.business")}</dt>
                <dd>{draft.client.businessName || t("common.notEntered")}</dd>
              </div>
              <div>
                <dt>{t("review.contact")}</dt>
                <dd>{draft.client.contactName || t("common.notEntered")}</dd>
              </div>
              <div>
                <dt>{t("review.email")}</dt>
                <dd>{draft.client.email || t("common.notEntered")}</dd>
              </div>
              <div>
                <dt>{t("review.country")}</dt>
                <dd>{draft.order.country ? countryName(draft.order.country, locale) : t("common.notChosen")}</dd>
              </div>
              {draft.client.notes.trim() && (
                <div>
                  <dt>{t("review.notes")}</dt>
                  <dd className="pre">{draft.client.notes}</dd>
                </div>
              )}
            </dl>
            <button type="button" className="btn" onClick={() => fix("details")}>
              {t("common.edit")}
            </button>
          </section>
        </div>

        <aside className="review-aside" aria-label={t("review.asideLabel")}>
          <EstimatePanel idPrefix="estimate-review" />

          <section className="panel send-panel" aria-labelledby="brief-heading">
            <h2 id="brief-heading">{t("review.briefHeading")}</h2>
            <CheckField label={t("review.ack")} checked={ack} onChange={setAck} hint={rich("review.ackHint", { email: mail })} />

            <div className="notice-box" aria-labelledby="interim-heading">
              <h3 id="interim-heading">{t("review.interimTitle")}</h3>
              <p>{rich("review.interimBody", { email: mail })}</p>
              <div className="row">
                <button type="button" className="btn btn-primary" disabled={!canAct} onClick={downloadBrief}>
                  {t("review.interimButton")}
                </button>
              </div>
            </div>

            {!canAct && (
              <p className="hint" role="status">
                {!ready ? t("review.fixItems") : t("review.tickBox")}
              </p>
            )}

            {brief && (
              <div className="notice-box" role="status">
                <p>
                  <strong>{t("review.briefSaved", { filename: brief.filename })}</strong> <strong>{t("review.briefNotSent")}</strong>
                  {rich("review.briefEmail", { email: mail })}
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
