import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { itemLabel, quoteLabel, startingPointLabel } from "../../i18n/labels";
import type { Project } from "../../model/types";
import type { QuoteId } from "../../model/types";
import type { ItemId } from "../../pricing/catalogue";
import { formatMoney } from "../../pricing/format";
import { REGIONS, type RegionId } from "../../pricing/regions";
import { useWorkspace } from "../../wizard/workspace";
import { api, errorText } from "../api";
import { navigate } from "../router";
import { useSession } from "../session";
import { Notice, Page } from "../ui";

interface ProjectSummary {
  id: string;
  name: string;
  templateId: string | null;
  revision: number;
  source: "cloud" | "local-import";
  updatedAt: string;
}

interface SubmissionView {
  id: string;
  reference: string;
  status: "received" | "in_review" | "quoted" | "closed";
  submittedAt: string;
  currency: string;
  region: RegionId;
  template: string | null;
  pages: { title: string; slug: string; sections: number }[];
  pricing: { oneTimeTotalMinor: number; monthlyTotalMinor: number; lines: { id: string; quantity: number; unitPriceMinor: number; totalMinor: number; billing: "one-time" | "monthly" }[]; quoteOnly: string[] };
  quotes: { id: string; title: string; message: string; currency: string; oneTimeMinor: number; monthlyMinor: number; createdAt: string }[];
}

export function DashboardPage() {
  const { t, formatDate } = useI18n();
  const { me } = useSession();
  const { project, openCloudProject } = useWorkspace();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionView[] | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const restricted = me?.access.busw === "restricted";

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([api<{ projects: ProjectSummary[] }>("GET", "/api/projects"), api<{ submissions: SubmissionView[] }>("GET", "/api/submissions")]);
    setProjects(p.ok ? p.data.projects : []);
    setSubmissions(s.ok ? s.data.submissions : []);
  }, []);
  useEffect(() => {
    if (!restricted) void load();
  }, [load, restricted]);

  const resume = async (summary: ProjectSummary) => {
    if (project.templateId !== null && !window.confirm(t("dash.confirmResume"))) return;
    setOpening(summary.id);
    const r = await api<{ project: ProjectSummary; data: Project }>("GET", `/api/projects/${summary.id}`);
    setOpening(null);
    if (!r.ok) return setMessage({ kind: "error", text: t("dash.openFailed") });
    openCloudProject(r.data.data, { id: r.data.project.id, revision: r.data.project.revision, name: r.data.project.name });
    navigate("/");
  };

  const remove = async (summary: ProjectSummary) => {
    if (!window.confirm(t("dash.confirmDelete", { name: summary.name }))) return;
    const r = await api("DELETE", `/api/projects/${summary.id}`);
    if (!r.ok) setMessage({ kind: "error", text: errorText(t, r) });
    await load();
  };

  const importLocal = async () => {
    const r = await api("POST", "/api/projects/import-local", { project });
    if (r.ok) {
      setMessage({ kind: "success", text: t("dash.importDone") });
      await load();
    } else setMessage({ kind: "error", text: r.code === "limit_reached" ? t("dash.importLimit") : errorText(t, r) });
  };

  if (restricted) {
    return (
      <Page title={t("dash.title")}>
        <Notice kind="error">{t("dash.restricted")}</Notice>
      </Page>
    );
  }

  return (
    <Page title={t("dash.title")} lede={t("dash.lede")}>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}

      <section className="panel" aria-labelledby="designs-h">
        <h2 id="designs-h">{t("dash.designs")}</h2>
        {projects === null ? (
          <p>{t("acct.loading")}</p>
        ) : projects.length === 0 ? (
          <p>{t("dash.designsEmpty")}</p>
        ) : (
          <ul className="dash-list">
            {projects.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <div className="hint">
                    {startingPointLabel(t, p.templateId)} · {t("dash.updated", { when: formatDate(p.updatedAt) })}
                    {p.source === "local-import" && ` · ${t("dash.fromLocal")}`}
                  </div>
                </div>
                <div className="row">
                  <button type="button" className="btn btn-primary" disabled={opening === p.id} onClick={() => void resume(p)}>
                    {opening === p.id ? t("dash.opening") : t("dash.resume")}
                  </button>
                  <button type="button" className="btn btn-quiet" onClick={() => void remove(p)}>
                    {t("dash.delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="import-h">
        <h2 id="import-h">{t("dash.import")}</h2>
        {project.templateId === null ? (
          <p>{t("dash.importNone")}</p>
        ) : (
          <>
            <p>{t("dash.importBody", { name: project.site.title || startingPointLabel(t, project.templateId) })}</p>
            <button type="button" className="btn" onClick={() => void importLocal()}>
              {t("dash.importButton")}
            </button>
          </>
        )}
      </section>

      <section className="panel" aria-labelledby="subs-h">
        <h2 id="subs-h">{t("dash.submissions")}</h2>
        {submissions === null ? <p>{t("acct.loading")}</p> : submissions.length === 0 ? <p>{t("dash.submissionsEmpty")}</p> : <ul className="dash-list">{submissions.map((s) => <SubmissionCard key={s.id} s={s} />)}</ul>}
      </section>
    </Page>
  );
}

function SubmissionCard({ s }: { s: SubmissionView }) {
  const { t, formatDate } = useI18n();
  const [open, setOpen] = useState(false);
  const region = REGIONS[s.region];
  const money = (minor: number) => formatMoney(minor, region);
  return (
    <li className="submission-card">
      <div className="row between">
        <div>
          <strong>{t("dash.reference", { reference: s.reference })}</strong>
          <div className="hint">{t("dash.sent", { when: formatDate(s.submittedAt) })}</div>
        </div>
        <span className={`status-pill status-${s.status}`}>{t(`status.${s.status}`)}</span>
      </div>
      <button type="button" className="btn btn-quiet" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? t("dash.hideDetails") : t("dash.viewDetails")}
      </button>
      {open && (
        <div className="submission-detail">
          <h3>{t("dash.pages")}</h3>
          <ul className="plain-list">
            {s.pages.map((p) => (
              <li key={p.slug}>
                <strong>{p.title || t("common.untitledPage")}</strong>: {t("list.sections", { count: p.sections })}
              </li>
            ))}
          </ul>
          <h3>{t("dash.price")}</h3>
          <ul className="plain-list">
            {s.pricing.lines.map((l) => (
              <li key={l.id}>
                {itemLabel(t, l.id as ItemId)}: {money(l.totalMinor)}
              </li>
            ))}
            {s.pricing.quoteOnly.map((q) => (
              <li key={q}>{quoteLabel(t, q as QuoteId)}</li>
            ))}
          </ul>
          <p>
            {t("dash.oneTime")}: <strong>{money(s.pricing.oneTimeTotalMinor)}</strong>
            {s.pricing.monthlyTotalMinor > 0 && (
              <>
                {" · "}
                {t("dash.monthly")}: <strong>{money(s.pricing.monthlyTotalMinor)}</strong>
              </>
            )}
          </p>
          <h3>{t("dash.quotes")}</h3>
          {s.quotes.length === 0 ? (
            <p>{t("dash.quotesNone")}</p>
          ) : (
            s.quotes.map((q) => (
              <div className="quote-box" key={q.id}>
                <strong>{q.title}</strong>
                <p className="pre">{q.message}</p>
                <p>
                  {t("dash.oneTime")}: {money(q.oneTimeMinor)}
                  {q.monthlyMinor > 0 && ` · ${t("dash.monthly")}: ${money(q.monthlyMinor)}`}
                </p>
                <p className="hint">{t("dash.quoteFrom", { when: formatDate(q.createdAt) })}</p>
              </div>
            ))
          )}
        </div>
      )}
    </li>
  );
}
