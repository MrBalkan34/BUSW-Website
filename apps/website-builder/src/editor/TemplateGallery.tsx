import { createElement, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useI18n } from "../i18n/I18nProvider";
import { paletteLabel, templateDescription, templateName, type TemplateId } from "../i18n/labels";
import type { Project } from "../model/types";
import { SiteView } from "../site/SiteView";
import { siteCss } from "../site/siteCss";
import { TEMPLATES, type Template } from "../templates/templates";
import { useFitScale } from "./useFitScale";

function thumbnailHtml(project: Project): string {
  const page = project.pages[0];
  if (!page) return "";
  const body = renderToStaticMarkup(createElement(SiteView, { project, page, ctx: { mode: "export", assets: {}, src: () => null, pageFile: "index.html" } }));
  return `<!doctype html><html lang="${project.site.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${siteCss(project.theme)}html{overflow:hidden}</style></head><body>${body}</body></html>`;
}

function Thumbnail({ project, title }: { project: Project; title: string }) {
  const { ref, scale } = useFitScale(1280);
  const html = useMemo(() => thumbnailHtml(project), [project]);
  return (
    <div className="thumb-frame" ref={ref}>
      <iframe title={title} srcDoc={html} sandbox="" tabIndex={-1} loading="lazy" aria-hidden="true" style={{ transform: `scale(${scale})` }} />
    </div>
  );
}

function TemplateCard({ template, selected, onPick }: { template: Template; selected: boolean; onPick(template: Template): void }) {
  const { t } = useI18n();
  const name = templateName(t, template.id as TemplateId);
  const project = useMemo(() => template.build(), [template]);
  const sections = project.pages[0]?.sections.length ?? 0;
  return (
    <li className={`template-card${selected ? " is-selected" : ""}`}>
      <Thumbnail project={project} title={t("template.previewTitle", { name })} />
      <div className="template-info">
        <h3>
          {name}
          {selected && <span className="badge-selected">{t("template.selected")}</span>}
        </h3>
        <p>{templateDescription(t, template.id as TemplateId)}</p>
        <p className="hint">
          {t("template.summary", { pages: 1, sections, palette: paletteLabel(t, template.palette) })}
        </p>
        <button type="button" className={`btn${selected ? "" : " btn-primary"}`} aria-pressed={selected} onClick={() => onPick(template)}>
          {selected ? t("template.keep", { name }) : t("template.use", { name })}
        </button>
      </div>
    </li>
  );
}

export function TemplateGrid({ selectedId, onPick }: { selectedId: string | null; onPick(template: Template): void }) {
  return (
    <ul className="template-grid">
      {TEMPLATES.map((template) => (
        <TemplateCard key={template.id} template={template} selected={selectedId === template.id} onPick={onPick} />
      ))}
    </ul>
  );
}
