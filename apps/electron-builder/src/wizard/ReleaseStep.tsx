import { useI18n } from "../i18n/I18nProvider";
import { itemScope } from "../i18n/labels";
import { CheckField } from "../ui/controls";
import { EstimatePanel } from "./EstimatePanel";
import { usePricing } from "./pricing";
import { useWorkspace } from "./workspace";

export function ReleaseStep() {
  const { draft, estimate, setOrder } = useWorkspace();
  const { t } = useI18n();
  const { priced } = usePricing();
  const o = draft.order;

  return (
    <div className="step release-step">
      <header className="step-header">
        <p className="eyebrow">{t("step.eyebrow", { n: 3, total: 6 })}</p>
        <h1>{t("release.title")}</h1>
        <p className="lede">{t("release.lede")}</p>
      </header>

      {estimate.issues.length > 0 && (
        <section className="banner banner-warn" role="status" aria-labelledby="issues-heading">
          <div>
            <h2 id="issues-heading">{t("release.issuesHeading")}</h2>
            <ul>
              {estimate.issues.map((issue) => (
                <li key={issue.code}>{t(`release.issue.${issue.code}`)}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="addons-layout">
        <div className="addons-main">
          <section className="panel" aria-labelledby="platforms-heading">
            <h2 id="platforms-heading">{t("release.platformsHeading")}</h2>
            <CheckField label={t("release.windowsIncluded")} checked disabled onChange={() => undefined} hint={t("release.windowsIncludedHint")} />
            <CheckField label={priced("platform-macos")} checked={o.platforms.macos} onChange={(v) => setOrder("platforms", { ...o.platforms, macos: v })} hint={`${itemScope(t, "platform-macos")} ${t("release.macNote")}`} />
            <CheckField label={priced("platform-linux")} checked={o.platforms.linux} onChange={(v) => setOrder("platforms", { ...o.platforms, linux: v })} hint={itemScope(t, "platform-linux")} />
            <CheckField label={priced("platform-windows-arm64")} checked={o.platforms.windowsArm64} onChange={(v) => setOrder("platforms", { ...o.platforms, windowsArm64: v })} hint={itemScope(t, "platform-windows-arm64")} />
          </section>

          <section className="panel" aria-labelledby="signing-heading">
            <h2 id="signing-heading">{t("release.signingHeading")}</h2>
            <p className="hint">{t("release.signingHint")}</p>
            <p className="hint">{itemScope(t, "code-signing-setup")}</p>
            <CheckField label={priced("code-signing-setup", false, t("release.signingWindows"))} checked={o.signing.windows} onChange={(v) => setOrder("signing", { ...o.signing, windows: v })} />
            <CheckField
              label={priced("code-signing-setup", false, t("release.signingMacos"))}
              checked={o.signing.macos}
              disabled={!o.platforms.macos && !o.signing.macos}
              onChange={(v) => setOrder("signing", { ...o.signing, macos: v })}
              hint={o.platforms.macos ? undefined : t("release.signingNeedsMac")}
            />
          </section>

          <section className="panel" aria-labelledby="delivery-heading">
            <h2 id="delivery-heading">{t("release.deliveryHeading")}</h2>
            <CheckField label={priced("auto-update-setup")} checked={o.autoUpdate} onChange={(v) => setOrder("autoUpdate", v)} hint={itemScope(t, "auto-update-setup")} />
            <CheckField label={priced("ci-release-pipeline")} checked={o.ciPipeline} onChange={(v) => setOrder("ciPipeline", v)} hint={itemScope(t, "ci-release-pipeline")} />
            <CheckField label={priced("error-reporting-setup")} checked={o.errorReporting} onChange={(v) => setOrder("errorReporting", v)} hint={itemScope(t, "error-reporting-setup")} />
          </section>

          <section className="panel" aria-labelledby="third-heading">
            <h2 id="third-heading">{t("release.thirdHeading")}</h2>
            <p className="hint">{t("release.thirdLede")}</p>
            <ul className="plain-list">
              <li>{t("release.third.apple")}</li>
              <li>{t("release.third.windows")}</li>
              <li>{t("release.third.other")}</li>
            </ul>
          </section>
        </div>

        <aside className="addons-aside" aria-label={t("review.asideLabel")}>
          <EstimatePanel idPrefix="estimate-inline" />
        </aside>
      </div>
    </div>
  );
}
