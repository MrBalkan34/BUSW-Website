import { createContext, useContext, type Dispatch } from "react";
import type { Action, EditorState } from "../model/reducer";
import type { Project } from "../model/types";
import type { Estimate } from "../pricing/estimate";
import type { StepId, StepIssues, SubmittedInfo } from "./steps";

export type SaveStatus = "saved" | "saving" | "error";

export interface Workspace {
  state: EditorState;
  project: Project;
  estimate: Estimate;
  issues: StepIssues;
  dispatch: Dispatch<Action>;
  step: StepId;
  goto(step: StepId): void;
  /** Edits a value in project.order (country, client details, add-ons). Never touches the design. */
  setOrder(path: (string | number)[], value: unknown): void;
  submitted: SubmittedInfo | null;
  setSubmitted(info: SubmittedInfo | null): void;
  saveStatus: SaveStatus;
  /** When true, steps show every problem at once, for example after the client followed a "fix this" link. */
  showErrors: boolean;
  setShowErrors(value: boolean): void;
  /** Replaces the whole project (template pick or opened file). */
  startProject(project: Project): void;
}

const Context = createContext<Workspace | null>(null);

export const WorkspaceProvider = Context.Provider;

export function useWorkspace(): Workspace {
  const value = useContext(Context);
  if (!value) throw new Error("useWorkspace must be used inside the workspace provider");
  return value;
}
