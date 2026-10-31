import { createContext, useContext } from "react";
import type { Draft, StepId, StepIssues } from "../model/draft";
import type { ElectronOrder, Estimate } from "../pricing/estimate";

export type SaveStatus = "saved" | "saving" | "error";

export interface Workspace {
  draft: Draft;
  estimate: Estimate;
  issues: StepIssues;
  step: StepId;
  goto(step: StepId): void;
  /** Changes one field of the order, keeping it consistent (see normalizeOrder). */
  setOrder<K extends keyof ElectronOrder>(key: K, value: ElectronOrder[K]): void;
  setApp(field: "name" | "purpose", value: string): void;
  setClient(field: "businessName" | "contactName" | "email" | "notes", value: string): void;
  saveStatus: SaveStatus;
  /** When true, steps show every problem at once, for example after the client followed a "fix this" link. */
  showErrors: boolean;
  setShowErrors(value: boolean): void;
}

const Context = createContext<Workspace | null>(null);

export const WorkspaceProvider = Context.Provider;

export function useWorkspace(): Workspace {
  const value = useContext(Context);
  if (!value) throw new Error("useWorkspace must be used inside the workspace provider");
  return value;
}
