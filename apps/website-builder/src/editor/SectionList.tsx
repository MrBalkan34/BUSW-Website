import { useRef } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { sectionDescription, sectionLabel } from "../i18n/labels";
import { LIMITS, type Page, type Project, type SectionType, type SelectionId } from "../model/types";
import { SECTION_TYPES } from "../sections/registry";

interface Props {
  project: Project;
  page: Page;
  selected: SelectionId;
  onSelect(id: SelectionId): void;
  onSelectPage(id: string): void;
  onAddPage(): void;
  onMovePage(id: string, dir: -1 | 1): void;
  onRemovePage(id: string): void;
  onMove(id: string, dir: -1 | 1): void;
  onDuplicate(id: string): void;
  onDelete(id: string): void;
  onAdd(type: SectionType): void;
  onAddHeader(): void;
  onAddFooter(): void;
}

function excerpt(text: string): string {
  const t = text.trim();
  return t.length > 28 ? `${t.slice(0, 28)}…` : t;
}

export function SectionList(props: Props) {
  const { project, page, selected, onSelect, onSelectPage, onAddPage, onMovePage, onRemovePage, onMove, onDuplicate, onDelete, onAdd, onAddHeader, onAddFooter } = props;
  const { t } = useI18n();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const count = page.sections.length;

  const row = (id: string, title: string, detail: string) => (
    <button type="button" className="list-main" aria-current={selected === id ? "true" : undefined} onClick={() => onSelect(id)}>
      <span className="list-title">{title}</span>
      {detail && <span className="list-detail">{detail}</span>}
    </button>
  );

  return (
    <div className="section-list">
      <nav aria-label={t("list.pages")}>
        <h2>{t("list.pages")}</h2>
        <ul>
          {project.pages.map((p, index) => (
            <li key={p.id} className={p.id === page.id ? "is-selected" : ""}>
              <button type="button" className="list-main" aria-current={p.id === page.id ? "page" : undefined} onClick={() => onSelectPage(p.id)}>
                <span className="list-title">{p.title || t("common.untitledPage")}</span>
                <span className="list-detail">
                  {index === 0 ? t("list.homePage") : `${p.slug}.html`} · {t("list.sections", { count: p.sections.length })}
                </span>
              </button>
              {index > 0 && p.id === page.id && (
                <div className="list-actions" role="group" aria-label={t("list.pageActions", { title: p.title })}>
                  <button type="button" aria-label={t("list.movePageUp")} title={t("list.movePageUp")} disabled={index === 1} onClick={() => onMovePage(p.id, -1)}>
                    ↑
                  </button>
                  <button type="button" aria-label={t("list.movePageDown")} title={t("list.movePageDown")} disabled={index === project.pages.length - 1} onClick={() => onMovePage(p.id, 1)}>
                    ↓
                  </button>
                  <button type="button" aria-label={t("list.deletePage")} title={t("list.deletePageTitle")} onClick={() => onRemovePage(p.id)}>
                    ✕
                  </button>
                </div>
              )}
            </li>
          ))}
          {project.pages.length < LIMITS.pages && (
            <li>
              <button type="button" className="list-add" onClick={onAddPage}>
                {t("list.addPage")}
              </button>
            </li>
          )}
        </ul>
      </nav>

      <nav aria-label={t("list.contentOf", { title: page.title || t("list.thisPage") })} className="content-nav">
        <h2>{t("list.onThisPage")}</h2>
        <ul>
          <li className={selected === "page" || selected === null ? "is-selected" : ""}>{row("page", t("list.pageSettings"), t("list.pageSettingsDetail"))}</li>
          <li className={selected === "site" ? "is-selected" : ""}>{row("site", t("list.siteSettings"), t("list.siteSettingsDetail"))}</li>
          {project.header ? (
            <li className={selected === "header" ? "is-selected" : ""}>{row("header", t("list.header"), excerpt(project.header.brand))}</li>
          ) : (
            <li>
              <button type="button" className="list-add" onClick={onAddHeader}>
                {t("list.addHeader")}
              </button>
            </li>
          )}

          {page.sections.map((section, index) => (
            <li key={section.id} className={selected === section.id ? "is-selected" : ""}>
              {row(section.id, sectionLabel(t, section.type), excerpt(section.props.heading))}
              <div className="list-actions" role="group" aria-label={t("list.sectionActions", { label: sectionLabel(t, section.type) })}>
                <button type="button" aria-label={t("list.moveUp")} title={t("list.moveUp")} disabled={index === 0} onClick={() => onMove(section.id, -1)}>
                  ↑
                </button>
                <button type="button" aria-label={t("list.moveDown")} title={t("list.moveDown")} disabled={index === count - 1} onClick={() => onMove(section.id, 1)}>
                  ↓
                </button>
                <button type="button" aria-label={t("list.duplicate")} title={t("list.duplicate")} onClick={() => onDuplicate(section.id)}>
                  ⧉
                </button>
                <button type="button" aria-label={t("list.delete")} title={t("list.deleteTitle")} onClick={() => onDelete(section.id)}>
                  ✕
                </button>
              </div>
            </li>
          ))}

          {project.footer ? (
            <li className={selected === "footer" ? "is-selected" : ""}>{row("footer", t("list.footer"), excerpt(project.footer.text))}</li>
          ) : (
            <li>
              <button type="button" className="list-add" onClick={onAddFooter}>
                {t("list.addFooter")}
              </button>
            </li>
          )}
        </ul>

        <details className="add-menu" ref={menuRef}>
          <summary>{t("list.addSection")}</summary>
          <ul>
            {SECTION_TYPES.map((type) => (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(type);
                    if (menuRef.current) menuRef.current.open = false;
                  }}
                >
                  <strong>{sectionLabel(t, type)}</strong>
                  <span>{sectionDescription(t, type)}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      </nav>
    </div>
  );
}
