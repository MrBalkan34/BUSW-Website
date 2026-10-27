import type { Project } from "../model/types";
import { english, type TranslateFn } from "../i18n/translate";
import { validateClient } from "../submission/clientDetails";

/** The steps in order. Their visible names are in the translation files under `step.<id>`. */
export const STEPS = [{ id: "start" }, { id: "design" }, { id: "preview" }, { id: "addons" }, { id: "details" }, { id: "review" }] as const;

export type StepId = (typeof STEPS)[number]["id"];

export function stepIndex(id: StepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

export type StepIssues = Partial<Record<StepId, string>>;

/** What still needs the client's attention, per step. An empty result means the project can be submitted. */
export function stepIssues(project: Project, t: TranslateFn = english.t): StepIssues {
  const issues: StepIssues = {};
  const { country, client, addons } = project.order;

  const noCountry = country === null;
  const noTemplate = project.templateId === null;
  if (noCountry && noTemplate) issues.start = t("issue.start.both");
  else if (noCountry) issues.start = t("issue.start.country");
  else if (noTemplate) issues.start = t("issue.start.template");

  if (addons.languages.some((l) => l.name.trim() === "")) issues.addons = t("issue.addons.languageName");

  const clientErrors = Object.values(validateClient(client, t));
  if (clientErrors.length > 0) issues.details = clientErrors.length === 1 ? (clientErrors[0] as string) : t("issue.details.many", { count: clientErrors.length });

  return issues;
}

export function isReady(issues: StepIssues): boolean {
  return Object.keys(issues).length === 0;
}

/** The saved draft. It holds the whole project plus where the client was and whether it was sent. */
export interface SubmittedInfo {
  reference: string;
  at: string;
  /** Fingerprint of what was sent, to tell whether the client has changed things since. */
  fingerprint: string;
}

export interface DraftRecord {
  format: 2;
  step: StepId;
  project: unknown;
  submitted: SubmittedInfo | null;
}
