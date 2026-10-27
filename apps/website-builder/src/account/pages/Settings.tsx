import QRCode from "qrcode";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { LOCALES, type LocaleCode } from "../../i18n/locales";
import { countryOptions } from "../../pricing/regions";
import { api, errorText, type Me } from "../api";
import { Link, navigate, withNext } from "../router";
import { useSession } from "../session";
import { AField, Notice, Page } from "../ui";

const MIN = 10;

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { me, refresh } = useSession();
  const countries = useMemo(() => countryOptions(locale), [locale]);
  const [name, setName] = useState(me?.name ?? "");
  const [language, setLanguage] = useState<LocaleCode>((me?.preferredLanguage as LocaleCode) ?? "en");
  const [business, setBusiness] = useState(me?.business.name ?? "");
  const [country, setCountry] = useState(me?.business.country ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  if (!me) return null;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await api<Me>("PATCH", "/api/me", { name: name.trim(), preferredLanguage: language, business: { name: business.trim(), country: country || null } });
    setBusy(false);
    if (!result.ok) return setMessage({ kind: "error", text: errorText(t, result) });
    await refresh();
    if (language !== locale) setLocale(language);
    setMessage({ kind: "success", text: t("acct.saved") });
  };

  return (
    <Page title={t("acct.settings.title")} lede={t("acct.settings.lede")} narrow>
      <form className="panel" onSubmit={save} noValidate>
        <h2>{t("acct.settings.profile")}</h2>
        <AField label={t("acct.settings.name")} value={name} onChange={setName} autoComplete="name" maxLength={80} required />
        <div className="field">
          <span className="label-like">{t("acct.settings.email")}</span>
          <p>{me.email}</p>
          <p className="hint">
            {t("acct.settings.emailNote")} <Link to="/account/security">{t("acct.menu.security")}</Link>
          </p>
        </div>
        <div className="field">
          <label htmlFor="pref-lang">{t("acct.settings.language")}</label>
          <select id="pref-lang" value={language} onChange={(e) => setLanguage(e.target.value as LocaleCode)}>
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          <p className="hint">{t("acct.settings.languageHint")}</p>
        </div>

        <h2>{t("acct.settings.business")}</h2>
        <AField label={t("acct.settings.businessName")} value={business} onChange={setBusiness} autoComplete="organization" maxLength={120} />
        <div className="field">
          <label htmlFor="biz-country">{t("acct.settings.businessCountry")}</label>
          <select id="biz-country" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">{t("acct.settings.noCountry")}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="hint">{t("acct.settings.businessHint")}</p>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
          {busy ? t("acct.working") : t("acct.save")}
        </button>
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
      </form>

      <section className="panel" aria-labelledby="apps-h">
        <h2 id="apps-h">{t("acct.settings.apps")}</h2>
        {me.apps.length === 0 ? <p>{t("acct.settings.appsNone")}</p> : <ul className="plain-list">{me.apps.map((a) => <li key={a.id}>{a.id === "busw" ? t("acct.settings.appBusw") : a.id}</li>)}</ul>}
      </section>
    </Page>
  );
}

interface SessionRow {
  id: string;
  createdAt: string;
  device: string;
  current: boolean;
}

export function SignInAgain({ next }: { next: string }) {
  const { t } = useI18n();
  const { signOut } = useSession();
  return (
    <Notice kind="info">
      {t("acct.error.reauth")}{" "}
      <button
        type="button"
        className="link-button"
        onClick={async () => {
          await signOut();
          navigate(withNext("/account/sign-in", next));
        }}
      >
        {t("acct.error.reauthButton")}
      </button>
    </Notice>
  );
}

export function SecurityPage() {
  const { t, formatDate } = useI18n();
  const { me, refresh, signOut } = useSession();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const loadSessions = async () => {
    const r = await api<{ sessions: SessionRow[] }>("GET", "/api/account/sessions");
    if (r.ok) setSessions(r.data.sessions);
  };
  useEffect(() => {
    void loadSessions();
  }, []);
  if (!me) return null;

  return (
    <Page title={t("acct.security.title")} narrow>
      {me.access.staffNeedsMfa && !me.security.mfaEnabled && <Notice kind="info">{t("acct.security.mfaStaffNote")}</Notice>}
      <PasswordForm />
      <EmailForm email={me.email} />
      <section className="panel" aria-labelledby="sess-h">
        <h2 id="sess-h">{t("acct.security.sessions")}</h2>
        <p className="hint">{t("acct.security.sessionsLead")}</p>
        <ul className="session-list">
          {sessions.map((s) => (
            <li key={s.id}>
              <div>
                <strong>{s.device || t("acct.security.unknownDevice")}</strong>
                {s.current && <span className="tag">{t("acct.security.thisDevice")}</span>}
                <div className="hint">{t("acct.security.started", { when: formatDate(s.createdAt) })}</div>
              </div>
              {!s.current && (
                <button type="button" className="btn btn-quiet" onClick={async () => { await api("DELETE", `/api/account/sessions/${s.id}`); await loadSessions(); }}>
                  {t("acct.security.revoke")}
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="row">
          <button type="button" className="btn" disabled={sessions.length < 2} onClick={async () => { await api("POST", "/api/account/sessions/revoke-others", {}); await loadSessions(); }}>
            {t("acct.security.revokeOthers")}
          </button>
          <button type="button" className="btn" onClick={async () => { await api("POST", "/api/account/sessions/revoke-all", {}); await signOut(); navigate("/account/sign-in"); }}>
            {t("acct.security.revokeAll")}
          </button>
        </div>
      </section>
      <MfaSection me={me} onChanged={() => void refresh()} />
    </Page>
  );
}

function PasswordForm() {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (next.length < MIN) return setMessage({ kind: "error", text: t("acct.register.tooShort", { min: MIN }) });
    setBusy(true);
    const r = await api("POST", "/api/auth/change-password", { currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setBusy(false);
    if (r.ok) {
      setCurrent("");
      setNext("");
      setMessage({ kind: "success", text: t("acct.security.passwordChanged") });
    } else setMessage({ kind: "error", text: r.status === 400 || r.status === 401 ? t("acct.security.passwordWrong") : errorText(t, r) });
  };
  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2>{t("acct.security.password")}</h2>
      <AField label={t("acct.security.currentPassword")} type="password" value={current} onChange={setCurrent} autoComplete="current-password" required />
      <AField label={t("acct.security.newPassword")} type="password" value={next} onChange={setNext} autoComplete="new-password" required hint={t("acct.register.passwordHint", { min: MIN })} />
      <button className="btn btn-primary" type="submit" disabled={busy || !current || !next}>
        {busy ? t("acct.working") : t("acct.security.changePassword")}
      </button>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
    </form>
  );
}

function EmailForm({ email }: { email: string }) {
  const { t } = useI18n();
  const [next, setNext] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [reauth, setReauth] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setReauth(false);
    const r = await api("POST", "/api/account/change-email", { newEmail: next.trim(), currentPassword: password });
    setBusy(false);
    if (r.status === 202 || r.ok) {
      setPassword("");
      setMessage({ kind: "success", text: t("acct.security.emailHow") });
    } else if (r.code === "reauth_required") setReauth(true);
    else if (r.code === "wrong_password") setMessage({ kind: "error", text: t("acct.security.emailWrongPassword") });
    else if (r.code === "same_email") setMessage({ kind: "error", text: t("acct.security.emailSame") });
    else setMessage({ kind: "error", text: errorText(t, r) });
  };
  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2>{t("acct.security.email")}</h2>
      <p className="hint">{t("acct.security.emailLead", { email })}</p>
      <AField label={t("acct.security.newEmail")} type="email" value={next} onChange={setNext} autoComplete="email" required />
      <AField label={t("acct.security.currentPassword")} type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
      <button className="btn btn-primary" type="submit" disabled={busy || !next || !password}>
        {busy ? t("acct.working") : t("acct.security.changeEmail")}
      </button>
      {reauth && <SignInAgain next="/account/security" />}
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
    </form>
  );
}

function MfaSection({ me, onChanged }: { me: Me; onChanged(): void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<{ uri: string; key: string; codes: string[]; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const start = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const r = await api<{ totpURI: string; backupCodes: string[] }>("POST", "/api/auth/two-factor/enable", { password });
    setBusy(false);
    if (!r.ok) return setMessage({ kind: "error", text: r.status === 401 || r.status === 400 ? t("acct.security.passwordWrong") : errorText(t, r) });
    const key = new URL(r.data.totpURI).searchParams.get("secret") ?? "";
    const qr = await QRCode.toDataURL(r.data.totpURI, { margin: 1, width: 192 });
    setPassword("");
    setSetup({ uri: r.data.totpURI, key, codes: r.data.backupCodes, qr });
    setMessage(null);
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const r = await api("POST", "/api/auth/two-factor/verify-totp", { code: code.replace(/\s+/g, "") });
    setBusy(false);
    if (!r.ok) return setMessage({ kind: "error", text: t("acct.mfa.invalid") });
    setSetup(null);
    setCode("");
    setMessage({ kind: "success", text: t("acct.security.mfaDone") });
    onChanged();
  };

  const disable = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const r = await api("POST", "/api/auth/two-factor/disable", { password });
    setBusy(false);
    if (!r.ok) return setMessage({ kind: "error", text: t("acct.security.passwordWrong") });
    setPassword("");
    setMessage({ kind: "success", text: t("acct.security.mfaDisabled") });
    onChanged();
  };

  return (
    <section className="panel" aria-labelledby="mfa-h">
      <h2 id="mfa-h">{t("acct.security.mfa")}</h2>
      {setup ? (
        <form onSubmit={confirm} noValidate>
          <p>{t("acct.security.mfaScan")}</p>
          <img className="qr" src={setup.qr} width={192} height={192} alt="" />
          <p>
            <strong>{t("acct.security.mfaKey")}:</strong> <code>{setup.key}</code>
          </p>
          <h3>{t("acct.security.mfaBackup")}</h3>
          <p className="hint">{t("acct.security.mfaBackupHint")}</p>
          <ul className="backup-codes">
            {setup.codes.map((c) => (
              <li key={c}>
                <code>{c}</code>
              </li>
            ))}
          </ul>
          <AField label={t("acct.security.mfaConfirm")} value={code} onChange={setCode} autoComplete="one-time-code" inputMode="numeric" required />
          <button className="btn btn-primary" type="submit" disabled={busy || !code}>
            {busy ? t("acct.working") : t("acct.mfa.verify")}
          </button>
        </form>
      ) : me.security.mfaEnabled ? (
        <form onSubmit={disable} noValidate>
          <p>{t("acct.security.mfaOn")}</p>
          <AField label={t("acct.security.mfaPassword")} type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
          <button className="btn btn-danger" type="submit" disabled={busy || !password}>
            {t("acct.security.mfaDisable")}
          </button>
        </form>
      ) : (
        <form onSubmit={start} noValidate>
          <p>{t("acct.security.mfaOff")}</p>
          <AField label={t("acct.security.mfaPassword")} type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
          <button className="btn btn-primary" type="submit" disabled={busy || !password}>
            {t("acct.security.mfaSetup")}
          </button>
        </form>
      )}
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
    </section>
  );
}

