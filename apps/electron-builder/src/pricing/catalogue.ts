import type { RegionId } from "./shared";

/**
 * DRAFT. Not frozen, not published. The product is listed as "In development" with no working version, so nothing
 * here may appear on the public site until it exists. Bump when any price, hour figure or scope changes; it is
 * recorded on every submission.
 */
export const CATALOGUE_VERSION = "electron-2026-11.0-draft";

export const ITEM_IDS = [
  "base-desktop-app",
  "additional-screen",
  "custom-screen-design",
  "native-integration",
  "local-database",
  "rest-api-integration",
  "platform-macos",
  "platform-linux",
  "platform-windows-arm64",
  "code-signing-setup",
  "auto-update-setup",
  "ci-release-pipeline",
  "error-reporting-setup",
  "extra-language-setup",
  "user-guide",
  "extra-revision-round",
  "out-of-scope-hour",
  "app-care-month",
  "app-care-extra-platform-month",
] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export type Billing = "one-time" | "monthly" | "hourly";

export interface CatalogueItem {
  id: ItemId;
  label: string;
  /** What one unit is, shown next to the quantity. */
  unit: string;
  billing: Billing;
  /** What is included in one unit. */
  scope: string;
  /** Planning figure: estimated hours per unit (per month for monthly plans). Not measured. */
  hours: number;
  /** Integer minor units (cents, kuruş). */
  prices: Record<RegionId, number>;
}

/**
 * Hourly rate per region, in minor units. Identical to the Website Builder's "out-of-scope-hour" item
 * ($40, ₺2.000, €35), so a rate change reprices every add-on from this one place.
 */
export const HOURLY_RATE: Record<RegionId, number> = { us: 4000, tr: 200000, intl: 3500 };

const priced = (id: ItemId, label: string, unit: string, billing: Billing, hours: number, scope: string): CatalogueItem => ({
  id,
  label,
  unit,
  billing,
  scope,
  hours,
  prices: { us: hours * HOURLY_RATE.us, tr: hours * HOURLY_RATE.tr, intl: hours * HOURLY_RATE.intl },
});

/** Only the base package is rounded to a ...99 / ...49 price, like the Website Builder's $399 / ₺19.900 / €359. */
const BASE_PRICES: Record<RegionId, number> = { us: 119900, tr: 5990000, intl: 104900 };

export const CATALOGUE: Record<ItemId, CatalogueItem> = {
  "base-desktop-app": {
    ...priced("base-desktop-app", "Base desktop app", "app", "one-time", 30, "One Windows 10/11 x64 build with an NSIS installer (unsigned unless code signing setup is added). One main window with up to 3 screens, built from a BUSW template theme. Secure defaults from Electron's security checklist: context isolation on, Node integration off, renderer sandbox on, a Content Security Policy, and a typed preload bridge with up to 5 IPC channels. Local settings saved in the app's user-data folder, an app menu, an icon and an About window. Built on an Electron major version the Electron team supports at delivery. Two consolidated revision rounds, basic accessibility, and correction of defects in delivered work for 30 days. Source code and build configuration handed over in a Git repository."),
    prices: BASE_PRICES,
  },
  "additional-screen": priced("additional-screen", "Additional screen", "screen", "one-time", 4, "A screen beyond the 3 included, using the template theme."),
  "custom-screen-design": priced("custom-screen-design", "Custom screen design", "screen", "one-time", 3, "A bespoke layout for one screen, charged on top of that screen."),
  "native-integration": priced("native-integration", "Native integration", "integration", "one-time", 3, "One of: system tray, notifications, global shortcut, deep-link protocol, file association, start at login, file open/save."),
  "local-database": priced("local-database", "Local database", "setup", "one-time", 8, "SQLite, up to 5 tables, with migrations and native-module rebuilds."),
  "rest-api-integration": priced("rest-api-integration", "REST API integration", "API", "one-time", 6, "One documented API, up to 5 endpoints, one auth scheme, called from the main process."),
  "platform-macos": priced("platform-macos", "macOS build", "platform", "one-time", 10, "Universal (x64 + arm64) DMG and ZIP. Signing needs code signing setup."),
  "platform-linux": priced("platform-linux", "Linux build", "platform", "one-time", 6, "AppImage and .deb for x64."),
  "platform-windows-arm64": priced("platform-windows-arm64", "Windows on Arm build", "platform", "one-time", 2, "An arm64 build alongside x64."),
  "code-signing-setup": priced("code-signing-setup", "Code signing setup", "platform", "one-time", 3, "Windows signing, or macOS signing and notarization, using the client's own identity."),
  "auto-update-setup": priced("auto-update-setup", "Auto-update", "setup", "one-time", 6, "In-app updates from one release feed. macOS requires signing."),
  "ci-release-pipeline": priced("ci-release-pipeline", "CI release pipeline", "setup", "one-time", 5, "Automated builds and draft releases for every ordered platform."),
  "error-reporting-setup": priced("error-reporting-setup", "Error reporting", "setup", "one-time", 3, "Crash and error reporting to one service, with an opt-in prompt."),
  "extra-language-setup": priced("extra-language-setup", "Extra language", "language", "one-time", 3, "Per language. The client supplies translations."),
  "user-guide": priced("user-guide", "User guide", "guide", "one-time", 4, "Up to 10 pages, delivered as PDF and Markdown."),
  "extra-revision-round": priced("extra-revision-round", "Additional revision round", "round", "one-time", 2, "One consolidated list of changes, including rebuild and repackaging."),
  "out-of-scope-hour": priced("out-of-scope-hour", "Out-of-scope work", "hour", "hourly", 1, "Agreed with the client before the work is done. Same rate as the Website Builder."),
  "app-care-month": priced("app-care-month", "App care, one platform", "month", "monthly", 3, "Keep the app on a supported Electron major, apply dependency security updates, rebuild, re-sign and publish, plus up to 1 hour of fixes. Unused time does not roll over."),
  "app-care-extra-platform-month": priced("app-care-extra-platform-month", "App care, each extra platform", "platform per month", "monthly", 1, "Rebuild, signing and testing for each additional platform."),
};

export const QUOTE_IDS = [
  "store-submission",
  "native-addons-hardware",
  "accounts-backend-sync",
  "payments-licensing",
  "offline-first-sync",
  "background-services-kiosk",
  "enterprise-deployment",
  "migrate-existing-app",
] as const;
export type QuoteId = (typeof QUOTE_IDS)[number];

export interface QuoteItem {
  id: QuoteId;
  label: string;
}

/** Work that is never priced automatically. Requesting it adds no amount to the estimate. */
export const QUOTE_ITEMS: readonly QuoteItem[] = [
  { id: "store-submission", label: "Mac App Store or Microsoft Store submission" },
  { id: "native-addons-hardware", label: "Custom native Node addons, or hardware access (serial, USB, HID)" },
  { id: "accounts-backend-sync", label: "User accounts, a backend server, or cloud sync" },
  { id: "payments-licensing", label: "Payments, licensing or license-key activation" },
  { id: "offline-first-sync", label: "Offline-first sync with conflict resolution" },
  { id: "background-services-kiosk", label: "Background services or kiosk mode" },
  { id: "enterprise-deployment", label: "Enterprise deployment (MSI, Group Policy, Intune)" },
  { id: "migrate-existing-app", label: "Migrating or rebuilding an existing desktop app" },
];

/** Same wording as the Website Builder, kept as stable English because it is stored in submissions for BUSW. */
export const ESTIMATE_NOTICE = "Estimated price. BUSW confirms scope and price after reviewing your submission, before any work starts.";
export const TAX_NOTICE = "Applicable taxes are not included and are itemized in the final quote.";

/** Paid by the client directly, to accounts the client owns, so the publisher name in OS dialogs is the client's. */
export const THIRD_PARTY_COSTS = [
  "Apple Developer Program (required for macOS signing and notarization)",
  "Windows code signing: Azure Artifact Signing where available, otherwise an EV code signing certificate",
  "Store accounts",
  "Release hosting",
  "Error-reporting services",
  "API fees",
  "Paid assets",
] as const;
export const EXCLUSIONS_NOTICE = `Not included, and paid by you directly or quoted separately if needed: ${THIRD_PARTY_COSTS.map((c) => c.toLowerCase()).join("; ")}.`;
