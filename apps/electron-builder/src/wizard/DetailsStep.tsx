import { useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { LIMITS, validateClient, type ClientField } from "../model/draft";
import { TextField } from "../ui/controls";
import { useWorkspace } from "./workspace";

export function DetailsStep() {
  const { draft, setClient, showErrors } = useWorkspace();
  const { t } = useI18n();
  const { client } = draft;
  const [touched, setTouched] = useState<Partial<Record<ClientField, boolean>>>({});
  const errors = validateClient(client, t);
  const shown = (field: ClientField): string | undefined => (showErrors || touched[field] ? errors[field] : undefined);
  const touch = (field: ClientField) => () => setTouched((current) => ({ ...current, [field]: true }));

  return (
    <div className="step details-step">
      <header className="step-header">
        <p className="eyebrow">{t("step.eyebrow", { n: 5, total: 6 })}</p>
        <h1>{t("details.title")}</h1>
        <p className="lede">{t("details.lede")}</p>
        <p className="hint">{t("details.hint")}</p>
      </header>

      <form className="panel form-narrow" noValidate onSubmit={(e) => e.preventDefault()}>
        <TextField label={t("field.businessName")} required autoComplete="organization" value={client.businessName} max={LIMITS.name} error={shown("businessName")} onBlur={touch("businessName")} onChange={(v) => setClient("businessName", v)} />
        <TextField label={t("field.contactName")} required autoComplete="name" value={client.contactName} max={LIMITS.name} error={shown("contactName")} onBlur={touch("contactName")} onChange={(v) => setClient("contactName", v)} hint={t("details.contactHint")} />
        <TextField label={t("field.email")} required type="email" autoComplete="email" value={client.email} max={LIMITS.short} error={shown("email")} onBlur={touch("email")} onChange={(v) => setClient("email", v)} hint={t("details.emailHint")} />
        <TextField label={t("field.notes")} multiline value={client.notes} max={LIMITS.notes} onChange={(v) => setClient("notes", v)} hint={t("details.notesHint", { used: client.notes.length, max: LIMITS.notes })} />
      </form>
    </div>
  );
}
