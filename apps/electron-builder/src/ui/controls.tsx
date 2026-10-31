import { useId, type ReactNode } from "react";
import { useI18n } from "../i18n/I18nProvider";

interface TextFieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
  max: number;
  hint?: string;
  multiline?: boolean;
  type?: "text" | "email";
  error?: string;
  required?: boolean;
  autoComplete?: string;
  onBlur?(): void;
}

export function TextField({ label, value, onChange, max, hint, multiline, type = "text", error, required, autoComplete, onBlur }: TextFieldProps) {
  const { t } = useI18n();
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const common = { id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined, value, maxLength: max, onBlur, onChange: (e: { target: { value: string } }) => onChange(e.target.value) };
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="required"> {t("common.required")}</span>}
      </label>
      {multiline ? <textarea {...common} rows={5} /> : <input {...common} type={type} autoComplete={autoComplete} aria-required={required || undefined} />}
      {error && (
        <p className="error" id={errorId}>
          {error}
        </p>
      )}
      {hint && (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface CheckFieldProps {
  label: string;
  checked: boolean;
  onChange(value: boolean): void;
  hint?: ReactNode;
  disabled?: boolean;
}

export function CheckField({ label, checked, onChange, hint, disabled }: CheckFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="check-field">
      <label className="check" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} disabled={disabled} aria-describedby={hintId} onChange={(e) => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
      {hint && (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface NumberStepperProps {
  label: string;
  value: number;
  onChange(value: number): void;
  max?: number;
  hint?: string;
  /** Names what one unit is, e.g. "screens". Read out together with the number. */
  unit: string;
}

/** A whole-number control with explicit minus and plus buttons, usable by keyboard and touch. */
export function NumberStepper({ label, value, onChange, max = 99, hint, unit }: NumberStepperProps) {
  const { t } = useI18n();
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const clamp = (n: number) => Math.min(max, Math.max(0, Math.trunc(Number.isFinite(n) ? n : 0)));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="stepper-control">
        <button type="button" className="btn" aria-label={t("control.fewer", { unit })} disabled={value <= 0} onClick={() => onChange(clamp(value - 1))}>
          −
        </button>
        <input id={id} type="number" inputMode="numeric" min={0} max={max} step={1} value={value} aria-describedby={hintId} onChange={(e) => onChange(clamp(e.target.valueAsNumber))} />
        <button type="button" className="btn" aria-label={t("control.more", { unit })} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
          +
        </button>
      </div>
      {hint && (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}
