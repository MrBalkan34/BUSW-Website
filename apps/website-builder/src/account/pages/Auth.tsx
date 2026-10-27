import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { api, errorText } from "../api";
import { Link, navigate, safeNext, useQuery, withNext } from "../router";
import { useSession } from "../session";
import { AField, Notice, Page } from "../ui";

/** The address just registered, kept only in memory so it is never placed in a URL. */
let pendingEmail = "";
const origin = () => window.location.origin;
const MIN = 10;

function useLegal() {
  const [legal, setLegal] = useState<{ privacyUrl: string | null; termsUrl: string | null }>({ privacyUrl: null, termsUrl: null });
  useEffect(() => {
    void api<{ privacyUrl: string | null; termsUrl: string | null }>("GET", "/api/config").then((r) => {
      if (r.ok && r.data) setLegal({ privacyUrl: r.data.privacyUrl ?? null, termsUrl: r.data.termsUrl ?? null });
    });
  }, []);
  return legal;
}

export function SignInPage() {
  const { t } = useI18n();
  const { state, refresh } = useSession();
  const next = safeNext(useQuery().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"password" | "code">("password");
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (state === "signedIn") navigate(next, { replace: true });
  }, [state, next]);

  const finish = async () => {
    await refresh();
    navigate(next, { replace: true });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const result = await api<{ twoFactorRedirect?: boolean }>("POST", "/api/auth/sign-in/email", { email: email.trim(), password });
    setBusy(false);
    if (result.ok) {
      if (result.data?.twoFactorRedirect) setStep("code");
      else await finish();
      return;
    }
    if (result.code === "EMAIL_NOT_VERIFIED") setInfo(t("acct.signIn.notVerified"));
    else if (result.status === 401 || result.code === "INVALID_EMAIL_OR_PASSWORD") setError(t("acct.signIn.invalid"));
    else setError(errorText(t, result));
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await api("POST", backup ? "/api/auth/two-factor/verify-backup-code" : "/api/auth/two-factor/verify-totp", { code: code.replace(/\s+/g, "") });
    setBusy(false);
    if (result.ok) await finish();
    else setError(result.status === 429 ? t("acct.error.rateLimited") : t("acct.mfa.invalid"));
  };

  if (step === "code") {
    return (
      <Page title={t("acct.mfa.title")} lede={t("acct.mfa.lede")} narrow>
        <form className="panel" onSubmit={verify} noValidate>
          <AField label={backup ? t("acct.mfa.backupCode") : t("acct.mfa.code")} value={code} onChange={setCode} autoComplete="one-time-code" inputMode={backup ? "text" : "numeric"} required error={error} />
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? t("acct.working") : t("acct.mfa.verify")}
            </button>
            <button className="btn btn-quiet" type="button" onClick={() => { setBackup((b) => !b); setCode(""); setError(null); }}>
              {backup ? t("acct.mfa.useApp") : t("acct.mfa.useBackup")}
            </button>
          </div>
        </form>
      </Page>
    );
  }

  return (
    <Page title={t("acct.signIn.title")} lede={t("acct.signIn.lede")} narrow>
      <form className="panel" onSubmit={submit} noValidate>
        {error && <Notice kind="error">{error}</Notice>}
        {info && <Notice kind="info">{info}</Notice>}
        <AField label={t("acct.signIn.email")} type="email" value={email} onChange={setEmail} autoComplete="username" required />
        <AField label={t("acct.signIn.password")} type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
        <div className="row">
          <button className="btn btn-primary" type="submit" disabled={busy || !email || !password}>
            {busy ? t("acct.working") : t("acct.signIn.submit")}
          </button>
          <Link to="/account/forgot-password">{t("acct.signIn.forgot")}</Link>
        </div>
        <p className="hint">{t("acct.signIn.keepWork")}</p>
      </form>
      <p>
        {t("acct.signIn.noAccount")} <Link to={withNext("/account/register", next)}>{t("acct.signIn.create")}</Link>
      </p>
    </Page>
  );
}

export function RegisterPage() {
  const { t, locale } = useI18n();
  const legal = useLegal();
  const next = safeNext(useQuery().get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < MIN) {
      setError(t("acct.register.tooShort", { min: MIN }));
      return;
    }
    setBusy(true);
    const result = await api("POST", "/api/auth/sign-up/email", { name: name.trim(), email: email.trim(), password, preferredLanguage: locale, callbackURL: `${origin()}/account/verify-email` });
    setBusy(false);
    if (result.ok) {
      pendingEmail = email.trim();
      navigate("/account/check-email");
    } else if (result.code === "PASSWORD_TOO_SHORT") setError(t("acct.register.tooShort", { min: MIN }));
    else setError(errorText(t, result));
  };

  return (
    <Page title={t("acct.register.title")} lede={t("acct.register.lede")} narrow>
      <form className="panel" onSubmit={submit} noValidate>
        {error && <Notice kind="error">{error}</Notice>}
        <AField label={t("acct.register.name")} value={name} onChange={setName} autoComplete="name" required maxLength={80} />
        <AField label={t("acct.register.email")} type="email" value={email} onChange={setEmail} autoComplete="username" required />
        <AField label={t("acct.register.password")} type="password" value={password} onChange={setPassword} autoComplete="new-password" required hint={t("acct.register.passwordHint", { min: MIN })} />
        {(legal.privacyUrl || legal.termsUrl) && (
          <p className="hint">
            {t("acct.register.legalLead")}{" "}
            {legal.privacyUrl && (
              <a href={legal.privacyUrl} target="_blank" rel="noopener noreferrer">
                {t("acct.register.privacy")}
              </a>
            )}
            {legal.privacyUrl && legal.termsUrl && " · "}
            {legal.termsUrl && (
              <a href={legal.termsUrl} target="_blank" rel="noopener noreferrer">
                {t("acct.register.terms")}
              </a>
            )}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={busy || !name || !email || !password}>
          {busy ? t("acct.working") : t("acct.register.submit")}
        </button>
      </form>
      <p>
        {t("acct.register.haveAccount")} <Link to={withNext("/account/sign-in", next)}>{t("acct.signIn.submit")}</Link>
      </p>
    </Page>
  );
}

/** Asks for another verification email, and says plainly whether the request went through. */
function ResendBox({ initial }: { initial: string }) {
  const { t } = useI18n();
  const [email, setEmail] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const send = async () => {
    setBusy(true);
    const result = await api("POST", "/api/auth/send-verification-email", { email: email.trim(), callbackURL: `${origin()}/account/verify-email` });
    setBusy(false);
    setMessage(result.ok ? { kind: "success", text: t("acct.check.resent") } : { kind: "error", text: errorText(t, result) });
  };
  return (
    <div className="panel">
      {!initial && <AField label={t("acct.signIn.email")} type="email" value={email} onChange={setEmail} autoComplete="username" />}
      <p className="hint">{t("acct.check.notArrived")}</p>
      <button type="button" className="btn" disabled={busy || !email} onClick={() => void send()}>
        {busy ? t("acct.working") : t("acct.check.resend")}
      </button>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
    </div>
  );
}

export function CheckEmailPage() {
  const { t } = useI18n();
  return (
    <Page title={t("acct.check.title")} lede={t("acct.check.body")} narrow>
      <ResendBox initial={pendingEmail} />
      <p>
        <Link to="/account/sign-in">{t("acct.check.toSignIn")}</Link>
      </p>
    </Page>
  );
}

export function VerifyEmailPage() {
  const { t } = useI18n();
  const error = useQuery().get("error");
  if (!error) {
    return (
      <Page title={t("acct.verify.okTitle")} lede={t("acct.verify.okBody")} narrow>
        <Link className="btn btn-primary" to="/account/sign-in">
          {t("acct.signIn.submit")}
        </Link>
      </Page>
    );
  }
  const used = error === "token_used";
  return (
    <Page title={used ? t("acct.verify.usedTitle") : t("acct.verify.badTitle")} lede={used ? t("acct.verify.usedBody") : t("acct.verify.badBody")} narrow>
      <ResendBox initial="" />
      <p>
        <Link to="/account/sign-in">{t("acct.check.toSignIn")}</Link>
      </p>
    </Page>
  );
}

export function ForgotPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await api("POST", "/api/auth/request-password-reset", { email: email.trim(), redirectTo: `${origin()}/account/reset-password` });
    setBusy(false);
    // The same wording whether or not an account uses the address. Only a failure of the mail system itself is reported.
    setMessage(result.ok ? { kind: "success", text: t("acct.forgot.sent") } : { kind: "error", text: errorText(t, result) });
  };
  return (
    <Page title={t("acct.forgot.title")} lede={t("acct.forgot.lede")} narrow>
      <form className="panel" onSubmit={submit} noValidate>
        <AField label={t("acct.signIn.email")} type="email" value={email} onChange={setEmail} autoComplete="username" required />
        <button className="btn btn-primary" type="submit" disabled={busy || !email}>
          {busy ? t("acct.working") : t("acct.forgot.submit")}
        </button>
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
      </form>
      <p>
        <Link to="/account/sign-in">{t("acct.check.toSignIn")}</Link>
      </p>
    </Page>
  );
}

export function ResetPage() {
  const { t } = useI18n();
  const query = useQuery();
  const token = query.get("token");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || query.get("error")) {
    return (
      <Page title={t("acct.reset.title")} lede={t("acct.reset.invalid")} narrow>
        <Link className="btn btn-primary" to="/account/forgot-password">
          {t("acct.reset.request")}
        </Link>
      </Page>
    );
  }
  if (done) {
    return (
      <Page title={t("acct.reset.title")} lede={t("acct.reset.done")} narrow>
        <Link className="btn btn-primary" to="/account/sign-in">
          {t("acct.signIn.submit")}
        </Link>
      </Page>
    );
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < MIN) return setError(t("acct.register.tooShort", { min: MIN }));
    setBusy(true);
    const result = await api("POST", "/api/auth/reset-password", { newPassword: password, token });
    setBusy(false);
    if (result.ok) {
      setDone(true);
      window.history.replaceState(null, "", "/account/reset-password"); // the token leaves the address bar
    } else setError(result.status === 400 || result.status === 401 ? t("acct.reset.invalid") : errorText(t, result));
  };
  return (
    <Page title={t("acct.reset.title")} narrow>
      <form className="panel" onSubmit={submit} noValidate>
        <AField label={t("acct.reset.password")} type="password" value={password} onChange={setPassword} autoComplete="new-password" required hint={t("acct.register.passwordHint", { min: MIN })} error={error} />
        <button className="btn btn-primary" type="submit" disabled={busy || !password}>
          {busy ? t("acct.working") : t("acct.reset.submit")}
        </button>
      </form>
    </Page>
  );
}
