import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { api, errorText, type ApiResult } from "../api";
import { Link } from "../router";
import { useSession } from "../session";
import { AField, ConfirmAction, FounderBadge, Notice, Page, Pager } from "../ui";
import { SignInAgain } from "./Settings";

const ROLE_KEYS = ["platform:owner", "bu-account:admin", "bu-account:support", "busw:admin", "busw:staff"] as const;
const ROLE_LABEL = {
  "platform:owner": "admin.role.platformOwner",
  "bu-account:admin": "admin.role.buAdmin",
  "bu-account:support": "admin.role.buSupport",
  "busw:admin": "admin.role.buswAdmin",
  "busw:staff": "admin.role.buswStaff",
} as const;

type RoleKey = (typeof ROLE_KEYS)[number];
const roleLabelKey = (scope: string, role: string) => ROLE_LABEL[`${scope}:${role}` as RoleKey];

interface UserItem {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  status: "active" | "suspended";
  createdAt: string;
  badge: { label: string } | null;
  apps: string[];
  roles?: { scope: string; role: string }[];
}

export function AdminAccountsPage() {
  const { t, formatDate } = useI18n();
  const { me } = useSession();
  const full = me?.roles.some((r) => r.scope === "platform" || (r.scope === "bu-account" && r.role === "admin")) ?? false;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; pageSize: number; items: UserItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (verified) params.set("verified", verified);
    if (role) params.set("role", role);
    const r = await api<{ total: number; pageSize: number; items: UserItem[] }>("GET", `/api/account-admin/users?${params}`);
    if (r.ok) (setData(r.data), setError(null));
    else setError(errorText(t, r));
  }, [page, q, status, verified, role, t]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Page title={t("admin.acct.title")} lede={t("admin.acct.lede")}>
      <form className="panel filters" onSubmit={(e) => e.preventDefault()}>
        <AField label={full ? t("admin.acct.search") : t("admin.acct.searchSupport")} value={q} onChange={(v) => { setQ(v); setPage(1); }} />
        <div className="field">
          <label htmlFor="a-status">{t("admin.acct.status")}</label>
          <select id="a-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t("admin.any")}</option>
            <option value="active">{t("admin.acct.active")}</option>
            <option value="suspended">{t("admin.acct.suspended")}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="a-ver">{t("admin.acct.verified")}</label>
          <select id="a-ver" value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }}>
            <option value="">{t("admin.any")}</option>
            <option value="true">{t("admin.acct.yes")}</option>
            <option value="false">{t("admin.acct.no")}</option>
          </select>
        </div>
        {full && (
          <div className="field">
            <label htmlFor="a-role">{t("admin.acct.role")}</label>
            <select id="a-role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
              <option value="">{t("admin.any")}</option>
              {ROLE_KEYS.map((k) => <option key={k} value={k}>{t(ROLE_LABEL[k])}</option>)}
            </select>
          </div>
        )}
      </form>
      {error && <Notice kind="error">{error}</Notice>}
      {data && (data.items.length === 0 ? <p>{t("admin.empty")}</p> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("admin.acct.colName")}</th>
                <th>{t("admin.acct.colEmail")}</th>
                <th>{t("admin.acct.colStatus")}</th>
                <th>{t("admin.acct.colCreated")}</th>
                {full && <th>{t("admin.acct.colRoles")}</th>}
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link to={`/admin/accounts/${u.id}`}>{u.name}</Link> <FounderBadge badge={u.badge} />
                  </td>
                  <td>{u.email}</td>
                  <td>{u.status === "suspended" ? t("admin.acct.suspended") : t("admin.acct.active")}{!u.emailVerified && ` · ${t("admin.acct.verified")}: ${t("admin.acct.no")}`}</td>
                  <td>{formatDate(u.createdAt, { dateStyle: "medium" })}</td>
                  {full && <td>{(u.roles ?? []).map((r) => t(roleLabelKey(r.scope, r.role))).join(", ")}</td>}
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

interface UserDetail extends UserItem {
  statusReason: string | null;
  mfaEnabled?: boolean;
  roles?: { id?: string; scope: string; role: string }[];
  appAccess?: { appId: string; status: "active" | "restricted" }[];
  sessions?: { createdAt: string; device: string }[];
}

export function AdminAccountDetailPage({ id }: { id: string }) {
  const { t, formatDate } = useI18n();
  const { me } = useSession();
  const [u, setU] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reauth, setReauth] = useState(false);
  const [assistMsg, setAssistMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [grant, setGrant] = useState<RoleKey>("busw:staff");

  const full = me?.roles.some((r) => r.scope === "platform" || (r.scope === "bu-account" && r.role === "admin")) ?? false;
  const owner = me?.access.isOwner ?? false;

  const load = useCallback(async () => {
    const r = await api<{ user: UserDetail }>("GET", `/api/account-admin/users/${id}`);
    if (r.ok) (setU(r.data.user), setError(null));
    else setError(errorText(t, r));
  }, [id, t]);
  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <Page title={t("admin.acct.title")}><Notice kind="error">{error}</Notice><Link to="/admin/accounts">{t("admin.acct.back")}</Link></Page>;
  if (!u) return <Page title={t("admin.acct.title")}><p>{t("acct.loading")}</p></Page>;

  const run = (call: () => Promise<ApiResult>) => async (): Promise<string | null> => {
    setReauth(false);
    const r = await call();
    if (r.ok) {
      await load();
      return null;
    }
    if (r.code === "reauth_required") setReauth(true);
    return errorText(t, r);
  };
  const post = (path: string, body: object = {}) => api("POST", `/api/account-admin/users/${id}/${path}`, body);

  const assist = async (kind: "resend-verification" | "recovery") => {
    const r = await post(kind);
    setAssistMsg(r.ok ? { kind: "success", text: t("admin.acct.done") } : { kind: "error", text: errorText(t, r) });
  };

  return (
    <Page title={u.name}>
      <p>
        <Link to="/admin/accounts">{t("admin.acct.back")}</Link> <FounderBadge badge={u.badge} />
      </p>
      {reauth && <SignInAgain next={`/admin/accounts/${id}`} />}

      <section className="panel" aria-labelledby="ai-h">
        <h2 id="ai-h">{u.name}</h2>
        <dl className="facts">
          <div><dt>{t("admin.acct.id")}</dt><dd><code>{u.id}</code></dd></div>
          <div><dt>{t("admin.acct.colEmail")}</dt><dd>{u.email}</dd></div>
          <div><dt>{t("admin.acct.emailVerified")}</dt><dd>{u.emailVerified ? t("admin.acct.yes") : t("admin.acct.no")}</dd></div>
          <div><dt>{t("admin.acct.created")}</dt><dd>{formatDate(u.createdAt)}</dd></div>
          <div><dt>{t("admin.acct.accountStatus")}</dt><dd>{u.status === "suspended" ? t("admin.acct.suspended") : t("admin.acct.active")}{u.statusReason ? ` · ${t("admin.acct.statusReason", { reason: u.statusReason })}` : ""}</dd></div>
          {u.mfaEnabled !== undefined && <div><dt>{t("admin.acct.mfa")}</dt><dd>{u.mfaEnabled ? t("admin.acct.yes") : t("admin.acct.no")}</dd></div>}
          <div><dt>{t("admin.acct.connected")}</dt><dd>{u.apps.length ? u.apps.map((a) => (a === "busw" ? t("acct.settings.appBusw") : a)).join(", ") : "—"}</dd></div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="as-h2">
        <h2 id="as-h2">{t("admin.acct.assist")}</h2>
        <p className="hint">{t("admin.acct.assistNote")}</p>
        <div className="row">
          {!u.emailVerified && <button type="button" className="btn" onClick={() => void assist("resend-verification")}>{t("admin.acct.resendVerification")}</button>}
          <button type="button" className="btn" onClick={() => void assist("recovery")}>{t("admin.acct.sendRecovery")}</button>
        </div>
        {assistMsg && <Notice kind={assistMsg.kind}>{assistMsg.text}</Notice>}
      </section>

      {full && (
        <>
          <section className="panel" aria-labelledby="rl-h">
            <h2 id="rl-h">{t("admin.acct.rolesHeading")}</h2>
            {(u.roles ?? []).length === 0 ? <p>{t("admin.acct.rolesNone")}</p> : (
              <ul className="plain-list">
                {(u.roles ?? []).map((r) => (
                  <li key={r.id ?? `${r.scope}:${r.role}`}>
                    <strong>{t(roleLabelKey(r.scope, r.role))}</strong>
                    {owner && r.id && <ConfirmAction label={t("admin.acct.revokeRole")} confirmLabel={t("admin.acct.confirmRevokeRole")} danger onConfirm={(reason) => run(() => api("DELETE", `/api/account-admin/users/${id}/roles/${r.id}`, { reason }))()} />}
                  </li>
                ))}
              </ul>
            )}
            {owner ? (
              <RoleGrant grant={grant} setGrant={setGrant} run={run} id={id} />
            ) : <p className="hint">{t("admin.acct.rolesOnlyOwners")}</p>}
          </section>

          <section className="panel" aria-labelledby="ap-h">
            <h2 id="ap-h">{t("admin.acct.appAccess")}</h2>
            {(u.appAccess ?? []).map((a) => (
              <div key={a.appId} className="row between">
                <span>
                  {t("acct.settings.appBusw")}: <strong>{a.status === "restricted" ? t("admin.acct.appRestricted") : t("admin.acct.appActive")}</strong>
                </span>
                <ConfirmAction
                  label={a.status === "restricted" ? t("admin.acct.appAllow") : t("admin.acct.appRestrict")}
                  confirmLabel={a.status === "restricted" ? t("admin.acct.confirmAllow") : t("admin.acct.confirmRestrict")}
                  danger={a.status !== "restricted"}
                  onConfirm={(reason) => run(() => post("app-access", { appId: a.appId, status: a.status === "restricted" ? "active" : "restricted", reason }))()}
                />
              </div>
            ))}
          </section>

          <section className="panel" aria-labelledby="sx-h">
            <h2 id="sx-h">{t("admin.acct.sessions")}</h2>
            <p>{t("admin.acct.sessionsCount", { count: (u.sessions ?? []).length })}</p>
            <ul className="plain-list">{(u.sessions ?? []).map((s, i) => <li key={i}>{s.device || t("acct.security.unknownDevice")} · {formatDate(s.createdAt)}</li>)}</ul>
            <ConfirmAction label={t("admin.acct.revokeSessions")} confirmLabel={t("admin.acct.confirmRevoke")} onConfirm={(reason) => run(() => post("revoke-sessions", { reason }))()} />
          </section>

          <section className="panel" aria-labelledby="su-h">
            <h2 id="su-h">{u.status === "suspended" ? t("admin.acct.reactivate") : t("admin.acct.suspend")}</h2>
            <p className="hint">{t("admin.acct.suspendNote")}</p>
            {u.status === "suspended" ? (
              <ConfirmAction label={t("admin.acct.reactivate")} confirmLabel={t("admin.acct.confirmReactivate")} onConfirm={(reason) => run(() => post("reactivate", { reason }))()} />
            ) : (
              <ConfirmAction label={t("admin.acct.suspend")} confirmLabel={t("admin.acct.confirmSuspend")} danger onConfirm={(reason) => run(() => post("suspend", { reason }))()} />
            )}
          </section>
        </>
      )}
    </Page>
  );
}

function RoleGrant({ grant, setGrant, run, id }: { grant: RoleKey; setGrant(k: RoleKey): void; run: (c: () => Promise<ApiResult>) => () => Promise<string | null>; id: string }) {
  const { t } = useI18n();
  return (
    <div className="grant-box">
      <h3>{t("admin.acct.grant")}</h3>
      <div className="field">
        <label htmlFor="grant-role">{t("admin.acct.roleChoice")}</label>
        <select id="grant-role" value={grant} onChange={(e) => setGrant(e.target.value as RoleKey)}>
          {ROLE_KEYS.map((k) => <option key={k} value={k}>{t(ROLE_LABEL[k])}</option>)}
        </select>
      </div>
      <ConfirmAction label={t("admin.acct.grantDo")} confirmLabel={t("admin.acct.confirmGrant")} onConfirm={(reason) => { const [scope, role] = grant.split(":"); return run(() => api("POST", `/api/account-admin/users/${id}/roles`, { scope, role, reason }))(); }} />
    </div>
  );
}

interface AuditItem {
  id: string;
  at: string;
  actor: { type: string; id: string };
  action: string;
  target: { type: string; id: string };
  reason: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

const brief = (v: Record<string, unknown> | null) => (v ? Object.entries(v).map(([k, x]) => `${k}: ${String(x)}`).join(", ") : "—");

export function AdminAuditPage() {
  const { t, formatDate } = useI18n();
  const [target, setTarget] = useState("");
  const [action, setAction] = useState("");
  const [items, setItems] = useState<AuditItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (before?: string | null, append = false) => {
    const params = new URLSearchParams({ limit: "50" });
    if (target.trim()) params.set("target", target.trim());
    if (action.trim()) params.set("action", action.trim());
    if (before) params.set("before", before);
    const r = await api<{ items: AuditItem[]; next: string | null }>("GET", `/api/account-admin/audit?${params}`);
    if (!r.ok) return setError(errorText(t, r));
    setError(null);
    setItems((cur) => (append ? [...cur, ...r.data.items] : r.data.items));
    setNext(r.data.next);
  }, [target, action, t]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Page title={t("admin.audit.title")} lede={t("admin.audit.lede")}>
      <form className="panel filters" onSubmit={(e) => e.preventDefault()}>
        <AField label={t("admin.audit.account")} value={target} onChange={setTarget} />
        <AField label={t("admin.audit.action")} value={action} onChange={setAction} />
      </form>
      {error && <Notice kind="error">{error}</Notice>}
      {items.length === 0 ? <p>{t("admin.empty")}</p> : (
        <div className="table-wrap">
          <table className="data-table audit-table">
            <thead>
              <tr>
                <th>{t("admin.audit.colWhen")}</th>
                <th>{t("admin.audit.colActor")}</th>
                <th>{t("admin.audit.colAction")}</th>
                <th>{t("admin.audit.colTarget")}</th>
                <th>{t("admin.audit.colReason")}</th>
                <th>{t("admin.audit.colChange")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.at)}</td>
                  <td>{e.actor.type === "operator" ? `${t("admin.audit.operator")} (${e.actor.id.replace(/^operator:/, "")})` : <code>{e.actor.id}</code>}</td>
                  <td>{e.action}</td>
                  <td><code>{e.target.id}</code></td>
                  <td>{e.reason ?? "—"}</td>
                  <td>{brief(e.before)} → {brief(e.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {next && <button type="button" className="btn" onClick={() => void load(next, true)}>{t("admin.audit.more")}</button>}
    </Page>
  );
}
