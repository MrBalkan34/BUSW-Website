import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { newId } from "../model/ids";
import { HOME_SLUG, uniqueSlug } from "../model/order";
import type { SectionType } from "../model/types";
import { createSection } from "../sections/registry";
import type { EditApi } from "../site/ctx";
import { saveProjectFile } from "../storage/projectFile";
import { useWorkspace } from "../wizard/workspace";
import { Canvas, DEVICES, type DeviceId } from "./Canvas";
import { Inspector } from "./Inspector";
import { SectionList } from "./SectionList";
import { importImage } from "./importImage";

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='plaintext-only']") !== null;
}

/** The Design step: pages and sections on the left, the live site in the middle, properties on the right. */
export function Editor() {
  const { state, project, dispatch } = useWorkspace();
  const { t } = useI18n();
  const { selected } = state;
  const [device, setDevice] = useState<DeviceId>("desktop");

  const pageIndex = Math.max(0, project.pages.findIndex((p) => p.id === state.activePageId));
  const page = project.pages[pageIndex] ?? project.pages[0]!;

  const undo = useCallback(() => dispatch({ type: "undo" }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: "redo" }), [dispatch]);

  const edit = useMemo<EditApi>(
    () => ({
      selected,
      select: (id) => dispatch({ type: "select", id }),
      set: (target, path, value) => dispatch({ type: "setProp", target, path, value, at: Date.now() }),
      undo,
      redo,
    }),
    [selected, dispatch, undo, redo],
  );

  const onShortcut = useCallback(
    (event: KeyboardEvent) => {
      if (isTextEntry(event.target)) return;
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    },
    [undo, redo],
  );

  useEffect(() => {
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, [onShortcut]);

  const importFile = useCallback(
    async (file: File) => {
      const result = await importImage(file, t);
      if (typeof result !== "string") dispatch({ type: "addAsset", asset: result });
      return result;
    },
    [dispatch, t],
  );

  const addPage = () => {
    const title = `Page ${project.pages.length + 1}`;
    const slug = uniqueSlug(title, new Set(project.pages.map((p) => p.slug).concat(HOME_SLUG)));
    const section = createSection("textImage");
    const first = { ...section, props: { ...section.props, heading: title } } as typeof section;
    dispatch({ type: "addPage", page: { id: newId("pg"), title, slug, description: "", customLayout: false, copywriting: false, sections: [first] } });
  };

  const footerText = `© ${new Date().getFullYear()} ${project.site.title}`;

  return (
    <div className="editor">
      <h1 className="sr-only">{t("editor.title")}</h1>
      <div className="toolbar">
        <div className="toolbar-group" role="group" aria-label={t("editor.undoRedo")}>
          <button type="button" className="btn" disabled={state.past.length === 0} onClick={undo}>
            {t("common.undo")}
          </button>
          <button type="button" className="btn" disabled={state.future.length === 0} onClick={redo}>
            {t("common.redo")}
          </button>
        </div>
        <div className="toolbar-group" role="group" aria-label={t("editor.previewWidth")}>
          {DEVICES.map((d) => (
            <button key={d.id} type="button" className="btn" aria-pressed={device === d.id} onClick={() => setDevice(d.id)}>
              {t(`device.${d.id}`)} <span className="muted">{d.width}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-group">
          <button type="button" className="btn" onClick={() => saveProjectFile(project)}>
            {t("editor.saveFile")}
          </button>
        </div>
      </div>

      <div className="workspace">
        <aside className="sidebar" aria-label={t("editor.sidebar")}>
          <SectionList
            project={project}
            page={page}
            selected={selected}
            onSelect={(id) => dispatch({ type: "select", id })}
            onSelectPage={(id) => dispatch({ type: "setActivePage", id })}
            onAddPage={addPage}
            onMovePage={(id, dir) => dispatch({ type: "movePage", id, dir })}
            onRemovePage={(id) => dispatch({ type: "removePage", id })}
            onMove={(id, dir) => dispatch({ type: "moveSection", id, dir })}
            onDuplicate={(id) => dispatch({ type: "duplicateSection", id, newId: newId("s") })}
            onDelete={(id) => dispatch({ type: "removeSection", id })}
            onAdd={(type: SectionType) => dispatch({ type: "addSection", pageId: page.id, section: createSection(type), afterId: page.sections.some((s) => s.id === selected) ? selected : null })}
            onAddHeader={() => dispatch({ type: "setHeader", header: { brand: project.site.title, links: [] } })}
            onAddFooter={() => dispatch({ type: "setFooter", footer: { text: footerText } })}
          />
        </aside>

        <section className="canvas" aria-label={t("editor.canvasLabel", { title: page.title })}>
          <Canvas project={project} page={page} edit={edit} device={device} onFrameKeyDown={onShortcut} />
        </section>

        <aside className="inspector" aria-label={t("editor.properties")}>
          <Inspector
            project={project}
            page={page}
            pageIndex={pageIndex}
            setPage={(patch) => dispatch({ type: "setPage", id: page.id, patch, at: Date.now() })}
            removePage={() => dispatch({ type: "removePage", id: page.id })}
            selected={selected}
            set={edit.set}
            setAnchor={(id, value) => dispatch({ type: "setAnchor", id, value, at: Date.now() })}
            importFile={importFile}
            addHeader={() => dispatch({ type: "setHeader", header: { brand: project.site.title, links: [] } })}
            addFooter={() => dispatch({ type: "setFooter", footer: { text: footerText } })}
            removeHeader={() => dispatch({ type: "setHeader", header: null })}
            removeFooter={() => dispatch({ type: "setFooter", footer: null })}
          />
        </aside>
      </div>
    </div>
  );
}
