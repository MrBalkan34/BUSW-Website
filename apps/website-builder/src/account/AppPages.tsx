import { Component, useEffect, type ReactNode } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { PageShell } from "./AccountMenu";
import { AdminAccountDetailPage, AdminAccountsPage, AdminAuditPage } from "./pages/AdminAccounts";
import { AdminBuswDetailPage, AdminBuswPage, AdminGate, AdminHomePage } from "./pages/Admin";
import { CheckEmailPage, ForgotPage, RegisterPage, ResetPage, SignInPage, VerifyEmailPage } from "./pages/Auth";
import { DashboardPage } from "./pages/Dashboard";
import { SecurityPage, SettingsPage } from "./pages/Settings";
import { Link, navigate, withNext, type Route } from "./router";
import { useSession } from "./session";
import { Notice, Page } from "./ui";

/** Pages that need a signed-in person send everyone else to sign in, and bring them back afterwards. */
function RequireSignIn({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { state } = useSession();
  useEffect(() => {
    if (state === "anonymous") navigate(withNext("/account/sign-in", `${window.location.pathname}${window.location.search}`), { replace: true });
  }, [state]);
  if (state === "loading") return <Page title={t("acct.loading")}>{null}</Page>;
  if (state === "unavailable") {
    return (
      <Page title={t("acct.brand")}>
        <Notice kind="info">{t("acct.unavailable")}</Notice>
        <Link className="btn btn-primary" to="/">
          {t("acct.menu.builder")}
        </Link>
      </Page>
    );
  }
  if (state !== "signedIn") return null;
  return <>{children}</>;
}

/**
 * If a page ever fails while drawing, say so and offer a way out, rather than leaving a blank screen. The builder's own
 * work is not affected: it is saved on this device as the person goes.
 */
class PageErrorBoundary extends Component<{ children: ReactNode; message: string; action: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="acct-page acct-narrow">
        <Notice kind="error">{this.props.message}</Notice>
        <a className="btn btn-primary" href="/">
          {this.props.action}
        </a>
      </div>
    );
  }
}

/** Every page of the app outside the builder: account, dashboard and administration. */
export function AppPages({ route }: { route: Route }) {
  const { t } = useI18n();
  let page: ReactNode;
  switch (route.name) {
    case "signIn":
      page = <SignInPage />;
      break;
    case "register":
      page = <RegisterPage />;
      break;
    case "checkEmail":
      page = <CheckEmailPage />;
      break;
    case "verifyEmail":
      page = <VerifyEmailPage />;
      break;
    case "forgot":
      page = <ForgotPage />;
      break;
    case "reset":
      page = <ResetPage />;
      break;
    case "settings":
      page = <RequireSignIn><SettingsPage /></RequireSignIn>;
      break;
    case "security":
      page = <RequireSignIn><SecurityPage /></RequireSignIn>;
      break;
    case "dashboard":
      page = <RequireSignIn><DashboardPage /></RequireSignIn>;
      break;
    case "admin":
      page = <AdminGate need="home"><AdminHomePage /></AdminGate>;
      break;
    case "adminBusw":
      page = <AdminGate need="busw"><AdminBuswPage /></AdminGate>;
      break;
    case "adminBuswDetail":
      page = <AdminGate need="busw"><AdminBuswDetailPage id={route.id as string} /></AdminGate>;
      break;
    case "adminAccounts":
      page = <AdminGate need="accounts"><AdminAccountsPage /></AdminGate>;
      break;
    case "adminAccountDetail":
      page = <AdminGate need="accounts"><AdminAccountDetailPage id={route.id as string} /></AdminGate>;
      break;
    case "adminAudit":
      page = <AdminGate need="accounts"><AdminAuditPage /></AdminGate>;
      break;
    default:
      page = (
        <Page title={t("acct.brand")}>
          <Link className="btn btn-primary" to="/">
            {t("acct.menu.builder")}
          </Link>
        </Page>
      );
  }
  return (
    <PageShell>
      <PageErrorBoundary key={route.name + (route.id ?? "")} message={t("acct.error.generic")} action={t("acct.menu.builder")}>
        {page}
      </PageErrorBoundary>
    </PageShell>
  );
}
