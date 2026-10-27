import { useId, useState, type ReactNode } from "react";
import { useI18n } from "../i18n/I18nProvider";

export function FounderBadge({ badge }: { badge: { label: string } | null | undefined }) {
  // The designation text is fixed by the server and is not translated, so it can never be altered or misread.
  if (!badge) return null;
  return <span className="founder-badge">{badge.label}</span>;
}

export function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  return (
    <div className={`notice-line notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
  type?: "text" | "email" | "password" | "tel" | "number";
  autoComplete?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  inputMode?: "numeric" | "text";
  maxLength?: number;
  disabled?: boolean;
  placeholder?: string;
}

/** A labelled input with a hint and an error tied to it for assistive technology. Passwords can be shown and pasted. */
export function AField({ label, value, onChange, type = "text", autoComplete, hint, error, required, inputMode, maxLength, disabled, placeholder }: FieldProps) {
  const { t } = useI18n();
  const id = useId();
  const [shown, setShown] = useState(false);
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  const isPassword = type === "password";
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="required"> {t("common.required")}</span>}
      </label>
      <div className={isPassword ? "password-row" : undefined}>
        <input
          id={id}
          type={isPassword && shown ? "text" : type}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
        {isPassword && (
          <button type="button" className="btn btn-quiet" aria-pressed={shown} onClick={() => setShown((s) => !s)}>
            {shown ? t("acct.hide") : t("acct.show")}
          </button>
        )}
      </div>
      {error && (
        <p className="error" id={`${id}-error`}>
          {error}
        </p>
      )}
      {hint && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function Page({ title, lede, children, narrow = false }: { title: string; lede?: string; children: ReactNode; narrow?: boolean }) {
  return (
    <div className={`acct-page${narrow ? " acct-narrow" : ""}`}>
      <header className="step-header">
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </header>
      {children}
    </div>
  );
}

/**
 * A two-step control for anything weighty: the button opens a short form asking for a reason, and nothing happens
 * until that reason is given and the action is confirmed. Cancelling changes nothing.
 */
export function ConfirmAction({
  label,
  confirmLabel,
  onConfirm,
  needsReason = true,
  danger = false,
  disabled = false,
  extra,
}: {
  label: string;
  confirmLabel: string;
  onConfirm(reason: string): Promise<string | null>;
  needsReason?: boolean;
  danger?: boolean;
  disabled?: boolean;
  extra?: ReactNode;
}) {
  const { t } = useI18n();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const tooShort = needsReason && reason.trim().length < 3;

  const run = async () => {
    if (tooShort) {
      setMessage({ kind: "error", text: t("admin.reasonShort") });
      return;
    }
    setBusy(true);
    const error = await onConfirm(reason.trim());
    setBusy(false);
    if (error) setMessage({ kind: "error", text: error });
    else {
      setMessage({ kind: "success", text: t("admin.acct.done") });
      setOpen(false);
      setReason("");
    }
  };

  return (
    <div className="confirm-action">
      {!open ? (
        <button type="button" className={`btn${danger ? " btn-danger" : ""}`} disabled={disabled} onClick={() => { setOpen(true); setMessage(null); }}>
          {label}
        </button>
      ) : (
        <div className="confirm-box" role="group" aria-label={label}>
          {extra}
          {needsReason && (
            <div className="field">
              <label htmlFor={id}>{t("admin.reason")}</label>
              <textarea id={id} rows={2} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
          <div className="row">
            <button type="button" className={`btn${danger ? " btn-danger" : " btn-primary"}`} disabled={busy} onClick={() => void run()}>
              {busy ? t("acct.working") : confirmLabel}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => { setOpen(false); setMessage(null); }}>
              {t("acct.cancel")}
            </button>
          </div>
        </div>
      )}
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
    </div>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage(page: number): void }) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="pager" aria-label={t("admin.page.of", { page, pages, total })}>
      <button type="button" className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t("admin.page.prev")}
      </button>
      <span>{t("admin.page.of", { page, pages, total })}</span>
      <button type="button" className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t("admin.page.next")}
      </button>
    </nav>
  );
}
