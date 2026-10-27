import { CheckField, NumberStepper, TextField } from "../editor/controls";
import { useI18n } from "../i18n/I18nProvider";
import { itemLabel, itemScope, itemUnit, quoteHint, quoteLabel } from "../i18n/labels";
import { newId } from "../model/ids";
import { INCLUDED_SECTIONS_PER_PAGE, LIMITS, type ExtraLanguage, type HostingChoice, type QuoteId } from "../model/types";
import { CATALOGUE, QUOTE_ITEMS, type ItemId } from "../pricing/catalogue";
import { designCounts } from "../pricing/estimate";
import { formatMoney } from "../pricing/format";
import { EstimatePanel } from "./EstimatePanel";
import { useWorkspace } from "./workspace";

export function AddonsStep() {
  const { project, estimate, setOrder, goto } = useWorkspace();
  const { t, formatNumber } = useI18n();
  const { addons } = project.order;
  const region = estimate.region;
  const counts = designCounts(project);
  const hasGallerySection = project.pages.some((p) => p.sections.some((s) => s.type === "gallery"));

  const price = (id: ItemId): string => (region ? formatMoney(CATALOGUE[id].prices[region.id], region) : "");
  /** "Image preparation (€35 / batch)", or just the name until a country is chosen. */
  const priced = (id: ItemId): string => {
    const name = itemLabel(t, id);
    if (!region) return name;
    return CATALOGUE[id].billing === "monthly" ? t("addons.pricedMonthly", { name, price: price(id) }) : t("addons.priced", { name, price: price(id), unit: itemUnit(t, id) });
  };
  const scope = (id: ItemId): string => itemScope(t, id);
  const set = <K extends keyof typeof addons>(key: K, value: (typeof addons)[K]) => setOrder(["addons", key], value);

  const setLanguages = (languages: ExtraLanguage[]) => set("languages", languages);
  const updateLanguage = (id: string, patch: Partial<ExtraLanguage>) => setLanguages(addons.languages.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const toggleQuote = (id: QuoteId, on: boolean) => set("quoteRequests", on ? [...addons.quoteRequests, id] : addons.quoteRequests.filter((q) => q !== id));

  const hostingOptions: [HostingChoice, string, string, ItemId | null][] = [
    ["none", t("addons.hosting.none"), t("addons.hosting.noneHint"), null],
    ["hosting", itemLabel(t, "managed-hosting-month"), scope("managed-hosting-month"), "managed-hosting-month"],
    ["care", itemLabel(t, "website-care-month"), scope("website-care-month"), "website-care-month"],
  ];

  return (
    <div className="step addons-step">
      <header className="step-header">
        <p className="eyebrow">{t("step.eyebrow", { n: 4, total: 6 })}</p>
        <h1>{t("addons.title")}</h1>
        <p className="lede">{t("addons.lede")}</p>
      </header>

      {!region && (
        <div className="banner banner-warn" role="status">
          <p>{t("addons.noRegion")}</p>
          <button type="button" className="btn" onClick={() => goto("start")}>
            {t("addons.chooseCountry")}
          </button>
        </div>
      )}

      <div className="addons-layout">
        <div className="addons-main">
          <section className="panel" aria-labelledby="design-heading">
            <h2 id="design-heading">{t("addons.countedHeading")}</h2>
            <p className="hint">{t("addons.countedHint")}</p>
            <dl className="facts">
              <div>
                <dt>{t("addons.baseWebsite")}</dt>
                <dd>{t("addons.baseWebsiteValue", { sections: INCLUDED_SECTIONS_PER_PAGE })}</dd>
              </div>
              <div>
                <dt>{t("addons.additionalPages")}</dt>
                <dd>{formatNumber(counts.additionalStandardPages)}</dd>
              </div>
              <div>
                <dt>{t("addons.customLayouts")}</dt>
                <dd>{formatNumber(counts.customLayoutPages)}</dd>
              </div>
              <div>
                <dt>{t("addons.extraSectionsLabel", { included: INCLUDED_SECTIONS_PER_PAGE })}</dt>
                <dd>{formatNumber(counts.extraSections)}</dd>
              </div>
              <div>
                <dt>{t("addons.copywritingPages")}</dt>
                <dd>{formatNumber(counts.copywritingPages)}</dd>
              </div>
            </dl>
            <p className="hint">{t("addons.customReplaces")}</p>
            <button type="button" className="btn" onClick={() => goto("design")}>
              {t("addons.changePages")}
            </button>
          </section>

          <section className="panel" aria-labelledby="content-heading">
            <h2 id="content-heading">{t("addons.contentHeading")}</h2>
            <NumberStepper label={priced("image-preparation-batch")} unit={t("addons.unit.batches")} value={addons.imagePrepBatches} onChange={(v) => set("imagePrepBatches", v)} hint={t("addons.batchesLabel", { scope: scope("image-preparation-batch") })} />
            <NumberStepper
              label={priced("photo-gallery")}
              unit={t("addons.unit.galleries")}
              value={addons.photoGalleries}
              onChange={(v) => set("photoGalleries", v)}
              hint={t("addons.galleriesLabel", { scope: scope("photo-gallery") }) + (hasGallerySection && addons.photoGalleries === 0 ? t("addons.galleryNudge") : "")}
            />
            <NumberStepper label={priced("content-migration-page")} unit={t("addons.unit.migrate")} value={addons.migrationPages} onChange={(v) => set("migrationPages", v)} hint={t("addons.pagesLabel", { scope: scope("content-migration-page") })} />
          </section>

          <section className="panel" aria-labelledby="features-heading">
            <h2 id="features-heading">{t("addons.featuresHeading")}</h2>
            <p className="hint">{t("addons.contactFormNote")}</p>
            <CheckField label={priced("advanced-inquiry-form")} checked={addons.advancedForm} onChange={(v) => set("advancedForm", v)} hint={scope("advanced-inquiry-form")} />
            <CheckField label={priced("booking-integration")} checked={addons.booking} onChange={(v) => set("booking", v)} hint={scope("booking-integration")} />
            <CheckField label={priced("blog-cms-setup")} checked={addons.blog} onChange={(v) => set("blog", v)} hint={scope("blog-cms-setup")} />
            <CheckField label={priced("analytics-setup")} checked={addons.analytics} onChange={(v) => set("analytics", v)} hint={scope("analytics-setup")} />
            <CheckField label={priced("business-email-setup")} checked={addons.businessEmail} onChange={(v) => set("businessEmail", v)} hint={scope("business-email-setup")} />
          </section>

          <section className="panel" aria-labelledby="languages-heading">
            <h2 id="languages-heading">{t("addons.languagesHeading")}</h2>
            <p className="hint">{t("addons.languagesScope")}</p>
            <p className="hint">
              {region ? `${t("addons.languagesPrice", { setup: price("extra-language-setup"), page: price("extra-language-page") })} ` : ""}
              {t("addons.supplyTranslations")}
            </p>
            {addons.languages.map((language, index) => (
              <div className="repeat" key={language.id}>
                <TextField label={t("addons.languageN", { n: index + 1 })} value={language.name} max={60} placeholder={t("addons.languagePlaceholder")} onChange={(v) => updateLanguage(language.id, { name: v })} />
                <CheckField label={t("addons.translateAll", { count: project.pages.length })} checked={language.allPages} onChange={(v) => updateLanguage(language.id, { allPages: v, pageCount: Math.min(Math.max(1, language.pageCount), project.pages.length) })} />
                {!language.allPages && (
                  <NumberStepper
                    label={t("addons.pagesToTranslate", { language: language.name || t("addons.languageFallback", { n: index + 1 }) })}
                    unit={t("addons.unit.pages")}
                    max={project.pages.length}
                    value={Math.min(language.pageCount, project.pages.length)}
                    onChange={(v) => updateLanguage(language.id, { pageCount: v })}
                  />
                )}
                <button type="button" className="btn btn-quiet" onClick={() => setLanguages(addons.languages.filter((l) => l.id !== language.id))}>
                  {t("addons.removeLanguage", { n: index + 1 })}
                </button>
              </div>
            ))}
            {addons.languages.length < LIMITS.languages && (
              <button type="button" className="btn" onClick={() => setLanguages([...addons.languages, { id: newId("l"), name: "", allPages: true, pageCount: project.pages.length }])}>
                {t("addons.addLanguage")}
              </button>
            )}
          </section>

          <section className="panel" aria-labelledby="support-heading">
            <h2 id="support-heading">{t("addons.supportHeading")}</h2>
            <NumberStepper label={priced("extra-revision-round")} unit={t("addons.unit.rounds")} value={addons.extraRevisions} onChange={(v) => set("extraRevisions", v)} hint={t("addons.revisionsHint", { scope: scope("extra-revision-round") })} />

            <fieldset className="radio-group">
              <legend>{t("addons.hostingLegend")}</legend>
              <p className="hint">{t("addons.hostingHint")}</p>
              {hostingOptions.map(([value, label, description, id]) => (
                <label className="radio" key={value}>
                  <input type="radio" name="hosting" value={value} checked={addons.hosting === value} onChange={() => set("hosting", value)} />
                  <span>
                    <strong>
                      {label}
                      {id && region ? t("addons.perMonthSuffix", { price: price(id) }) : ""}
                    </strong>
                    <span className="hint">{description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </section>

          <section className="panel" aria-labelledby="quote-heading">
            <h2 id="quote-heading">{t("addons.quoteHeading")}</h2>
            <p className="hint">{t("addons.quoteHint")}</p>
            {QUOTE_ITEMS.map((q) => (
              <CheckField key={q.id} label={quoteLabel(t, q.id)} hint={quoteHint(t, q.id)} checked={addons.quoteRequests.includes(q.id)} onChange={(on) => toggleQuote(q.id, on)} />
            ))}
          </section>
        </div>

        <aside className="addons-aside" aria-label={t("addons.asideLabel")}>
          <EstimatePanel idPrefix="estimate-inline" />
        </aside>
      </div>
    </div>
  );
}
