import { useId } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { fontLabel, paletteLabel, sectionLabel } from "../i18n/labels";
import type { PagePatch } from "../model/reducer";
import { INCLUDED_SECTIONS_PER_PAGE, LIMITS, type Asset, type FontId, type ImageRef, type Page, type PaletteId, type Project, type Section, type SelectionId } from "../model/types";
import { CATALOGUE } from "../pricing/catalogue";
import { formatMoney } from "../pricing/format";
import { useWorkspace } from "../wizard/workspace";
import { isAnchorSlug } from "../model/urls";
import { emptyImage } from "../sections/registry";
import { FONT_IDS, PALETTES, PALETTE_IDS } from "../templates/themes";
import { CheckField, ImageField, SelectField, TextField } from "./controls";

interface Props {
  project: Project;
  page: Page;
  pageIndex: number;
  setPage(patch: PagePatch): void;
  removePage(): void;
  selected: SelectionId;
  set(target: string, path: (string | number)[], value: unknown): void;
  setAnchor(id: string, value: string): void;
  importFile(file: File): Promise<Asset | string>;
  addHeader(): void;
  addFooter(): void;
  removeHeader(): void;
  removeFooter(): void;
}

export function Inspector(props: Props) {
  const { project, selected } = props;
  const section = props.page.sections.find((s) => s.id === selected);

  return (
    <div className="inspector-body">
      {selected === "header" && project.header ? (
        <HeaderPanel {...props} header={project.header} />
      ) : selected === "footer" && project.footer ? (
        <FooterPanel {...props} />
      ) : section ? (
        <SectionPanel {...props} section={section} />
      ) : selected === "site" ? (
        <SitePanel {...props} />
      ) : (
        <PagePanel {...props} />
      )}
    </div>
  );
}

function anchorList(project: Project): string[] {
  return project.pages.flatMap((p) => p.sections).map((s) => s.anchor).filter(Boolean);
}

/** A price shown beside a page option, or an empty string until the client has chosen a country. */
function useUnitPrice() {
  const { estimate } = useWorkspace();
  return (id: keyof typeof CATALOGUE): string => (estimate.region ? formatMoney(CATALOGUE[id].prices[estimate.region.id], estimate.region) : "");
}

const SLUG_CHARS = /[^a-z0-9-]/g;

function PagePanel({ page, pageIndex, setPage, removePage }: Props) {
  const { t } = useI18n();
  const price = useUnitPrice();
  const isHome = pageIndex === 0;
  const extra = Math.max(0, page.sections.length - INCLUDED_SECTIONS_PER_PAGE);
  const sectionPrice = price("additional-section");
  const pagePrice = price("additional-page");
  const customPrice = price("custom-page-layout");
  const copyPrice = price("copywriting-page");
  const customHint = t("inspector.customHint") + (customPrice ? t("inspector.customHintPrice", { pagePrice, customPrice }) : "");
  return (
    <>
      <h2>{isHome ? t("inspector.homeSettings") : t("inspector.pageSettings")}</h2>
      <TextField label={t("inspector.pageTitle")} value={page.title} max={LIMITS.title} hint={t("inspector.pageTitleHint")} onChange={(v) => setPage({ title: v })} />
      {isHome ? (
        <div className="field">
          <label htmlFor="slug-home">{t("inspector.pageAddress")}</label>
          <input id="slug-home" type="text" value="index.html" disabled aria-describedby="slug-home-hint" />
          <p className="hint" id="slug-home-hint">
            {t("inspector.homeAddressHint")}
          </p>
        </div>
      ) : (
        <TextField
          label={t("inspector.pageAddress")}
          value={page.slug}
          max={40}
          hint={t("inspector.pageAddressHint", { slug: page.slug || "…" })}
          onChange={(v) => setPage({ slug: v.toLowerCase().replace(SLUG_CHARS, "-").replace(/^[^a-z]+/, "") })}
        />
      )}
      <TextField label={t("inspector.pageDescription")} value={page.description} max={LIMITS.description} multiline hint={t("inspector.pageDescriptionHint")} onChange={(v) => setPage({ description: v })} />

      <h3>{t("inspector.options")}</h3>
      {isHome ? (
        <p className="hint">{t("inspector.homeCustomHint")}</p>
      ) : (
        <CheckField label={t("inspector.customLayout")} checked={page.customLayout} onChange={(v) => setPage({ customLayout: v })} hint={customHint} />
      )}
      <CheckField
        label={t("inspector.copywriting")}
        checked={page.copywriting}
        onChange={(v) => setPage({ copywriting: v })}
        hint={t("inspector.copywritingHint") + (copyPrice ? t("inspector.copywritingPrice", { price: copyPrice }) : "")}
      />

      <h3>{t("inspector.sections")}</h3>
      <p className="hint">
        {t("inspector.sectionCount", { count: page.sections.length, included: INCLUDED_SECTIONS_PER_PAGE })}
        {extra > 0 ? (sectionPrice ? t("inspector.extraSectionsPrice", { count: extra, price: sectionPrice }) : t("inspector.extraSections", { count: extra })) : ""}
      </p>

      {!isHome && (
        <>
          <hr />
          <button type="button" className="btn btn-danger" onClick={removePage}>
            {t("inspector.deletePage")}
          </button>
          <p className="hint">{t("inspector.canUndo")}</p>
        </>
      )}
    </>
  );
}

function SitePanel({ project, set, addHeader, addFooter }: Props) {
  const { t } = useI18n();
  return (
    <>
      <h2>{t("inspector.siteSettings")}</h2>
      <p className="hint">{t("inspector.siteHint")}</p>
      <TextField label={t("inspector.siteTitle")} value={project.site.title} max={LIMITS.title} hint={t("inspector.siteTitleHint")} onChange={(v) => set("site", ["title"], v)} />
      <TextField label={t("inspector.siteDescription")} value={project.site.description} max={LIMITS.description} multiline hint={t("inspector.siteDescriptionHint")} onChange={(v) => set("site", ["description"], v)} />
      <TextField label={t("inspector.siteLang")} value={project.site.lang} max={20} hint={t("inspector.siteLangHint")} onChange={(v) => set("site", ["lang"], v)} />

      <fieldset className="swatches">
        <legend>{t("inspector.colours")}</legend>
        {PALETTE_IDS.map((id) => (
          <PaletteOption key={id} id={id} checked={project.theme.palette === id} onSelect={() => set("theme", ["palette"], id)} />
        ))}
      </fieldset>

      <SelectField<FontId> label={t("inspector.font")} value={project.theme.font} options={FONT_IDS.map((id) => ({ value: id, label: fontLabel(t, id) }))} onChange={(v) => set("theme", ["font"], v)} hint={t("inspector.fontHint")} />

      <div className="row">
        {!project.header && (
          <button type="button" className="btn" onClick={addHeader}>
            {t("inspector.addHeader")}
          </button>
        )}
        {!project.footer && (
          <button type="button" className="btn" onClick={addFooter}>
            {t("inspector.addFooter")}
          </button>
        )}
      </div>
    </>
  );
}

function PaletteOption({ id, checked, onSelect }: { id: PaletteId; checked: boolean; onSelect(): void }) {
  const { t } = useI18n();
  const p = PALETTES[id];
  return (
    <label className="swatch">
      <input type="radio" name="palette" checked={checked} onChange={onSelect} />
      <span className="swatch-chip" aria-hidden="true" style={{ background: p.bg, borderColor: p.border }}>
        <i style={{ background: p.fg }} />
        <i style={{ background: p.accent }} />
      </span>
      <span>{paletteLabel(t, id)}</span>
    </label>
  );
}

function HeaderPanel({ project, header, set, removeHeader }: Props & { header: NonNullable<Project["header"]> }) {
  const { t } = useI18n();
  const listId = useId();
  const anchors = anchorList(project);
  return (
    <>
      <h2>{t("inspector.header")}</h2>
      <TextField label={t("inspector.siteName")} value={header.brand} max={LIMITS.short} onChange={(v) => set("header", ["brand"], v)} />
      <datalist id={listId}>
        {project.pages.map((p) => (
          <option key={p.id} value={`${p.slug}.html`} />
        ))}
        {anchors.map((a) => (
          <option key={a} value={`#${a}`} />
        ))}
      </datalist>
      <h3>{t("inspector.menuLinks")}</h3>
      {header.links.map((link, i) => (
        <div className="repeat" key={i}>
          <TextField label={t("inspector.linkText", { n: i + 1 })} value={link.label} max={60} onChange={(v) => set("header", ["links", i, "label"], v)} />
          <TextField label={t("inspector.linkAddress", { n: i + 1 })} value={link.href} max={LIMITS.short} list={listId} placeholder={t("inspector.linkPlaceholder")} hint={t("inspector.linkHint")} onChange={(v) => set("header", ["links", i, "href"], v)} />
          <button type="button" className="btn btn-quiet" onClick={() => set("header", ["links"], header.links.filter((_, j) => j !== i))}>
            {t("inspector.removeLink", { n: i + 1 })}
          </button>
        </div>
      ))}
      {header.links.length < LIMITS.navLinks && (
        <button type="button" className="btn" onClick={() => set("header", ["links"], [...header.links, { label: "New link", href: "" }])}>
          {t("inspector.addLink")}
        </button>
      )}
      <hr />
      <button type="button" className="btn btn-danger" onClick={removeHeader}>
        {t("inspector.removeHeader")}
      </button>
    </>
  );
}

function FooterPanel({ project, set, removeFooter }: Props) {
  const { t } = useI18n();
  return (
    <>
      <h2>{t("inspector.footer")}</h2>
      <TextField label={t("inspector.footerText")} value={project.footer?.text ?? ""} max={LIMITS.short} onChange={(v) => set("footer", ["text"], v)} />
      <hr />
      <button type="button" className="btn btn-danger" onClick={removeFooter}>
        {t("inspector.removeFooter")}
      </button>
    </>
  );
}

function AnchorField({ section, setAnchor }: { section: Section; setAnchor(id: string, value: string): void }) {
  const { t } = useI18n();
  const valid = isAnchorSlug(section.anchor);
  return (
    <div className="field">
      <TextField
        label={t("inspector.anchorLabel")}
        value={section.anchor}
        max={40}
        hint={valid ? t("inspector.anchorHint", { anchor: section.anchor || t("inspector.anchorName") }) : t("inspector.anchorInvalid")}
        onChange={(v) => setAnchor(section.id, v.toLowerCase())}
      />
    </div>
  );
}

function SectionPanel({ project, section, set, setAnchor, importFile }: Props & { section: Section }) {
  const { t } = useI18n();
  const listId = useId();
  const id = section.id;
  const anchors = anchorList(project);
  const image = (label: string, value: ImageRef, path: (string | number)[]) => (
    <ImageField label={label} value={value} assets={project.assets} onChange={(v) => set(id, path, v)} onFile={importFile} />
  );

  return (
    <>
      <h2>{sectionLabel(t, section.type)}</h2>
      <datalist id={listId}>
        {anchors.map((a) => (
          <option key={a} value={`#${a}`} />
        ))}
      </datalist>

      {section.type === "hero" && (
        <>
          <TextField label={t("inspector.headline")} value={section.props.heading} max={LIMITS.heading} onChange={(v) => set(id, ["heading"], v)} />
          <TextField label={t("inspector.description")} value={section.props.subheading} max={LIMITS.text} multiline onChange={(v) => set(id, ["subheading"], v)} />
          <TextField label={t("inspector.buttonText")} value={section.props.buttonLabel} max={60} hint={t("inspector.buttonTextHint")} onChange={(v) => set(id, ["buttonLabel"], v)} />
          <TextField label={t("inspector.buttonAddress")} value={section.props.buttonHref} max={LIMITS.short} list={listId} placeholder={t("inspector.buttonPlaceholder")} onChange={(v) => set(id, ["buttonHref"], v)} />
          {image(t("inspector.image"), section.props.image, ["image"])}
        </>
      )}

      {section.type === "textImage" && (
        <>
          <TextField label={t("inspector.heading")} value={section.props.heading} max={LIMITS.heading} onChange={(v) => set(id, ["heading"], v)} />
          <TextField label={t("inspector.text")} value={section.props.body} max={LIMITS.body} multiline hint={t("inspector.textHint")} onChange={(v) => set(id, ["body"], v)} />
          <SelectField
            label={t("inspector.imagePosition")}
            value={section.props.imageSide}
            options={[
              { value: "right", label: t("inspector.right") },
              { value: "left", label: t("inspector.left") },
            ]}
            onChange={(v) => set(id, ["imageSide"], v)}
          />
          {image(t("inspector.image"), section.props.image, ["image"])}
        </>
      )}

      {section.type === "features" && (
        <>
          <TextField label={t("inspector.heading")} value={section.props.heading} max={LIMITS.heading} onChange={(v) => set(id, ["heading"], v)} />
          <TextField label={t("inspector.introduction")} value={section.props.intro} max={LIMITS.text} multiline onChange={(v) => set(id, ["intro"], v)} />
          <h3>{t("inspector.cards")}</h3>
          {section.props.items.map((item, i) => (
            <div className="repeat" key={i}>
              <TextField label={t("inspector.cardTitle", { n: i + 1 })} value={item.title} max={LIMITS.short} onChange={(v) => set(id, ["items", i, "title"], v)} />
              <TextField label={t("inspector.cardText", { n: i + 1 })} value={item.text} max={LIMITS.text} multiline onChange={(v) => set(id, ["items", i, "text"], v)} />
              <button type="button" className="btn btn-quiet" onClick={() => set(id, ["items"], section.props.items.filter((_, j) => j !== i))}>
                {t("inspector.removeCard", { n: i + 1 })}
              </button>
            </div>
          ))}
          {section.props.items.length < LIMITS.features && (
            <button type="button" className="btn" onClick={() => set(id, ["items"], [...section.props.items, { title: "New item", text: "A sentence describing it." }])}>
              {t("inspector.addCard")}
            </button>
          )}
        </>
      )}

      {section.type === "gallery" && (
        <>
          <TextField label={t("inspector.heading")} value={section.props.heading} max={LIMITS.heading} onChange={(v) => set(id, ["heading"], v)} />
          <h3>{t("inspector.pictures")}</h3>
          {section.props.items.map((item, i) => (
            <div className="repeat" key={i}>
              {image(t("inspector.picture", { n: i + 1 }), item.image, ["items", i, "image"])}
              <TextField label={t("inspector.pictureCaption", { n: i + 1 })} value={item.caption} max={LIMITS.short} onChange={(v) => set(id, ["items", i, "caption"], v)} />
              <button type="button" className="btn btn-quiet" onClick={() => set(id, ["items"], section.props.items.filter((_, j) => j !== i))}>
                {t("inspector.removePicture", { n: i + 1 })}
              </button>
            </div>
          ))}
          {section.props.items.length < LIMITS.gallery && (
            <button type="button" className="btn" onClick={() => set(id, ["items"], [...section.props.items, { image: emptyImage(), caption: "" }])}>
              {t("inspector.addPicture")}
            </button>
          )}
        </>
      )}

      {section.type === "contact" && (
        <>
          <TextField label={t("inspector.heading")} value={section.props.heading} max={LIMITS.heading} onChange={(v) => set(id, ["heading"], v)} />
          <TextField label={t("inspector.text")} value={section.props.text} max={LIMITS.text} multiline onChange={(v) => set(id, ["text"], v)} />
          <TextField label={t("inspector.contactEmail")} type="email" value={section.props.email} max={LIMITS.short} hint={t("inspector.contactEmailHint")} onChange={(v) => set(id, ["email"], v)} />
          <TextField label={t("inspector.phone")} type="tel" value={section.props.phone} max={60} onChange={(v) => set(id, ["phone"], v)} />
          <TextField label={t("inspector.address")} value={section.props.address} max={LIMITS.short} onChange={(v) => set(id, ["address"], v)} />
        </>
      )}

      <hr />
      <AnchorField section={section} setAnchor={setAnchor} />
    </>
  );
}
