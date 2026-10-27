import { newId } from "../src/model/ids";
import { HOME_SLUG } from "../src/model/order";
import type { Page, Project, Section } from "../src/model/types";
import { createSection } from "../src/sections/registry";
import { TEMPLATES } from "../src/templates/templates";

export const studio = (): Project => TEMPLATES[0]!.build();

export const sectionsOf = (project: Project): Section[] => project.pages.flatMap((p) => p.sections);

export function newPage(title: string, slug: string, sectionCount = 1, extra: Partial<Page> = {}): Page {
  return {
    id: newId("pg"),
    title,
    slug,
    description: "",
    customLayout: false,
    copywriting: false,
    sections: Array.from({ length: sectionCount }, () => createSection("textImage")),
    ...extra,
  };
}

/** A project priced in the given country with the home page holding `homeSections` sections. */
export function withCountry(project: Project, country: string | null): Project {
  return { ...project, order: { ...project.order, country } };
}

export function withHomeSections(project: Project, count: number): Project {
  const home = project.pages[0]!;
  const sections = Array.from({ length: count }, () => createSection("textImage"));
  return { ...project, pages: [{ ...home, slug: HOME_SLUG, sections }, ...project.pages.slice(1)] };
}

export function withPages(project: Project, ...pages: Page[]): Project {
  return { ...project, pages: [project.pages[0]!, ...pages] };
}
