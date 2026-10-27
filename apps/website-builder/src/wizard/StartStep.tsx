import { useId, useMemo, useRef, useState } from "react";
import { TemplateGrid } from "../editor/TemplateGallery";
import { useI18n } from "../i18n/I18nProvider";
import { regionLabel } from "../i18n/labels";
import type { Project } from "../model/types";
import { countryOptions, regionForCountry } from "../pricing/regions";
import { readProjectFile } from "../storage/projectFile";
import { blankProject, type Template } from "../templates/templates";
import { useWorkspace } from "./workspace";

/** Picks the business country. It only chooses the price list and currency; it never changes the design. */
export function CountrySelect({ id: idProp, describedBy }: { id?: string; describedBy?: string }) {
  const { project, setOrder } = useWorkspace();
  const { t, locale } = useI18n();
  const generated = useId();
  const id = idProp ?? generated;
  // Country names follow the interface language; the stored value is the country code, which never changes.
  const options = useMemo(() => countryOptions(locale), [locale]);
  return (
    <select id={id} aria-describedby={describedBy} value={project.order.country ?? ""} onChange={(e) => setOrder(["country"], e.target.value === "" ? null : e.target.value)}>
      <option value="">{t("start.countryPlaceholder")}</option>
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

export function RegionNote() {
  const { project } = useWorkspace();
  const { t, rich } = useI18n();
  const region = regionForCountry(project.order.country);
  if (!region) return <p className="hint">{t("start.regionHint")}</p>;
  return <p className="region-note">{rich("start.regionNote", { currency: <strong>{region.currency}</strong>, label: regionLabel(t, region.id) })}</p>;
}

export function StartStep() {
  const { project, startProject, goto, issues } = useWorkspace();
  const { t } = useI18n();
  const countryId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const hasDesign = project.templateId !== null;

  /** A new design keeps the client's country and details, but starts with no add-ons. */
  const begin = (next: Project): void => {
    if (hasDesign && !window.confirm(t("start.confirmReplace"))) return;
    setError(null);
    startProject({ ...next, order: { ...next.order, country: project.order.country, client: project.order.client } });
    goto("design");
  };

  const pick = (template: Template): void => {
    if (template.id === project.templateId) {
      goto("design");
      return;
    }
    begin(template.build());
  };

  const openFile = async (file: File): Promise<void> => {
    const result = await readProjectFile(file);
    if (!result.ok) {
      const reason = result.code === "too-large" ? t("start.fileTooLarge") : result.code === "not-project" ? t("start.fileNotProject") : result.error;
      setError(t("start.fileError", { reason }));
      return;
    }
    if (hasDesign && !window.confirm(t("start.confirmOpenFile"))) return;
    setError(null);
    startProject(result.project);
    goto("design");
  };

  return (
    <div className="step start-step">
      <header className="step-header">
        <p className="eyebrow">{t("step.eyebrow", { n: 1, total: 6 })}</p>
        <h1>{t("start.title")}</h1>
        <p className="lede">{t("start.lede")}</p>
        <p className="hint">{t("start.savedHint")}</p>
      </header>

      {error && (
        <p className="error banner" role="alert">
          {error}
        </p>
      )}

      <section className="panel" aria-labelledby="country-heading">
        <h2 id="country-heading">{t("start.countryHeading")}</h2>
        <div className="field">
          <label htmlFor={countryId}>{t("start.countryLabel")}</label>
          <CountrySelect id={countryId} describedBy={`${countryId}-note`} />
          <div id={`${countryId}-note`}>
            <RegionNote />
          </div>
          {issues.start && project.order.country === null && <p className="hint warn">{t("start.countryRequired")}</p>}
        </div>
      </section>

      <section aria-labelledby="templates-heading">
        <h2 id="templates-heading">{t("start.templatesHeading")}</h2>
        <TemplateGrid selectedId={project.templateId === "blank" ? null : project.templateId} onPick={pick} />
      </section>

      <section className="panel" aria-labelledby="other-heading">
        <h2 id="other-heading">{t("start.otherHeading")}</h2>
        <div className="row">
          <button type="button" className={`btn${project.templateId === "blank" ? " btn-selected" : ""}`} onClick={() => (project.templateId === "blank" ? goto("design") : begin(blankProject()))}>
            {project.templateId === "blank" ? t("start.keepBlank") : t("start.startBlank")}
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            {t("start.openFile")}
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void openFile(f); e.target.value = ""; }} />
        </div>
      </section>
    </div>
  );
}
