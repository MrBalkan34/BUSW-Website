import { useMemo, useRef, useState } from "react";
import { API_BASE } from "../account/api";
import { Link, navigate, withNext } from "../account/router";
import { useSession } from "../account/session";
import { CheckField } from "../editor/controls";
import { useI18n } from "../i18n/I18nProvider";
import { fontLabel, paletteLabel, quoteLabel, regionLabel, startingPointLabel } from "../i18n/labels";
import { newProjectId } from "../model/ids";
import { pageFile } from "../model/order";
import { CATALOGUE_VERSION } from "../pricing/catalogue";
import { countryName } from "../pricing/regions";
import { buildBriefPackage, selectionSummary } from "../submission/brief";
import { CLIENT_FIELDS, validateClient } from "../submission/clientDetails";
import { buildSubmission, submissionFingerprint } from "../submission/snapshot";
import { failureMessage, SUBMISSION_URL, submitToBusw, type SubmitFailure } from "../submission/transport";
import { downloadBlob } from "../storage/projectFile";
import { EstimatePanel } from "./EstimatePanel";
import { CountrySelect, RegionNote } from "./StartStep";
import { isReady } from "./steps";
import { useWorkspace } from "./workspace";

const CONTACT_EMAIL = "contact@busoftwareworks.com";

type SendState = { phase: "idle" } | { phase: "sending" } | { phase: "failed"; failure: SubmitFailure };

export function ReviewStep() {
  const { project, estimate, issues, goto, setShowErrors, submitted, setSubmitted } = useWorkspace();
  const i18n = useI18n();
  const { t, rich, formatDate, locale } = i18n;
  const [ack, setAck] = useState(false);
  const [send, setSend] = useState<SendState>({ phase: "idle" });
  const [brief, setBrief] = useState<{ filename: string } | null>(null);
  const attempt = useRef<{ id: string; fingerprint: string } | null>(null);
  const { state: accountState, me } = useSession();
  // Where a submission goes: an external service if one was configured at build time, else the signed-in account's own
  // server. Someone who is signed out is asked to sign in first; their design is kept.
  const endpoint = SUBMISSION_URL ?? (accountState === "signedIn" ? `${API_BASE}/api/submissions` : undefined);
  const live = endpoint !== undefined;
  const needsSignIn = SUBMISSION_URL === undefined && accountState === "anonymous";

  const { region } = estimate;
  const ready = isReady(issues) && region !== null;
  const canAct = ready && ack;

  /** What would be sent right now. Its fingerprint tells us whether anything changed since the last send. */
  const fingerprint = useMemo(() => (region ? submissionFingerprint(buildSubmission(project, { now: new Date(0), submissionId: "x", acknowledgedEstimate: true })) : null), [project, region]);
  const sentCurrent = submitted !== null && submitted.fingerprint === fingerprint;
  const sentEarlier = submitted !== null && !sentCurrent;

  const selections = selectionSummary(project.order.addons, t);
  const clientErrors = validateClient(project.order.client, t);

  const fix = (step: "start" | "addons" | "details") => {
    if (step === "details") setShowErrors(true);
    goto(step);
  };

  /** Freezes the design as it is now. The same submission id is reused if the client retries unchanged work. */
  const snapshot = () => {
    if (!attempt.current || attempt.current.fingerprint !== fingerprint) attempt.current = { id: newProjectId(), fingerprint: fingerprint ?? "" };
    return buildSubmission(project, { now: new Date(), submissionId: attempt.current.id, acknowledgedEstimate: ack });
  };

  const submit = async () => {
    if (!canAct) return;
    setSend({ phase: "sending" });
    const payload = snapshot();
    const result = await submitToBusw(payload, { url: endpoint });
    if (result.ok) {
      setSubmitted({ reference: result.reference, at: payload.submission.submittedAt, fingerprint: submissionFingerprint(payload) });
      setSend({ phase: "idle" });
    } else {
      setSend({ phase: "failed", failure: result });
    }
  };

  const downloadBrief = () => {
    if (!canAct) return;
    const payload = snapshot();
    const pkg = buildBriefPackage(project, payload, i18n);
    downloadBlob(pkg.filename, new Blob([pkg.zip as BlobPart], { type: "application/zip" }));
    setBrief({ filename: pkg.filename });
  };

  const sending = send.phase === "sending";
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
            {issues.addons && (
              <li>
                {issues.addons}{" "}
                <button type="button" className="link-button" onClick={() => fix("addons")}>
                  {t("review.goAddons")}
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
        </section>
      )}

      <div className="review-grid">
        <div className="review-main">
          <section className="panel" aria-labelledby="where-heading">
            <h2 id="where-heading">{t("review.countryHeading")}</h2>
            <div className="field">
              <label htmlFor="review-country">{t("review.countryLabel")}</label>
              <CountrySelect id="review-country" describedBy="review-country-note" />
              <div id="review-country-note">
                <RegionNote />
              </div>
            </div>
            {region && <p className="facts-line">{rich("review.priceList", { label: <strong>{regionLabel(t, region.id)}</strong>, currency: <strong>{region.currency}</strong>, version: CATALOGUE_VERSION })}</p>}
          </section>

          <section className="panel" aria-labelledby="design-review-heading">
            <h2 id="design-review-heading">{t("review.designHeading")}</h2>
            <dl className="facts">
              <div>
                <dt>{t("review.template")}</dt>
                <dd>{startingPointLabel(t, project.templateId)}</dd>
              </div>
              <div>
                <dt>{t("review.style")}</dt>
                <dd>{t("review.styleValue", { palette: paletteLabel(t, project.theme.palette), font: fontLabel(t, project.theme.font) })}</dd>
              </div>
            </dl>
            <h3>{t("review.pages")}</h3>
            <ul className="plain-list">
              {project.pages.map((p, i) => (
                <li key={p.id}>
                  <strong>{p.title || t("common.untitledPage")}</strong> ({pageFile(p)}): {t("list.sections", { count: p.sections.length })}
                  {i > 0 && p.customLayout ? t("review.customLayoutSuffix") : ""}
                  {p.copywriting ? t("review.copywritingSuffix") : ""}
                </li>
              ))}
            </ul>
            <div className="row">
              <button type="button" className="btn" onClick={() => goto("design")}>
                {t("review.editDesign")}
              </button>
              <button type="button" className="btn" onClick={() => goto("preview")}>
                {t("review.previewButton")}
              </button>
            </div>
          </section>

          <section className="panel" aria-labelledby="addons-review-heading">
            <h2 id="addons-review-heading">{t("review.addonsHeading")}</h2>
            {selections.length > 0 ? (
              <ul className="plain-list">
                {selections.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : (
              <p>{t("review.noAddons")}</p>
            )}
            {estimate.quoteOnly.length > 0 && <p>{t("review.quoteFor", { list: estimate.quoteOnly.map((q) => quoteLabel(t, q.id)).join(", ") })}</p>}
            <button type="button" className="btn" onClick={() => goto("addons")}>
              {t("review.editAddons")}
            </button>
          </section>

          <section className="panel" aria-labelledby="client-review-heading">
            <h2 id="client-review-heading">{t("review.clientHeading")}</h2>
            <dl className="facts">
              <div>
                <dt>{t("review.business")}</dt>
                <dd>{project.order.client.businessName || t("common.notEntered")}</dd>
              </div>
              <div>
                <dt>{t("review.contact")}</dt>
                <dd>{project.order.client.contactName || t("common.notEntered")}</dd>
              </div>
              <div>
                <dt>{t("review.email")}</dt>
                <dd>{project.order.client.email || t("common.notEntered")}</dd>
              </div>
              <div>
                <dt>{t("review.country")}</dt>
                <dd>{project.order.country ? countryName(project.order.country, locale) : t("common.notChosen")}</dd>
              </div>
              {project.order.client.notes.trim() && (
                <div>
                  <dt>{t("review.notes")}</dt>
                  <dd className="pre">{project.order.client.notes}</dd>
                </div>
              )}
            </dl>
            <button type="button" className="btn" onClick={() => fix("details")}>
              {t("review.editDetails")}
            </button>
          </section>
        </div>

        <aside className="review-aside" aria-label={t("review.asideLabel")}>
          <EstimatePanel idPrefix="estimate-review" />

          <section className="panel send-panel" aria-labelledby="send-heading">
            <h2 id="send-heading">{t("review.sendHeading")}</h2>

            {sentCurrent && submitted && (
              <div className="success-box" role="status">
                <h3>{t("review.sentTitle")}</h3>
                <p>{rich("review.sentBody", { date: formatDate(submitted.at), reference: <strong>{submitted.reference}</strong> })}</p>
                <p>{t("review.sentNext", { email: project.order.client.email })}</p>
                {me && SUBMISSION_URL === undefined && (
                  <p>
                    {t("submit.account", { name: me.name })} <Link to="/dashboard">{t("acct.menu.dashboard")}</Link>
                  </p>
                )}
              </div>
            )}

            {sentEarlier && submitted && (
              <div className="notice-box" role="status">
                <p>
                  {rich("review.sentEarlier", { date: formatDate(submitted.at), reference: <strong>{submitted.reference}</strong> })}
                  <strong>{t("review.sentEarlierStrong")}</strong>
                  {t("review.sentEarlierTail")}
                </p>
              </div>
            )}

            {!sentCurrent && (
              <>
                <CheckField label={t("review.ack")} checked={ack} onChange={setAck} hint={t("review.ackHint", { email: CONTACT_EMAIL })} />

                {send.phase === "failed" && (
                  <div className="error-box" role="alert">
                    <h3>{t("review.failedTitle")}</h3>
                    <p>{failureMessage(send.failure, t)}</p>
                    {send.failure.kind === "rejected" && send.failure.errors.length > 0 && (
                      <ul>
                        {send.failure.errors.map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                    )}
                    <p>{t("review.failedSaved")}</p>
                  </div>
                )}

                {live ? (
                  <div className="row">
                    <button type="button" className="btn btn-primary" disabled={!canAct || sending} aria-busy={sending} onClick={() => void submit()}>
                      {sending ? t("review.sending") : send.phase === "failed" && send.failure.retryable ? t("review.tryAgain") : sentEarlier ? t("review.submitUpdated") : t("review.submit")}
                    </button>
                  </div>
                ) : needsSignIn ? (
                  <div className="notice-box">
                    <p>{t("submit.signInNeeded")}</p>
                    <div className="row">
                      <button type="button" className="btn btn-primary" onClick={() => navigate(withNext("/account/sign-in", "/"))}>
                        {t("submit.signIn")}
                      </button>
                      <button type="button" className="btn" onClick={() => navigate(withNext("/account/register", "/"))}>
                        {t("submit.create")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="notice-box" aria-labelledby="interim-heading">
                    <h3 id="interim-heading">{t("review.interimTitle")}</h3>
                    <p>{rich("review.interimBody", { email: mail })}</p>
                    <div className="row">
                      <button type="button" className="btn btn-primary" disabled={!canAct} onClick={downloadBrief}>
                        {t("review.interimButton")}
                      </button>
                      <button type="button" className="btn" disabled aria-describedby="interim-heading">
                        {t("review.submitUnavailable")}
                      </button>
                    </div>
                  </div>
                )}

                {(live || needsSignIn) && (
                  <p className="hint">
                    {rich("review.keepCopy", {
                      link: (
                        <button type="button" className="link-button" disabled={!canAct} onClick={downloadBrief}>
                          {t("review.downloadBrief")}
                        </button>
                      ),
                    })}
                  </p>
                )}

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
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
