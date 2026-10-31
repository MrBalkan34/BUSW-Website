import { useI18n } from "../i18n/I18nProvider";
import { itemScope } from "../i18n/labels";
import { INCLUDED_SCREENS } from "../model/draft";
import { CheckField, NumberStepper } from "../ui/controls";
import { EstimatePanel } from "./EstimatePanel";
import { usePricing } from "./pricing";
import { useWorkspace } from "./workspace";

export function AppStep() {
  const { draft, setOrder, goto } = useWorkspace();
  const { t } = useI18n();
  const { priced, region } = usePricing();
  const o = draft.order;
  const screens = INCLUDED_SCREENS + o.extraScreens;

  return (
    <div className="step app-step">
      <header className="step-header">
        <p className="eyebrow">{t("step.eyebrow", { n: 2, total: 6 })}</p>
        <h1>{t("app.heading")}</h1>
        <p className="lede">{t("app.lede")}</p>
      </header>

      {!region && (
        <div className="banner banner-warn" role="status">
          <p>{t("app.noRegion")}</p>
          <button type="button" className="btn" onClick={() => goto("start")}>
            {t("app.chooseCountry")}
          </button>
        </div>
      )}

      <div className="addons-layout">
        <div className="addons-main">
          <section className="panel" aria-labelledby="screens-heading">
            <h2 id="screens-heading">{t("app.screensHeading")}</h2>
            <p className="hint">{t("app.screensIntro", { count: INCLUDED_SCREENS })}</p>
            <NumberStepper label={priced("additional-screen", true)} unit={t("app.unit.screens")} value={o.extraScreens} onChange={(v) => setOrder("extraScreens", v)} hint={itemScope(t, "additional-screen")} />
            <NumberStepper
              label={priced("custom-screen-design", true)}
              unit={t("app.unit.designs")}
              value={o.customScreenDesigns}
              max={screens}
              onChange={(v) => setOrder("customScreenDesigns", v)}
              hint={`${itemScope(t, "custom-screen-design")} ${t("app.customMax", { count: screens })}`}
            />
          </section>

          <section className="panel" aria-labelledby="features-heading">
            <h2 id="features-heading">{t("app.featuresHeading")}</h2>
            <NumberStepper label={priced("native-integration", true)} unit={t("app.unit.integrations")} value={o.nativeIntegrations} onChange={(v) => setOrder("nativeIntegrations", v)} hint={t("app.nativeList")} />
          </section>

          <section className="panel" aria-labelledby="data-heading">
            <h2 id="data-heading">{t("app.dataHeading")}</h2>
            <CheckField label={priced("local-database")} checked={o.localDatabase} onChange={(v) => setOrder("localDatabase", v)} hint={itemScope(t, "local-database")} />
            <NumberStepper label={priced("rest-api-integration", true)} unit={t("app.unit.apis")} value={o.restApis} onChange={(v) => setOrder("restApis", v)} hint={itemScope(t, "rest-api-integration")} />
          </section>

          <section className="panel" aria-labelledby="reach-heading">
            <h2 id="reach-heading">{t("app.reachHeading")}</h2>
            <NumberStepper label={priced("extra-language-setup", true)} unit={t("app.unit.languages")} value={o.extraLanguages} onChange={(v) => setOrder("extraLanguages", v)} hint={itemScope(t, "extra-language-setup")} />
            <NumberStepper label={priced("user-guide", true)} unit={t("app.unit.guides")} value={o.userGuides} onChange={(v) => setOrder("userGuides", v)} hint={itemScope(t, "user-guide")} />
          </section>
        </div>

        <aside className="addons-aside" aria-label={t("review.asideLabel")}>
          <EstimatePanel idPrefix="estimate-inline" />
        </aside>
      </div>
    </div>
  );
}
