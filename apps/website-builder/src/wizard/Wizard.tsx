import { useRef } from "react";
import { AccountMenu } from "../account/AccountMenu";
import { Editor } from "../editor/Editor";
import { useI18n } from "../i18n/I18nProvider";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { formatTotal } from "../pricing/format";
import { AddonsStep } from "./AddonsStep";
import { DetailsStep } from "./DetailsStep";
import { EstimatePanel } from "./EstimatePanel";
import { PreviewStep } from "./PreviewStep";
import { ReviewStep } from "./ReviewStep";
import { StartStep } from "./StartStep";
import { STEPS, stepIndex, type StepId } from "./steps";
import { useWorkspace } from "./workspace";

interface Props {
  restored: "none" | "restored" | "unreadable";
  restoreDetail: string;
  onDismissRestored(): void;
}

function Stepper() {
  const { step, goto, issues } = useWorkspace();
  const { t } = useI18n();
  const current = stepIndex(step);
  return (
    <nav aria-label={t("wizard.stepsNav")} className="stepper">
      <ol>
        {STEPS.map((s, i) => {
          const issue = issues[s.id];
          return (
            <li key={s.id} className={i < current ? "is-past" : undefined}>
              <button type="button" aria-current={s.id === step ? "step" : undefined} onClick={() => goto(s.id)}>
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="step-label">{t(`step.${s.id}`)}</span>
                {issue && (
                  <>
                    <span className="step-dot" aria-hidden="true" />
                    <span className="sr-only">{t("wizard.needsAttentionDetail", { issue })}</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="step-compact">
        <label className="sr-only" htmlFor="step-menu">
          {t("wizard.goToStep")}
        </label>
        <select id="step-menu" value={step} onChange={(e) => goto(e.target.value as StepId)}>
          {STEPS.map((s, i) => (
            <option key={s.id} value={s.id}>
              {t(issues[s.id] ? "wizard.stepOptionAttention" : "wizard.stepOption", { n: i + 1, label: t(`step.${s.id}`) })}
            </option>
          ))}
        </select>
      </div>
    </nav>
  );
}

function EstimateButton() {
  const { estimate } = useWorkspace();
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { region } = estimate;
  return (
    <>
      <button type="button" className="btn estimate-button" onClick={() => dialogRef.current?.showModal()} aria-haspopup="dialog">
        <span className="estimate-button-label">{t("wizard.estimate")}</span>
        <strong>{region ? formatTotal(estimate.oneTimeTotalMinor, region) : t("wizard.chooseCountry")}</strong>
      </button>
      <dialog ref={dialogRef} className="dialog dialog-wide" aria-labelledby="estimate-dialog-heading" onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current?.close(); }}>
        <div className="dialog-body">
          <EstimatePanel idPrefix="estimate-dialog" />
          <div className="row">
            <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>
              {t("common.close")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** Design and Preview need a design to work on, so they ask for a template first instead of editing a blank placeholder. */
function NeedsTemplate({ what }: { what: "edit" | "preview" }) {
  const { goto } = useWorkspace();
  const { t } = useI18n();
  return (
    <div className="step">
      <header className="step-header">
        <h1>{t("wizard.needsTemplate.title")}</h1>
        <p className="lede">{t(what === "edit" ? "wizard.needsTemplate.edit" : "wizard.needsTemplate.preview")}</p>
      </header>
      <div>
        <button type="button" className="btn btn-primary" onClick={() => goto("start")}>
          {t("wizard.needsTemplate.button")}
        </button>
      </div>
    </div>
  );
}

function StepContent({ step }: { step: StepId }) {
  const { project } = useWorkspace();
  const hasDesign = project.templateId !== null;
  switch (step) {
    case "start":
      return <StartStep />;
    case "design":
      return hasDesign ? <Editor /> : <NeedsTemplate what="edit" />;
    case "preview":
      return hasDesign ? <PreviewStep /> : <NeedsTemplate what="preview" />;
    case "addons":
      return <AddonsStep />;
    case "details":
      return <DetailsStep />;
    case "review":
      return <ReviewStep />;
  }
}

function SaveStatus() {
  const { saveStatus } = useWorkspace();
  const { t } = useI18n();
  const text = saveStatus === "saved" ? t("wizard.save.saved") : saveStatus === "saving" ? t("wizard.save.saving") : t("wizard.save.error");
  return (
    <span className={`status status-${saveStatus}`} role="status">
      {text}
    </span>
  );
}

export function Wizard({ restored, restoreDetail, onDismissRestored }: Props) {
  const { step, goto } = useWorkspace();
  const { t } = useI18n();
  const index = stepIndex(step);
  const prev = STEPS[index - 1];
  const next = STEPS[index + 1];

  return (
    <div className={`shell shell-${step}`}>
      <a className="skip-link" href="#main">
        {t("wizard.skip")}
      </a>
      <header className="shell-header">
        <div className="shell-bar">
          <p className="shell-brand">
            <strong>BUSW Website Builder</strong> <span className="tag">{t("wizard.brandTag")}</span>
          </p>
          <LanguageSwitcher />
          <AccountMenu />
          <SaveStatus />
          <EstimateButton />
        </div>
        <Stepper />
        <div className="step-compact-nav">
          <button type="button" className="btn" disabled={!prev} onClick={() => prev && goto(prev.id)}>
            {t("common.back")}
          </button>
          <button type="button" className="btn btn-primary" disabled={!next} onClick={() => next && goto(next.id)}>
            {t("common.next")}
          </button>
        </div>
      </header>

      {restored !== "none" && (
        <div className={`banner ${restored === "unreadable" ? "banner-warn" : ""}`} role="status">
          <p>{restored === "restored" ? t("wizard.restored") : t("wizard.unreadable", { detail: restoreDetail })}</p>
          <button type="button" className="btn btn-quiet" onClick={onDismissRestored}>
            {t("common.dismiss")}
          </button>
        </div>
      )}

      <main id="main" className="shell-main" tabIndex={-1}>
        <StepContent step={step} />
        <nav className="step-footer" aria-label={t("wizard.stepNav")}>
          <button type="button" className="btn" disabled={!prev} onClick={() => prev && goto(prev.id)}>
            {prev ? t("wizard.backTo", { label: t(`step.${prev.id}`) }) : t("wizard.back")}
          </button>
          {next && (
            <button type="button" className="btn btn-primary" onClick={() => goto(next.id)}>
              {t("wizard.nextTo", { label: t(`step.${next.id}`) })}
            </button>
          )}
        </nav>
      </main>
    </div>
  );
}
