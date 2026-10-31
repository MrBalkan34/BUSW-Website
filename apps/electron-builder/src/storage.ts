import { isStepId, parseDraft, type Draft, type StepId } from "./model/draft";

const KEY = "busw.electron-builder.draft";

export interface SavedDraft {
  step: StepId;
  draft: Draft;
}

export type LoadResult = { kind: "none" } | { kind: "restored"; saved: SavedDraft } | { kind: "unreadable"; detail: string };

/** The draft lives only in this browser. Storage can be blocked, so every access is guarded. */
export function loadDraft(): LoadResult {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return { kind: "none" };
  }
  if (raw === null) return { kind: "none" };
  try {
    const record = JSON.parse(raw) as { format?: unknown; step?: unknown; draft?: unknown };
    const draft = record.format === 1 ? parseDraft(record.draft) : null;
    if (!draft) return { kind: "unreadable", detail: "unrecognised format" };
    return { kind: "restored", saved: { step: isStepId(record.step) ? record.step : "start", draft } };
  } catch (error) {
    return { kind: "unreadable", detail: error instanceof Error ? error.message : "unreadable" };
  }
}

/** Returns false when the browser refused to store the draft. */
export function saveDraft(saved: SavedDraft): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ format: 1, step: saved.step, draft: saved.draft }));
    return true;
  } catch {
    return false;
  }
}
