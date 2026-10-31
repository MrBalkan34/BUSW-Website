import { useI18n } from "../i18n/I18nProvider";
import { itemScope, quoteLabel } from "../i18n/labels";
import { QUOTE_ITEMS, type QuoteId } from "../pricing/catalogue";
import { careablePlatforms } from "../pricing/estimate";
import { CheckField, NumberStepper } from "../ui/controls";
import { EstimatePanel } from "./EstimatePanel";
import { usePricing } from "./pricing";
import { useWorkspace } from "./workspace";

export function SupportStep() {
  const { draft, setOrder } = useWorkspace();
  const { t } = useI18n();
  const { priced } = usePricing();
  const o = draft.order;
  const toggleQuote = (id: QuoteId, on: boolean) => setOrder("quoteRequests", on ? [...o.quoteRequests, id] : o.quoteRequests.filter((q) => q !== id));

  return (
    <div className="step support-step">
      <header className="step-header">
        <p className="eyebrow">{t("step.eyebrow", { n: 4, total: 6 })}</p>
        <h1>{t("support.title")}</h1>
        <p className="lede">{t("support.lede")}</p>
      </header>

      <div className="addons-layout">
        <div className="addons-main">
          <section className="panel" aria-labelledby="revisions-heading">
            <h2 id="revisions-heading">{t("support.revisionsHeading")}</h2>
            <NumberStepper label={priced("extra-revision-round", true)} unit={t("app.unit.rounds")} value={o.extraRevisions} onChange={(v) => setOrder("extraRevisions", v)} hint={itemScope(t, "extra-revision-round")} />
          </section>

          <section className="panel" aria-labelledby="care-heading">
            <h2 id="care-heading">{t("support.careHeading")}</h2>
            <p className="hint">{t("support.careWhy")}</p>
            <CheckField
              label={priced("app-care-month", false, t("support.careLabel"))}
              checked={o.care}
              onChange={(v) => setOrder("care", v)}
              hint={`${itemScope(t, "app-care-month")} ${t("support.careCovers", { count: careablePlatforms(o) })}`}
            />
            <p className="hint">{t("support.careNone")}</p>
          </section>

          <section className="panel" aria-labelledby="quote-heading">
            <h2 id="quote-heading">{t("support.quoteHeading")}</h2>
            <p className="hint">{t("support.quoteHint")}</p>
            {QUOTE_ITEMS.map((q) => (
              <CheckField key={q.id} label={quoteLabel(t, q.id)} checked={o.quoteRequests.includes(q.id)} onChange={(on) => toggleQuote(q.id, on)} />
            ))}
          </section>
        </div>

        <aside className="addons-aside" aria-label={t("review.asideLabel")}>
          <EstimatePanel idPrefix="estimate-inline" />
        </aside>
      </div>
    </div>
  );
}
