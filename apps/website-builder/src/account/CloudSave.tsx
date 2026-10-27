import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { useWorkspace } from "../wizard/workspace";
import { api, errorText } from "./api";
import { navigate, withNext } from "./router";
import { useSession } from "./session";

/**
 * "Save to my account" in the Design step. Saving over a linked design carries the revision it was opened at, so a
 * newer copy saved elsewhere is never overwritten silently: the person is told and can save a separate copy instead.
 */
export function CloudSave() {
  const { t } = useI18n();
  const { state } = useSession();
  const { project, cloud, setCloud } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [conflict, setConflict] = useState(false);

  if (state === "unavailable" || state === "loading") return null;
  if (state === "anonymous") {
    return (
      <button type="button" className="btn" onClick={() => navigate(withNext("/account/sign-in", "/"))}>
        {t("cloud.signIn")}
      </button>
    );
  }

  const create = async (copy: boolean) => {
    setBusy(true);
    const r = await api<{ project: { id: string; revision: number; name: string } }>("POST", "/api/projects", { project });
    setBusy(false);
    if (!r.ok) return setMessage({ kind: "error", text: r.code === "limit_reached" ? t("cloud.limit") : t("cloud.failed") });
    setCloud({ id: r.data.project.id, revision: r.data.project.revision, name: r.data.project.name });
    setConflict(false);
    setMessage({ kind: "ok", text: copy ? t("cloud.copySaved") : t("cloud.saved") });
  };

  const save = async () => {
    setMessage(null);
    if (!cloud) return create(false);
    setBusy(true);
    const r = await api<{ project: { revision: number; name: string } }>("PUT", `/api/projects/${cloud.id}`, { project, baseRevision: cloud.revision });
    setBusy(false);
    if (r.ok) {
      setCloud({ ...cloud, revision: r.data.project.revision, name: r.data.project.name });
      setMessage({ kind: "ok", text: t("cloud.saved") });
    } else if (r.status === 409 && r.code === "revision_conflict") {
      setConflict(true);
      setMessage({ kind: "error", text: t("cloud.conflict") });
    } else setMessage({ kind: "error", text: r.status === 404 ? t("cloud.failed") : errorText(t, r) });
  };

  return (
    <div className="toolbar-group">
      <button type="button" className="btn" disabled={busy} onClick={() => void save()}>
        {busy ? t("cloud.saving") : t("cloud.save")}
      </button>
      {conflict && (
        <button type="button" className="btn" disabled={busy} onClick={() => void create(true)}>
          {t("cloud.saveCopy")}
        </button>
      )}
      {message && (
        <span className={message.kind === "error" ? "error" : "status"} role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
        </span>
      )}
    </div>
  );
}
