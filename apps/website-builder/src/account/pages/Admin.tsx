import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { itemLabel, quoteLabel, sectionLabel, startingPointLabel } from "../../i18n/labels";
import type { Addons, QuoteId, SectionType } from "../../model/types";
import type { ItemId } from "../../pricing/catalogue";
import { formatMoney } from "../../pricing/format";
import { REGIONS, countryName, type RegionId } from "../../pricing/regions";
import { selectionSummary } from "../../submission/brief";
import { API_BASE, api, errorText } from "../api";
import { Link, navigate, withNext } from "../router";
import { useSession } from "../session";
import { AField, ConfirmAction, Notice, Page, Pager } from "../ui";

/** Who may see an administration page, and what to show everyone else. Server checks remain the real gate. */
export function AdminGate({ need, children }: { need: "busw" | "accounts" | "home"; children: ReactNode }) {
  const { t } = useI18n();
  const { state, me } = useSession();
  useEffect(() => {
    if (state === "anonymous") navigate(withNext("/account/sign-in", window.location.pathname), { replace: true });
  }, [state]);
  if (state === "loading") return <Page title={t("admin.title")}><p>{t("acct.loading")}</p></Page>;
  if (state === "unavailable") return <Page title={t("admin.title")}><Notice kind="info">{t("acct.unavailable")}</Notice></Page>;
  if (!me) return <Page title={t("admin.title")}><p>{t("admin.signInFirst")}</p></Page>;
  if (need === "home" && !me.ownerProvisioned) return <SetupInstructions />;
  const allowed = need === "busw" ? me.access.buswAdmin : need === "accounts" ? me.access.accountAdmin : me.access.buswAdmin || me.access.accountAdmin;
  if (!allowed) return <Page title={t("admin.title")}><Notice kind="error">{t("admin.notAuthorized")}</Notice></Page>;
  if (me.access.staffNeedsMfa) {
    return (
      <Page title={t("admin.title")}>
        <Notice kind="info">{me.security.mfaEnabled ? t("admin.mfaSession") : t("admin.mfaNeeded")}</Notice>
        <Link className="btn btn-primary" to="/account/security">
          {t("admin.mfaButton")}
        </Link>
      </Page>
    );
  }
  return <>{children}</>;
}

function SetupInstructions() {
  const { t } = useI18n();
  return (
    <Page title={t("admin.setup.title")} lede={t("admin.setup.lede")}>
      <ol className="setup-steps panel">
        <li>{t("admin.setup.step1")}</li>
        <li>
          {t("admin.setup.step2")}
          <pre>{"cd apps/server\nnpm run find-user -- --email <address>"}</pre>
        </li>
        <li>
          {t("admin.setup.step3")}
          <pre>{"npm run bootstrap-owner -- --user-id <account id>"}</pre>
        </li>
        <li>{t("admin.setup.step4")}</li>
      </ol>
      <p className="hint">{t("admin.setup.docs")}</p>
    </Page>
  );
}

interface Overview {
  ownerProvisioned: boolean;
  checklist: { emailTransport: "configured" | "development-only"; emailReachable: boolean; privacyUrl: boolean; termsUrl: boolean; mfaRequiredForStaff: boolean };
}

export function AdminHomePage() {
  const { t } = useI18n();
  const { me } = useSession();
  const [overview, setOverview] = useState<Overview | null>(null);
  useEffect(() => {
    if (me?.access.accountAdmin) void api<Overview>("GET", "/api/account-admin/overview").then((r) => r.ok && setOverview(r.data));
  }, [me]);
  if (!me) return null;
  const tile = (to: string, title: string, text: string) => (
    <Link className="tile" to={to}>
      <strong>{title}</strong>
      <span>{text}</span>
    </Link>
  );
  const c = overview?.checklist;
  return (
    <Page title={t("admin.title")}>
      <div className="tiles">
        {me.access.buswAdmin && tile("/admin/busw", t("admin.home.busw"), t("admin.home.buswText"))}
        {me.access.accountAdmin && tile("/admin/accounts", t("admin.home.accounts"), t("admin.home.accountsText"))}
        {me.access.accountAdmin && tile("/admin/audit", t("admin.home.audit"), t("admin.home.auditText"))}
      </div>
      {c && (
        <section className="panel" aria-labelledby="check-h">
          <h2 id="check-h">{t("admin.home.checklist")}</h2>
          <dl className="facts">
            <div>
              <dt>{t("admin.check.email")}</dt>
              <dd>{c.emailTransport === "development-only" ? t("admin.check.emailDev") : c.emailReachable ? t("admin.check.emailOk") : t("admin.check.emailDown")}</dd>
            </div>
            <div>
              <dt>{t("admin.check.privacy")}</dt>
              <dd>{c.privacyUrl ? t("admin.check.set") : t("admin.check.missing")}</dd>
            </div>
            <div>
              <dt>{t("admin.check.terms")}</dt>
              <dd>{c.termsUrl ? t("admin.check.set") : t("admin.check.missing")}</dd>
            </div>
            <div>
              <dt>{t("admin.check.mfa")}</dt>
              <dd>{t("admin.check.required")}</dd>
            </div>
          </dl>
        </section>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------- BUSW administration

interface ListItem {
  id: string;
  reference: string;
  status: string;
  receivedAt: string;
  business: string;
  currency: string;
  oneTimeTotalMinor: number;
  ownershipStatus: "owned" | "needs_review";
  region?: RegionId;
}

const STATUSES = ["received", "in_review", "quoted", "closed"] as const;

export function AdminBuswPage() {
  const { t, formatDate } = useI18n();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [review, setReview] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; pageSize: number; items: ListItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (review) params.set("ownership", "needs_review");
    const r = await api<{ total: number; pageSize: number; items: ListItem[] }>("GET", `/api/busw/admin/submissions?${params}`);
    if (r.ok) (setData(r.data), setError(null));
    else setError(errorText(t, r));
  }, [page, q, status, review, t]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Page title={t("admin.busw.title")} lede={t("admin.busw.lede")}>
      <form className="panel filters" onSubmit={(e) => { e.preventDefault(); setPage(1); void load(); }}>
        <AField label={t("admin.busw.search")} value={q} onChange={(v) => { setQ(v); setPage(1); }} />
        <div className="field">
          <label htmlFor="f-status">{t("admin.busw.status")}</label>
          <select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t("admin.any")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={review} onChange={(e) => { setReview(e.target.checked); setPage(1); }} />
          <span>{t("admin.busw.needsReview")}</span>
        </label>
      </form>
      {error && <Notice kind="error">{error}</Notice>}
      {data && (data.items.length === 0 ? <p>{t("admin.empty")}</p> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("admin.busw.colRef")}</th>
                <th>{t("admin.busw.colBusiness")}</th>
                <th>{t("admin.busw.colStatus")}</th>
                <th>{t("admin.busw.colReceived")}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link to={`/admin/busw/${i.id}`}>{i.reference}</Link>
                    {i.ownershipStatus === "needs_review" && <span className="tag">{t("admin.busw.flag")}</span>}
                  </td>
                  <td>{i.business}</td>
                  <td>{t(`status.${i.status as (typeof STATUSES)[number]}`)}</td>
                  <td>{formatDate(i.receivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {data && <Pager page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </Page>
  );
}

interface Detail {
  id: string;
  reference: string;
  status: (typeof STATUSES)[number];
  receivedAt: string;
  currency: string;
  region: RegionId;
  ownershipStatus: "owned" | "needs_review";
  owner: { id: string; name: string | null } | null;
  discrepancies: string[];
  snapshot: {
    client: { businessName: string; contactName: string; email: string; notes: string };
    country: string;
    template: { id: string | null };
    design: { pages: { title: string; slug: string; sections: { type: SectionType; props: { heading?: string } }[] }[] };
    addons: Addons;
    assets: { id: string; name: string; width: number; height: number }[];
  };
  estimate: { oneTimeTotalMinor: number; monthlyTotalMinor: number; lines: { id: string; quantity: number; totalMinor: number }[]; quoteOnly: { id: string }[] };
  notes: { id: string; author: string | null; body: string; createdAt: string }[];
  quotes: { id: string; title: string; message: string; oneTimeMinor: number; monthlyMinor: number; createdAt: string }[];
}

export function AdminBuswDetailPage({ id }: { id: string }) {
  const { t, formatDate, locale } = useI18n();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ submission: Detail }>("GET", `/api/busw/admin/submissions/${id}`);
    if (r.ok) (setD(r.data.submission), setError(null));
    else setError(errorText(t, r));
  }, [id, t]);
  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <Page title={t("admin.busw.title")}><Notice kind="error">{error}</Notice><Link to="/admin/busw">{t("admin.busw.back")}</Link></Page>;
  if (!d) return <Page title={t("admin.busw.title")}><p>{t("acct.loading")}</p></Page>;

  const region = REGIONS[d.region];
  const money = (n: number) => formatMoney(n, region);
  const act = (fn: () => Promise<{ ok: boolean; status: number; code: string | null }>) => async (): Promise<string | null> => {
    const r = await fn();
    if (r.ok) {
      await load();
      return null;
    }
    return errorText(t, r);
  };

  return (
    <Page title={d.reference}>
      <p>
        <Link to="/admin/busw">{t("admin.busw.back")}</Link>
      </p>
      <section className="panel" aria-labelledby="cl-h">
        <h2 id="cl-h">{t("admin.busw.client")}</h2>
        {/* Everything below is the client's own text. It is shown as plain text and never interpreted as markup. */}
        <dl className="facts">
          <div><dt>{t("admin.busw.colBusiness")}</dt><dd>{d.snapshot.client.businessName}</dd></div>
          <div><dt>{t("admin.busw.contact")}</dt><dd>{d.snapshot.client.contactName}</dd></div>
          <div><dt>{t("admin.busw.email")}</dt><dd>{d.snapshot.client.email}</dd></div>
          <div><dt>{t("review.country")}</dt><dd>{countryName(d.snapshot.country, locale)}</dd></div>
          <div><dt>{t("review.template")}</dt><dd>{startingPointLabel(t, d.snapshot.template.id)}</dd></div>
          {d.snapshot.client.notes.trim() && <div><dt>{t("admin.busw.notes")}</dt><dd className="pre">{d.snapshot.client.notes}</dd></div>}
          <div><dt>{t("admin.busw.owner")}</dt><dd>{d.owner ? `${d.owner.name ?? ""} (${d.owner.id})` : t("admin.busw.ownerNone")}</dd></div>
          <div><dt>{t("admin.busw.colReceived")}</dt><dd>{formatDate(d.receivedAt)}</dd></div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="ds-h">
        <h2 id="ds-h">{t("admin.busw.design")}</h2>
        <ul className="plain-list">
          {d.snapshot.design.pages.map((p) => (
            <li key={p.slug}>
              <strong>{p.title || t("admin.busw.untitled")}</strong> ({p.slug}.html): {t("admin.busw.sections", { count: p.sections.length })}
              <ul>
                {p.sections.map((s, i) => (
                  <li key={i}>
                    {sectionLabel(t, s.type)}
                    {s.props.heading ? `: ${s.props.heading}` : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <h3>{t("review.addonsHeading")}</h3>
        {selectionSummary(d.snapshot.addons, t).length ? <ul className="plain-list">{selectionSummary(d.snapshot.addons, t).map((s) => <li key={s}>{s}</li>)}</ul> : <p>{t("review.noAddons")}</p>}
        {d.snapshot.assets.length > 0 && (
          <>
            <h3>{t("admin.busw.images")}</h3>
            <div className="thumbs">
              {d.snapshot.assets.map((a) => (
                <img key={a.id} src={`${API_BASE}/api/assets/${a.id}`} alt={a.name} width={96} loading="lazy" crossOrigin={API_BASE ? "use-credentials" : undefined} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel" aria-labelledby="pr-h">
        <h2 id="pr-h">{t("admin.busw.price")}</h2>
        <ul className="plain-list">
          {d.estimate.lines.map((l) => (
            <li key={l.id}>
              {itemLabel(t, l.id as ItemId)}{l.quantity > 1 ? ` × ${l.quantity}` : ""}: {money(l.totalMinor)}
            </li>
          ))}
          {d.estimate.quoteOnly.map((q) => <li key={q.id}>{quoteLabel(t, q.id as QuoteId)}</li>)}
        </ul>
        <p>
          {t("dash.oneTime")}: <strong>{money(d.estimate.oneTimeTotalMinor)}</strong> · {t("dash.monthly")}: <strong>{money(d.estimate.monthlyTotalMinor)}</strong> ({d.currency})
        </p>
        {d.discrepancies.length > 0 && (
          <>
            <h3>{t("admin.busw.discrepancies")}</h3>
            <ul className="plain-list">{d.discrepancies.map((x) => <li key={x}>{x}</li>)}</ul>
          </>
        )}
      </section>

      <StatusForm d={d} act={act} />
      <NotesForm d={d} act={act} formatDate={formatDate} />
      <QuoteForm d={d} money={money} act={act} formatDate={formatDate} />
      {d.ownershipStatus === "needs_review" && <AssignOwner id={d.id} act={act} />}
    </Page>
  );
}

type Act = (fn: () => Promise<{ ok: boolean; status: number; code: string | null }>) => () => Promise<string | null>;

function StatusForm({ d, act }: { d: Detail; act: Act }) {
  const { t } = useI18n();
  const [status, setStatus] = useState(d.status);
  const [msg, setMsg] = useState<string | null>(null);
  // The server can move the status itself (sending a quote marks it "quote sent"); keep the selector in step.
  useEffect(() => setStatus(d.status), [d.status]);
  return (
    <section className="panel" aria-labelledby="st-h">
      <h2 id="st-h">{t("admin.busw.statusSet")}</h2>
      <div className="row">
        <select aria-labelledby="st-h" value={status} onChange={(e) => setStatus(e.target.value as Detail["status"])}>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
        <button type="button" className="btn btn-primary" disabled={status === d.status} onClick={async () => setMsg((await act(() => api("PATCH", `/api/busw/admin/submissions/${d.id}/status`, { status }))()) ?? t("admin.busw.updated"))}>
          {t("admin.busw.statusSave")}
        </button>
      </div>
      {msg && <Notice kind="info">{msg}</Notice>}
    </section>
  );
}

function NotesForm({ d, act, formatDate }: { d: Detail; act: Act; formatDate(v: string): string }) {
  const { t } = useI18n();
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <section className="panel" aria-labelledby="nt-h">
      <h2 id="nt-h">{t("admin.busw.staffNotes")}</h2>
      <ul className="plain-list">
        {d.notes.map((n) => (
          <li key={n.id}>
            <span className="hint">{n.author} · {formatDate(n.createdAt)}</span>
            <p className="pre">{n.body}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={async (e: FormEvent) => { e.preventDefault(); const err = await act(() => api("POST", `/api/busw/admin/submissions/${d.id}/notes`, { body }))(); setMsg(err); if (!err) setBody(""); }}>
        <div className="field">
          <label htmlFor="note-body">{t("admin.busw.noteAdd")}</label>
          <textarea id="note-body" rows={3} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={!body.trim()}>{t("admin.busw.noteSave")}</button>
        {msg && <Notice kind="error">{msg}</Notice>}
      </form>
    </section>
  );
}

const toMinor = (v: string): number => Math.round((parseFloat(v.replace(",", ".")) || 0) * 100);

function QuoteForm({ d, money, act, formatDate }: { d: Detail; money(n: number): string; act: Act; formatDate(v: string): string }) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [one, setOne] = useState("");
  const [monthly, setMonthly] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <section className="panel" aria-labelledby="qt-h">
      <h2 id="qt-h">{t("admin.busw.quoteHeading")}</h2>
      {d.quotes.length > 0 && (
        <>
          <h3>{t("admin.busw.quotesSent")}</h3>
          <ul className="plain-list">
            {d.quotes.map((q) => <li key={q.id}><strong>{q.title}</strong> · {money(q.oneTimeMinor)} / {money(q.monthlyMinor)} · {formatDate(q.createdAt)}</li>)}
          </ul>
        </>
      )}
      <form onSubmit={async (e: FormEvent) => { e.preventDefault(); const err = await act(() => api("POST", `/api/busw/admin/submissions/${d.id}/quotes`, { title, message, oneTimeMinor: toMinor(one), monthlyMinor: toMinor(monthly) }))(); setMsg(err); if (!err) (setTitle(""), setMessage(""), setOne(""), setMonthly("")); }}>
        <AField label={t("admin.busw.quoteTitle")} value={title} onChange={setTitle} maxLength={160} required />
        <div className="field">
          <label htmlFor="q-msg">{t("admin.busw.quoteMessage")}</label>
          <textarea id="q-msg" rows={4} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <AField label={t("admin.busw.quoteOneTime", { currency: d.currency })} value={one} onChange={setOne} inputMode="numeric" />
        <AField label={t("admin.busw.quoteMonthly", { currency: d.currency })} value={monthly} onChange={setMonthly} inputMode="numeric" />
        <button className="btn btn-primary" type="submit" disabled={!title.trim() || !message.trim()}>{t("admin.busw.quoteSend")}</button>
        {msg && <Notice kind="error">{msg}</Notice>}
      </form>
    </section>
  );
}

function AssignOwner({ id, act }: { id: string; act: Act }) {
  const { t } = useI18n();
  const [userId, setUserId] = useState("");
  return (
    <section className="panel" aria-labelledby="as-h">
      <h2 id="as-h">{t("admin.busw.assign")}</h2>
      <p className="hint">{t("admin.busw.assignHint")}</p>
      <AField label={t("admin.busw.assignId")} value={userId} onChange={setUserId} />
      <ConfirmAction label={t("admin.busw.assignDo")} confirmLabel={t("admin.busw.assignDo")} disabled={!userId.trim()} onConfirm={(reason) => act(() => api("POST", `/api/busw/admin/submissions/${id}/assign-owner`, { userId: userId.trim(), reason }))()} />
    </section>
  );
}
