import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/I18nProvider";
import { pageLinkFile } from "../model/urls";
import { pageFile } from "../model/order";
import type { Page, Project } from "../model/types";
import { SiteView } from "../site/SiteView";
import type { EditApi, RenderCtx } from "../site/ctx";
import { EDITOR_CANVAS_CSS, siteCss } from "../site/siteCss";
import { useFitScale } from "./useFitScale";

export const DEVICES = [
  { id: "desktop", width: 1280 },
  { id: "tablet", width: 768 },
  { id: "phone", width: 375 },
] as const;
export type DeviceId = (typeof DEVICES)[number]["id"];

const SHELL = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>`;
const STAGE_PADDING = 32;

interface Props {
  project: Project;
  page: Page;
  device: DeviceId;
  /** Present while editing. Absent in the read-only preview, which renders the site as it will ship. */
  edit?: EditApi;
  onFrameKeyDown?(event: KeyboardEvent): void;
  /** Read-only preview: a click on a link to another page of the site. */
  onNavigatePage?(file: string): void;
}

/**
 * The live site, rendered inside an iframe of the chosen device width so the generated CSS media queries
 * react exactly as they will on the finished site.
 */
export function Canvas({ project, page, device, edit, onFrameKeyDown, onNavigatePage }: Props) {
  const { t } = useI18n();
  const width = DEVICES.find((d) => d.id === device)?.width ?? 1280;
  const { ref: stageRef, scale } = useFitScale(width, STAGE_PADDING);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [contentHeight, setContentHeight] = useState(600);

  const ctx = useMemo<RenderCtx>(
    () => ({
      mode: edit ? "edit" : "export",
      assets: project.assets,
      src: (id) => project.assets[id]?.dataUrl ?? null,
      pageFile: pageFile(page),
      edit,
      t,
    }),
    [project.assets, edit, page, t],
  );

  const css = useMemo(() => siteCss(project.theme) + (edit ? EDITOR_CANVAS_CSS : "html { overflow: hidden; }"), [project.theme, edit]);

  const onKeyDownRef = useRef(onFrameKeyDown);
  onKeyDownRef.current = onFrameKeyDown;
  const onNavigateRef = useRef(onNavigatePage);
  onNavigateRef.current = onNavigatePage;
  const interactive = Boolean(edit);

  const attach = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    const style = doc.createElement("style");
    doc.head.append(style);
    styleRef.current = style;
    style.textContent = css;
    doc.documentElement.lang = project.site.lang;
    doc.addEventListener("keydown", (event) => onKeyDownRef.current?.(event));
    if (!interactive) {
      // The preview never leaves the page: links to other pages switch the previewed page, anchors scroll, the rest do nothing.
      doc.addEventListener("click", (event) => {
        const link = (event.target as Element | null)?.closest("a");
        if (!link) return;
        event.preventDefault();
        const href = link.getAttribute("href") ?? "";
        const file = pageLinkFile(href);
        if (file !== null) onNavigateRef.current?.(file);
        else if (href.startsWith("#")) doc.getElementById(href.slice(1))?.scrollIntoView({ block: "start" });
      });
    }
    setMount(doc.body);
  };

  useEffect(() => {
    if (styleRef.current) styleRef.current.textContent = css;
  }, [css]);

  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (doc) doc.documentElement.lang = project.site.lang;
  }, [project.site.lang]);

  // Size the iframe to its content so only the outer stage scrolls.
  useEffect(() => {
    const frameDoc = frameRef.current?.contentDocument;
    if (!mount || !frameDoc) return;
    // Measure the content itself. documentElement.scrollHeight can never be smaller than the frame, so it would never shrink.
    const update = () => setContentHeight(Math.max(Math.ceil(frameDoc.body.getBoundingClientRect().height), 200));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frameDoc.documentElement);
    observer.observe(frameDoc.body);
    return () => observer.disconnect();
  }, [mount, device, page.id]);

  // Bring the newly selected block into view (selecting from the list scrolls the preview).
  useEffect(() => {
    if (!mount || !edit?.selected) return;
    const block = mount.ownerDocument.querySelector(`[data-bw-block="${CSS.escape(edit.selected)}"]`);
    block?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [edit?.selected, mount]);

  return (
    <div className="canvas-stage" ref={stageRef}>
      <div className="canvas-sizer" style={{ width: width * scale, height: contentHeight * scale }}>
        <iframe
          ref={frameRef}
          title={t(edit ? "canvas.frameEditable" : "canvas.frameReadOnly", { title: page.title || t("canvas.thePage"), device: t(`device.${device}`) })}
          className="canvas-frame"
          srcDoc={SHELL}
          onLoad={attach}
          style={{ width, height: contentHeight, transform: `scale(${scale})` }}
        />
      </div>
      {mount && createPortal(<SiteView project={project} page={page} ctx={ctx} />, mount)}
    </div>
  );
}
