import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Me } from "./api";

export type SessionState = "loading" | "anonymous" | "signedIn" | "unavailable";

interface SessionValue {
  state: SessionState;
  me: Me | null;
  refresh(): Promise<Me | null>;
  signOut(): Promise<void>;
}

const Context = createContext<SessionValue | null>(null);

/**
 * Who is signed in, as the server says. If the account server cannot be reached (for example a copy of the builder
 * with no server behind it), the state is "unavailable": the builder keeps working on its own and account features hide.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>("loading");
  const [me, setMe] = useState<Me | null>(null);

  const refresh = useCallback(async (): Promise<Me | null> => {
    // Ask the cheap, always-200 question first, so a signed-out visitor never triggers a failed request.
    const probe = await api<{ signedIn?: boolean }>("GET", "/api/public/session");
    if (!probe.ok || typeof probe.data?.signedIn !== "boolean") {
      setMe(null);
      setState("unavailable"); // no server, a proxy error, or a page that is not JSON
      return null;
    }
    if (!probe.data.signedIn) {
      setMe(null);
      setState("anonymous");
      return null;
    }
    const result = await api<Me>("GET", "/api/me");
    if (result.ok && result.data && typeof result.data === "object" && "id" in result.data) {
      setMe(result.data);
      setState("signedIn");
      return result.data;
    }
    setMe(null);
    // 401 is a real "not signed in". Anything else (no server, a proxy error, a page that is not JSON) is "unavailable".
    setState(result.status === 401 ? "anonymous" : "unavailable");
    return null;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await api("POST", "/api/auth/sign-out", {});
    setMe(null);
    setState("anonymous");
  }, []);

  const value = useMemo(() => ({ state, me, refresh, signOut }), [state, me, refresh, signOut]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(Context);
  if (!value) throw new Error("useSession must be used inside the SessionProvider");
  return value;
}
