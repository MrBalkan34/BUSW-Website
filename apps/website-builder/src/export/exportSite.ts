import { zipSync, strToU8 } from "fflate";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { english, type TranslateFn } from "../i18n/translate";
import { homePage, pageFile } from "../model/order";
import { pruneAssets } from "../model/reducer";
import type { ImageRef, Page, Project } from "../model/types";
import { isEmail, pageLinkFile, safeHref } from "../model/urls";
import { SiteView, titleSectionId } from "../site/SiteView";
import type { RenderCtx } from "../site/ctx";
import { siteCss } from "../site/siteCss";

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function decodeDataUrl(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function collectImages(project: Project): ImageRef[] {
  const images: ImageRef[] = [];
  for (const page of project.pages) {
    for (const section of page.sections) {
      const props = section.props;
      if ("image" in props) images.push(props.image);
      if ("items" in props) {
        for (const item of props.items) if ("image" in item) images.push(item.image);
      }
    }
  }
  return images;
}

type LinkProblem = "invalid" | "missing" | null;

/** Checks a link the way the exported site will resolve it. */
function linkProblem(project: Project, page: Page | null, href: string): LinkProblem {
  const safe = safeHref(href);
  if (safe === null) return "invalid";
  const file = pageLinkFile(safe);
  if (file !== null) return project.pages.some((p) => pageFile(p) === file) ? null : "missing";
  if (safe.startsWith("#")) {
    const scope = page ?? homePage(project);
    return scope.sections.some((s) => s.anchor === safe.slice(1)) ? null : "missing";
  }
  return null;
}

/** Things worth fixing before publishing. They never block export. */
export function exportWarnings(project: Project, t: TranslateFn = english.t): string[] {
  const warnings: string[] = [];
  if (project.site.title.trim() === "") warnings.push(t("warn.noTitle"));
  for (const page of project.pages) {
    if (titleSectionId(page) === null) warnings.push(t("warn.noHeading", { page: page.title }));
  }

  const images = collectImages(project);
  const empty = images.filter((i) => i.assetId === null).length;
  if (empty > 0) warnings.push(t("warn.emptyImages", { count: empty }));
  const noAlt = images.filter((i) => i.assetId !== null && !i.decorative && i.alt.trim() === "").length;
  if (noAlt > 0) warnings.push(t("warn.noAlt", { count: noAlt }));

  for (const link of project.header?.links ?? []) {
    if (link.label.trim() === "") continue;
    const problem = linkProblem(project, null, link.href);
    if (problem === "invalid") warnings.push(t("warn.menuInvalid", { label: link.label }));
    else if (problem === "missing") warnings.push(t("warn.menuMissing", { label: link.label, href: link.href.trim() }));
  }
  for (const page of project.pages) {
    for (const section of page.sections) {
      if (section.type === "hero" && section.props.buttonLabel.trim() !== "") {
        const problem = linkProblem(project, page, section.props.buttonHref);
        if (problem === "invalid") warnings.push(t("warn.buttonInvalid", { label: section.props.buttonLabel }));
        else if (problem === "missing") warnings.push(t("warn.buttonMissing", { label: section.props.buttonLabel, href: section.props.buttonHref.trim() }));
      }
      if (section.type === "contact" && section.props.email.trim() !== "" && !isEmail(section.props.email)) {
        warnings.push(t("warn.badEmail", { email: section.props.email }));
      }
    }
  }
  return warnings;
}

export interface ExportResult {
  files: Record<string, Uint8Array>;
  warnings: string[];
  zip: Uint8Array;
}

function pageHtml(project: Project, page: Page, isHome: boolean, ctx: RenderCtx): string {
  const body = renderToStaticMarkup(createElement(SiteView, { project, page, ctx }));
  const siteTitle = project.site.title.trim() || "Untitled site";
  const title = isHome ? siteTitle : `${page.title.trim() || "Page"} — ${siteTitle}`;
  const description = (page.description.trim() || project.site.description.trim());
  return `<!doctype html>
<html lang="${escapeHtml(project.site.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${description ? `<meta name="description" content="${escapeHtml(description)}">\n` : ""}<link rel="stylesheet" href="styles.css">
</head>
<body>
${body}
</body>
</html>
`;
}

export function buildExport(input: Project): ExportResult {
  const project = pruneAssets(input);
  const files: Record<string, Uint8Array> = {};

  const fileFor = new Map<string, string>();
  let n = 0;
  for (const asset of Object.values(project.assets)) {
    n += 1;
    const path = `assets/image-${n}.${EXTENSIONS[asset.mime]}`;
    fileFor.set(asset.id, path);
    files[path] = decodeDataUrl(asset.dataUrl);
  }

  project.pages.forEach((page, index) => {
    const ctx: RenderCtx = { mode: "export", assets: project.assets, src: (id) => fileFor.get(id) ?? null, pageFile: pageFile(page) };
    files[pageFile(page)] = strToU8(pageHtml(project, page, index === 0, ctx));
  });
  files["styles.css"] = strToU8(siteCss(project.theme));

  return { files, warnings: exportWarnings(project), zip: zipSync(files, { level: 6 }) };
}
