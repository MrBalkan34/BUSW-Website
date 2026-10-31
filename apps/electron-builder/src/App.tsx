import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "./i18n/I18nProvider";
import { emptyDraft, normalizeOrder, stepIssues, type Draft, type StepId } from "./model/draft";
import { calculateEstimate, type ElectronOrder } from "./pricing/estimate";
import { loadDraft, saveDraft } from "./storage";
import { Wizard } from "./wizard/Wizard";
import { WorkspaceProvider, type SaveStatus, type Workspace } from "./wizard/workspace";

export function App() {
  const { t } = useI18n();
  // Read once on start. Reading again would turn an unreadable draft into a silent overwrite.
  const [initial] = useState(() => loadDraft());
  const [draft, setDraft] = useState<Draft>(() => (initial.kind === "restored" ? initial.saved.draft : emptyDraft()));
  const [step, setStep] = useState<StepId>(() => (initial.kind === "restored" ? initial.saved.step : "start"));
  const [restored, setRestored] = useState<"none" | "restored" | "unreadable">(initial.kind === "none" ? "none" : initial.kind);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [showErrors, setShowErrors] = useState(false);

  // Autosave shortly after any change. A draft that could not be read is left alone until the client changes something.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveStatus("saving");
    const timer = setTimeout(() => setSaveStatus(saveDraft({ step, draft }) ? "saved" : "error"), 400);
    return () => clearTimeout(timer);
  }, [draft, step]);

  const goto = useCallback((next: StepId) => {
    setStep(next);
    window.scrollTo?.({ top: 0 });
  }, []);

  const setOrder = useCallback(<K extends keyof ElectronOrder>(key: K, value: ElectronOrder[K]) => setDraft((d) => ({ ...d, order: normalizeOrder({ ...d.order, [key]: value }) })), []);
  const setApp = useCallback((field: "name" | "purpose", value: string) => setDraft((d) => ({ ...d, app: { ...d.app, [field]: value } })), []);
  const setClient = useCallback(
    (field: "businessName" | "contactName" | "email" | "notes", value: string) => setDraft((d) => ({ ...d, client: { ...d.client, [field]: value } })),
    [],
  );

  const estimate = useMemo(() => calculateEstimate(draft.order), [draft.order]);
  const issues = useMemo(() => stepIssues(draft, t), [draft, t]);

  const workspace: Workspace = useMemo(
    () => ({ draft, estimate, issues, step, goto, setOrder, setApp, setClient, saveStatus, showErrors, setShowErrors }),
    [draft, estimate, issues, step, goto, setOrder, setApp, setClient, saveStatus, showErrors],
  );

  return (
    <WorkspaceProvider value={workspace}>
      <Wizard restored={restored} restoreDetail={initial.kind === "unreadable" ? initial.detail : ""} onDismissRestored={() => setRestored("none")} />
    </WorkspaceProvider>
  );
}
