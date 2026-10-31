import { CATALOGUE, CATALOGUE_VERSION, QUOTE_ITEMS, type ItemId, type QuoteId, type QuoteItem } from "./catalogue";
import { regionForCountry, type Region } from "./shared";

/** What the client configures. Everything beyond the base desktop app is an add-on the client switches on. */
export interface ElectronOrder {
  country: string | null;
  extraScreens: number;
  customScreenDesigns: number;
  nativeIntegrations: number;
  localDatabase: boolean;
  restApis: number;
  /** The base app is always Windows x64; these are additional builds. */
  platforms: { macos: boolean; linux: boolean; windowsArm64: boolean };
  /** Signing is set up per operating system. macOS signing needs the macOS build. */
  signing: { windows: boolean; macos: boolean };
  autoUpdate: boolean;
  ciPipeline: boolean;
  errorReporting: boolean;
  extraLanguages: number;
  userGuides: number;
  extraRevisions: number;
  /** Monthly app care, which also covers each extra platform (Windows, macOS and Linux each count once). */
  care: boolean;
  quoteRequests: QuoteId[];
}

export const MAX_QUANTITY = 99;

export function emptyOrder(country: string | null = null): ElectronOrder {
  return {
    country,
    extraScreens: 0,
    customScreenDesigns: 0,
    nativeIntegrations: 0,
    localDatabase: false,
    restApis: 0,
    platforms: { macos: false, linux: false, windowsArm64: false },
    signing: { windows: false, macos: false },
    autoUpdate: false,
    ciPipeline: false,
    errorReporting: false,
    extraLanguages: 0,
    userGuides: 0,
    extraRevisions: 0,
    care: false,
    quoteRequests: [],
  };
}

export interface EstimateLine {
  id: ItemId;
  label: string;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  totalMinor: number;
  /** Planning hours for the whole line (hours per unit × quantity). */
  hours: number;
  billing: "one-time" | "monthly";
  source: "included" | "selection";
  detail: string;
}

/** A combination the client chose that cannot be delivered as selected. BUSW reviews these before quoting. */
export interface EstimateIssue {
  code: "macos-signing-needs-macos-build" | "macos-auto-update-needs-signing";
  message: string;
}

export interface Estimate {
  catalogueVersion: string;
  region: Region | null;
  lines: EstimateLine[];
  oneTimeTotalMinor: number;
  monthlyTotalMinor: number;
  /** Planning hours behind the one-time total. Internal; not a promise to the client. */
  oneTimeHours: number;
  quoteOnly: QuoteItem[];
  issues: EstimateIssue[];
  /** Informational hourly rate for out-of-scope work. Never added to the totals. */
  hourlyRateMinor: number | null;
}

const quantity = (value: number): number => (Number.isFinite(value) ? Math.min(MAX_QUANTITY, Math.max(0, Math.trunc(value))) : 0);

/** Windows, plus macOS and Linux when ordered. Windows on Arm is a second build of the same platform. */
export function careablePlatforms(order: ElectronOrder): number {
  return 1 + (order.platforms.macos ? 1 : 0) + (order.platforms.linux ? 1 : 0);
}

export function calculateEstimate(order: ElectronOrder): Estimate {
  const region = regionForCountry(order.country);
  const empty: Estimate = {
    catalogueVersion: CATALOGUE_VERSION,
    region,
    lines: [],
    oneTimeTotalMinor: 0,
    monthlyTotalMinor: 0,
    oneTimeHours: 0,
    quoteOnly: [],
    issues: [],
    hourlyRateMinor: null,
  };
  if (!region) return empty;

  const lines: EstimateLine[] = [];
  const issues: EstimateIssue[] = [];

  const add = (id: ItemId, qty: number, source: EstimateLine["source"], detail: string) => {
    if (qty <= 0) return;
    const entry = CATALOGUE[id];
    const unitPriceMinor = entry.prices[region.id];
    lines.push({
      id,
      label: entry.label,
      quantity: qty,
      unit: entry.unit,
      unitPriceMinor,
      totalMinor: unitPriceMinor * qty,
      hours: entry.hours * qty,
      billing: entry.billing === "monthly" ? "monthly" : "one-time",
      source,
      detail,
    });
  };

  const { platforms, signing } = order;
  const macosSigning = signing.macos && platforms.macos;
  if (signing.macos && !platforms.macos) {
    issues.push({ code: "macos-signing-needs-macos-build", message: "macOS signing needs the macOS build. It is not in this estimate until the macOS build is added." });
  }
  if (order.autoUpdate && platforms.macos && !macosSigning) {
    issues.push({ code: "macos-auto-update-needs-signing", message: "Auto-update on macOS requires macOS signing. Add code signing setup for macOS." });
  }

  add("base-desktop-app", 1, "included", "Windows x64 app with up to 3 screens");
  add("additional-screen", quantity(order.extraScreens), "selection", "Screens beyond the 3 included");
  add("custom-screen-design", quantity(order.customScreenDesigns), "selection", "Bespoke layouts, charged on top of the screen");
  add("native-integration", quantity(order.nativeIntegrations), "selection", "One system feature each");
  add("local-database", order.localDatabase ? 1 : 0, "selection", "SQLite, up to 5 tables");
  add("rest-api-integration", quantity(order.restApis), "selection", "One documented API each");
  add("platform-macos", platforms.macos ? 1 : 0, "selection", "Universal DMG and ZIP");
  add("platform-linux", platforms.linux ? 1 : 0, "selection", "AppImage and .deb");
  add("platform-windows-arm64", platforms.windowsArm64 ? 1 : 0, "selection", "Alongside the x64 build");
  add("code-signing-setup", (signing.windows ? 1 : 0) + (macosSigning ? 1 : 0), "selection", "One per operating system, using your own signing identity");
  add("auto-update-setup", order.autoUpdate ? 1 : 0, "selection", "One release feed");
  add("ci-release-pipeline", order.ciPipeline ? 1 : 0, "selection", "Covers every ordered platform");
  add("error-reporting-setup", order.errorReporting ? 1 : 0, "selection", "One service");
  add("extra-language-setup", quantity(order.extraLanguages), "selection", "You supply the translations");
  add("user-guide", quantity(order.userGuides), "selection", "Up to 10 pages each");
  add("extra-revision-round", quantity(order.extraRevisions), "selection", "Beyond the two included rounds");
  if (order.care) {
    add("app-care-month", 1, "selection", "Billed monthly, optional");
    add("app-care-extra-platform-month", careablePlatforms(order) - 1, "selection", "Billed monthly, one for each platform beyond the first");
  }

  const sum = (billing: EstimateLine["billing"], key: "totalMinor" | "hours") => lines.filter((l) => l.billing === billing).reduce((s, l) => s + l[key], 0);

  return {
    catalogueVersion: CATALOGUE_VERSION,
    region,
    lines,
    oneTimeTotalMinor: sum("one-time", "totalMinor"),
    monthlyTotalMinor: sum("monthly", "totalMinor"),
    oneTimeHours: sum("one-time", "hours"),
    quoteOnly: QUOTE_ITEMS.filter((q) => order.quoteRequests.includes(q.id)),
    issues,
    hourlyRateMinor: CATALOGUE["out-of-scope-hour"].prices[region.id],
  };
}
