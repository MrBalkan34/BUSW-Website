import { QUOTE_IDS, type QuoteId } from "../pricing/catalogue";
import { emptyOrder, MAX_QUANTITY, type ElectronOrder } from "../pricing/estimate";
import { COUNTRY_CODES } from "../pricing/shared";
import { isEmail } from "../../../website-builder/src/model/urls";
import { english, type TranslateFn } from "../i18n/translate";

export const LIMITS = { name: 120, short: 200, purpose: 1500, notes: 4000 } as const;

/** Screens included in the base app. A bespoke design can only be ordered for a screen that exists. */
export const INCLUDED_SCREENS = 3;

export interface AppInfo {
  name: string;
  purpose: string;
}

export interface ClientDetails {
  businessName: string;
  contactName: string;
  email: string;
  notes: string;
}

/** Everything the client has entered. The estimate is calculated from `order` alone. */
export interface Draft {
  order: ElectronOrder;
  app: AppInfo;
  client: ClientDetails;
}

export function emptyDraft(): Draft {
  return {
    order: emptyOrder(null),
    app: { name: "", purpose: "" },
    client: { businessName: "", contactName: "", email: "", notes: "" },
  };
}

/** Keeps the order consistent after any change: bespoke designs cannot outnumber the screens. */
export function normalizeOrder(order: ElectronOrder): ElectronOrder {
  const screens = INCLUDED_SCREENS + order.extraScreens;
  return order.customScreenDesigns > screens ? { ...order, customScreenDesigns: screens } : order;
}

const str = (value: unknown, max: number): string => (typeof value === "string" ? value.slice(0, max) : "");
const bool = (value: unknown): boolean => value === true;
const qty = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_QUANTITY, Math.max(0, Math.trunc(value))) : 0);
const obj = (value: unknown): Record<string, unknown> => (typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {});

/** Reads a saved draft defensively. Anything missing or of the wrong type falls back to its empty value. */
export function parseDraft(value: unknown): Draft | null {
  if (typeof value !== "object" || value === null) return null;
  const v = obj(value);
  const o = obj(v.order);
  const p = obj(o.platforms);
  const s = obj(o.signing);
  const c = obj(v.client);
  const a = obj(v.app);
  const country = typeof o.country === "string" && COUNTRY_CODES.includes(o.country) ? o.country : null;
  const quotes = Array.isArray(o.quoteRequests) ? QUOTE_IDS.filter((id) => (o.quoteRequests as unknown[]).includes(id)) : [];
  const order: ElectronOrder = normalizeOrder({
    country,
    extraScreens: qty(o.extraScreens),
    customScreenDesigns: qty(o.customScreenDesigns),
    nativeIntegrations: qty(o.nativeIntegrations),
    localDatabase: bool(o.localDatabase),
    restApis: qty(o.restApis),
    platforms: { macos: bool(p.macos), linux: bool(p.linux), windowsArm64: bool(p.windowsArm64) },
    signing: { windows: bool(s.windows), macos: bool(s.macos) },
    autoUpdate: bool(o.autoUpdate),
    ciPipeline: bool(o.ciPipeline),
    errorReporting: bool(o.errorReporting),
    extraLanguages: qty(o.extraLanguages),
    userGuides: qty(o.userGuides),
    extraRevisions: qty(o.extraRevisions),
    care: bool(o.care),
    quoteRequests: quotes as QuoteId[],
  });
  return {
    order,
    app: { name: str(a.name, LIMITS.name), purpose: str(a.purpose, LIMITS.purpose) },
    client: { businessName: str(c.businessName, LIMITS.name), contactName: str(c.contactName, LIMITS.name), email: str(c.email, LIMITS.short), notes: str(c.notes, LIMITS.notes) },
  };
}

export type ClientField = "businessName" | "contactName" | "email" | "notes";
export type ClientErrors = Partial<Record<ClientField, string>>;
export const CLIENT_FIELDS: readonly ClientField[] = ["businessName", "contactName", "email", "notes"];

export function validateClient(client: ClientDetails, t: TranslateFn = english.t): ClientErrors {
  const errors: ClientErrors = {};
  if (client.businessName.trim() === "") errors.businessName = t("validation.businessName.required");
  if (client.contactName.trim() === "") errors.contactName = t("validation.contactName.required");
  if (client.email.trim() === "") errors.email = t("validation.email.required");
  else if (!isEmail(client.email)) errors.email = t("validation.email.invalid");
  return errors;
}

export const STEPS = [{ id: "start" }, { id: "app" }, { id: "release" }, { id: "support" }, { id: "details" }, { id: "review" }] as const;
export type StepId = (typeof STEPS)[number]["id"];
export const stepIndex = (id: StepId): number => STEPS.findIndex((s) => s.id === id);
export const isStepId = (value: unknown): value is StepId => STEPS.some((s) => s.id === value);

export type StepIssues = Partial<Record<StepId, string>>;

/** What still needs the client's attention, per step. An empty result means the brief can be created. */
export function stepIssues(draft: Draft, t: TranslateFn = english.t): StepIssues {
  const issues: StepIssues = {};
  if (draft.order.country === null) issues.start = t("issue.start.country");
  else if (draft.app.name.trim() === "") issues.start = t("issue.start.appName");
  const clientErrors = Object.values(validateClient(draft.client, t));
  if (clientErrors.length > 0) issues.details = clientErrors.length === 1 ? (clientErrors[0] as string) : t("issue.details.many", { count: clientErrors.length });
  return issues;
}

export const isReady = (issues: StepIssues): boolean => Object.keys(issues).length === 0;
