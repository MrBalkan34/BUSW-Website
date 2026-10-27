import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { Link, navigate, safeNext, withNext } from "./router";
import { useSession } from "./session";
import { FounderBadge } from "./ui";

const here = () => safeNext(`${window.location.pathname}${window.location.search}`, "/");

/** Sign in and create-account links, or the signed-in person's menu. Hidden when this copy has no account server. */
export function AccountMenu() {
  const { t } = useI18n();
  const { state, me, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onPointer = (event: MouseEvent) => {
      if (holder.current && !holder.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  if (state === "loading" || state === "unavailable") return null;

  if (state === "anonymous" || !me) {
    return (
      <div className="acct-links">
        <Link className="btn" to={withNext("/account/sign-in", here())}>
          {t("acct.menu.signIn")}
        </Link>
        <Link className="btn btn-primary" to={withNext("/account/register", here())}>
          {t("acct.menu.register")}
        </Link>
      </div>
    );
  }

  const item = (to: string, label: string): ReactNode => (
    <li>
      <Link to={to} onClick={() => setOpen(false)}>
        {label}
      </Link>
    </li>
  );

  return (
    <div className="acct-menu" ref={holder}>
      <button ref={button} type="button" className="btn acct-menu-button" aria-expanded={open} aria-controls="acct-menu-list" aria-label={`${t("acct.menu.label")}: ${t("acct.menu.signedInAs", { name: me.name })}`} onClick={() => setOpen((o) => !o)}>
        <span className="acct-name">{me.name}</span>
        <FounderBadge badge={me.badge} />
      </button>
      {open && (
        <ul id="acct-menu-list" className="acct-menu-list">
          {item("/dashboard", t("acct.menu.dashboard"))}
          {item("/account/settings", t("acct.menu.settings"))}
          {item("/account/security", t("acct.menu.security"))}
          {item("/", t("acct.menu.builder"))}
          {me.access.buswAdmin && item("/admin/busw", t("acct.menu.adminBusw"))}
          {me.access.accountAdmin && item("/admin/accounts", t("acct.menu.adminAccounts"))}
          {me.access.accountAdmin && item("/admin/audit", t("acct.menu.adminAudit"))}
          <li>
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await signOut();
                navigate("/");
              }}
            >
              {t("acct.menu.signOut")}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

/** The frame around account, dashboard and administration pages: the same header as the builder, minus the steps. */
export function PageShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="shell shell-page">
      <a className="skip-link" href="#main">
        {t("wizard.skip")}
      </a>
      <header className="shell-header">
        <div className="shell-bar">
          <p className="shell-brand">
            <Link to="/">
              <strong>BUSW Website Builder</strong>
            </Link>{" "}
            <span className="tag">{t("wizard.brandTag")}</span>
          </p>
          <LanguageSwitcher />
          <AccountMenu />
        </div>
      </header>
      <main id="main" className="shell-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
