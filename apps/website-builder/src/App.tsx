import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useI18n } from "./i18n/I18nProvider";
import { createState, pruneAssets, reducer } from "./model/reducer";
import type { Project } from "./model/types";
import { parseProject } from "./model/validate";
import { calculateEstimate } from "./pricing/estimate";
import { loadDraft, saveDraft } from "./storage/db";
import { placeholderProject } from "./templates/templates";
import { Wizard } from "./wizard/Wizard";
import { STEPS, stepIssues, type DraftRecord, type StepId, type SubmittedInfo } from "./wizard/steps";
import { WorkspaceProvider, type SaveStatus, type Workspace } from "./wizard/workspace";

const STEP_IDS = STEPS.map((s) => s.id) as readonly string[];

/** Reads whatever is in storage: a current draft record, or a bare project from an earlier version. */
function readDraft(stored: unknown): { project: Project; step: StepId; submitted: SubmittedInfo | null } | { error: string } {
  const record = stored as Partial<DraftRecord> | null;
  const hasEnvelope = typeof record === "object" && record !== null && record.format === 2;
  const parsed = parseProject(hasEnvelope ? record.project : stored);
  if (!parsed.ok) return { error: parsed.error };
  const step = hasEnvelope && typeof record.step === "string" && STEP_IDS.includes(record.step) ? (record.step as StepId) : "start";
  const submitted = hasEnvelope && isSubmitted(record.submitted) ? record.submitted : null;
  return { project: parsed.project, step, submitted };
}

function isSubmitted(value: unknown): value is SubmittedInfo {
  const v = value as Partial<SubmittedInfo> | null;
  return typeof v === "object" && v !== null && typeof v.reference === "string" && typeof v.at === "string" && typeof v.fingerprint === "string";
}

export function App() {
  const { t } = useI18n();
  const [state, dispatch] = useReducer(reducer, undefined, () => createState(placeholderProject()));
  const [step, setStep] = useState<StepId>("start");
  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState<"none" | "restored" | "unreadable">("none");
  const [restoreDetail, setRestoreDetail] = useState("");
  const [submitted, setSubmitted] = useState<SubmittedInfo | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadDraft().then(
      (stored) => {
        if (cancelled) return;
        if (stored !== undefined) {
          const draft = readDraft(stored);
          if ("error" in draft) {
            setRestored("unreadable");
            setRestoreDetail(draft.error);
          } else {
            dispatch({ type: "load", project: draft.project });
            setStep(draft.step);
            setSubmitted(draft.submitted);
            setRestored("restored");
          }
        }
        setLoaded(true);
      },
      () => {
        if (!cancelled) setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave the whole workspace shortly after any change. A draft that could not be read is not
  // overwritten until the client actually changes something.
  const project = state.present;
  const firstRun = useRef(true);
  useEffect(() => {
    if (!loaded) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      const record: DraftRecord = { format: 2, step, project: pruneAssets(project), submitted };
      saveDraft(record).then(
        () => setSaveStatus("saved"),
        () => setSaveStatus("error"),
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [loaded, project, step, submitted]);

  const goto = useCallback((next: StepId) => {
    setStep(next);
    window.scrollTo?.({ top: 0 });
  }, []);

  const setOrder = useCallback((path: (string | number)[], value: unknown) => dispatch({ type: "setOrder", path, value, at: Date.now() }), []);

  const startProject = useCallback(
    (next: Project) => {
      dispatch({ type: "load", project: next });
      setSubmitted(null);
      setRestored("none");
    },
    [],
  );

  const estimate = useMemo(() => calculateEstimate(project), [project]);
  const issues = useMemo(() => stepIssues(project, t), [project, t]);

  const workspace: Workspace = useMemo(
    () => ({ state, project, estimate, issues, dispatch, step, goto, setOrder, submitted, setSubmitted, saveStatus, showErrors, setShowErrors, startProject }),
    [state, project, estimate, issues, step, goto, setOrder, submitted, saveStatus, showErrors, startProject],
  );

  if (!loaded) return <p className="loading">{t("app.loading")}</p>;

  return (
    <WorkspaceProvider value={workspace}>
      <Wizard restored={restored} restoreDetail={restoreDetail} onDismissRestored={() => setRestored("none")} />
    </WorkspaceProvider>
  );
}
