import { useState } from "react";
import { Canvas, type DeviceId } from "../editor/Canvas";
import { exportWarnings } from "../export/exportSite";
import { useI18n } from "../i18n/I18nProvider";
import { pageFile } from "../model/order";
import { useWorkspace } from "./workspace";

const PREVIEW_DEVICES = [
  { id: "desktop", labelKey: "device.desktop", width: 1280 },
  { id: "phone", labelKey: "device.mobile", width: 375 },
] as const;

/**
 * A read-only look at the design. There is deliberately no way to download it as a website: BUSW builds, checks and deploys the
 * finished site after review, so the client cannot lift a ready-made copy and run it elsewhere.
 */
export function PreviewStep() {
  const { project, goto } = useWorkspace();
  const { t } = useI18n();
  const [device, setDevice] = useState<DeviceId>("desktop");
  const [pageId, setPageId] = useState(project.pages[0]?.id ?? "");

  const page = project.pages.find((p) => p.id === pageId) ?? project.pages[0]!;
  const warnings = exportWarnings(project, t);

  return (
    <div className="step preview-step">
      <header className="step-header">
        <p className="eyebrow">{t("step.eyebrow", { n: 3, total: 6 })}</p>
        <h1>{t("preview.title")}</h1>
        <p className="lede">{t("preview.lede")}</p>
      </header>

      <div className="toolbar" role="toolbar" aria-label={t("preview.toolbar")}>
        <div className="toolbar-group" role="group" aria-label={t("preview.page")}>
          {project.pages.map((p) => (
            <button key={p.id} type="button" className="btn" aria-pressed={p.id === page.id} onClick={() => setPageId(p.id)}>
              {p.title || t("common.untitledPage")}
            </button>
          ))}
        </div>
        <div className="toolbar-group" role="group" aria-label={t("preview.screenSize")}>
          {PREVIEW_DEVICES.map((d) => (
            <button key={d.id} type="button" className="btn" aria-pressed={device === d.id} onClick={() => setDevice(d.id)}>
              {t(d.labelKey)} <span className="muted">{d.width}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-group">
          <button type="button" className="btn" onClick={() => goto("design")}>
            {t("preview.backToEditing")}
          </button>
        </div>
      </div>

      <div className="preview-stage">
        <Canvas
          project={project}
          page={page}
          device={device}
          onNavigatePage={(file) => {
            const target = project.pages.find((p) => pageFile(p) === file);
            if (target) setPageId(target.id);
          }}
        />
      </div>

      <section className="panel" aria-labelledby="check-heading">
        <h2 id="check-heading">{t("preview.checkHeading")}</h2>
        <p>{t("preview.checkBody")}</p>
        {warnings.length > 0 ? (
          <ul className="warnings">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : (
          <p>{t("preview.noProblems")}</p>
        )}
      </section>
    </div>
  );
}
