import type { Page, Project } from "../model/types";
import { FooterBlock, HeaderBlock, renderSection } from "../sections/blocks";
import type { RenderCtx } from "./ctx";

/** The id of the section whose heading becomes the page's single <h1>. */
export function titleSectionId(page: Page): string | null {
  const withHeading = (s: Page["sections"][number]) => s.props.heading.trim() !== "";
  const hero = page.sections.find((s) => s.type === "hero" && withHeading(s));
  return (hero ?? page.sections.find(withHeading))?.id ?? null;
}

/** One generated page. The editor, the preview and the exporter all render exactly this. */
export function SiteView({ project, page, ctx }: { project: Project; page: Page; ctx: RenderCtx }) {
  const h1 = titleSectionId(page);
  return (
    <>
      {ctx.mode === "export" && (
        <a className="bw-skip" href="#main">
          Skip to content
        </a>
      )}
      {project.header && <HeaderBlock props={project.header} ctx={ctx} />}
      <main id="main">{page.sections.map((section) => renderSection(section, ctx, section.id === h1 ? "h1" : "h2"))}</main>
      {project.footer && <FooterBlock props={project.footer} ctx={ctx} />}
    </>
  );
}
