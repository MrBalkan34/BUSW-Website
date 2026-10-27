import type { Addons, ClientDetails, Order, Page, Project } from "./types";

export function defaultAddons(): Addons {
  return {
    advancedForm: false,
    booking: false,
    blog: false,
    analytics: false,
    businessEmail: false,
    photoGalleries: 0,
    imagePrepBatches: 0,
    migrationPages: 0,
    extraRevisions: 0,
    languages: [],
    hosting: "none",
    quoteRequests: [],
  };
}

export function defaultClient(): ClientDetails {
  return { businessName: "", contactName: "", email: "", notes: "" };
}

export function defaultOrder(): Order {
  return { country: null, addons: defaultAddons(), client: defaultClient() };
}

export const HOME_SLUG = "index";

export function pageFile(page: Page): string {
  return `${page.slug}.html`;
}

export function homePage(project: Project): Page {
  return project.pages[0] as Page;
}

export function totalSections(project: Project): number {
  return project.pages.reduce((sum, page) => sum + page.sections.length, 0);
}

export function findPageOfSection(project: Project, sectionId: string): Page | undefined {
  return project.pages.find((page) => page.sections.some((s) => s.id === sectionId));
}

/** Ids of every asset the pages refer to (assets nothing refers to are not part of the design). */
export function referencedAssetIds(pages: Page[]): Set<string> {
  const used = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.assetId === "string") used.add(record.assetId);
      Object.values(record).forEach(visit);
    }
  };
  visit(pages);
  return used;
}

/** A URL-safe slug from a title, unique among the given taken slugs. */
export function uniqueSlug(title: string, taken: Set<string>): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/^[^a-z]+/, "").slice(0, 36) || "page";
  let slug = base === HOME_SLUG ? "page" : base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base.slice(0, 34)}-${n}`;
  return slug;
}
