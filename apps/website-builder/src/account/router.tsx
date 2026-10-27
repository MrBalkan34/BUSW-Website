import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";

export type RouteName =
  | "builder"
  | "signIn"
  | "register"
  | "checkEmail"
  | "verifyEmail"
  | "forgot"
  | "reset"
  | "settings"
  | "security"
  | "dashboard"
  | "admin"
  | "adminBusw"
  | "adminBuswDetail"
  | "adminAccounts"
  | "adminAccountDetail"
  | "adminAudit"
  | "notFound";

export interface Route {
  name: RouteName;
  id?: string;
}

const FIXED: Record<string, RouteName> = {
  "/": "builder",
  "/account/sign-in": "signIn",
  "/account/register": "register",
  "/account/check-email": "checkEmail",
  "/account/verify-email": "verifyEmail",
  "/account/forgot-password": "forgot",
  "/account/reset-password": "reset",
  "/account/settings": "settings",
  "/account/security": "security",
  "/dashboard": "dashboard",
  "/admin": "admin",
  "/admin/busw": "adminBusw",
  "/admin/accounts": "adminAccounts",
  "/admin/audit": "adminAudit",
};

export function parseRoute(pathname: string): Route {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const fixed = FIXED[path];
  if (fixed) return { name: fixed };
  const detail = /^\/admin\/(busw|accounts)\/([A-Za-z0-9_-]{1,80})$/.exec(path);
  if (detail) return { name: detail[1] === "busw" ? "adminBuswDetail" : "adminAccountDetail", id: detail[2] };
  return { name: "notFound" };
}

/**
 * Where to go after signing in. Only a path inside this app is accepted: it must start with a single "/", must not
 * be protocol-relative, contain a backslash or control character, and must be one of our own pages. Anything else,
 * including any address on another site, becomes the fallback.
 */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u001f]/.test(raw)) return fallback;
  let url: URL;
  try {
    url = new URL(raw, "http://internal.invalid");
  } catch {
    return fallback;
  }
  if (url.origin !== "http://internal.invalid") return fallback;
  if (parseRoute(url.pathname).name === "notFound") return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

export const withNext = (path: string, next: string): string => `${path}?next=${encodeURIComponent(safeNext(next, "/"))}`;

const EVENT = "busw:navigate";

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const target = safeNext(to, "/");
  if (options.replace) window.history.replaceState(null, "", target);
  else window.history.pushState(null, "", target);
  window.dispatchEvent(new Event(EVENT));
  window.scrollTo?.({ top: 0 });
}

export function useRoute(): Route {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    window.addEventListener(EVENT, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(EVENT, update);
    };
  }, []);
  return parseRoute(path);
}

/** The current query string, kept in step with navigation. */
export function useQuery(): URLSearchParams {
  const [search, setSearch] = useState(() => window.location.search);
  useEffect(() => {
    const update = () => setSearch(window.location.search);
    window.addEventListener("popstate", update);
    window.addEventListener(EVENT, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(EVENT, update);
    };
  }, []);
  return new URLSearchParams(search);
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string;
  children: ReactNode;
}

/** An ordinary link that moves within the app without reloading, so the design in progress is never lost. */
export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
