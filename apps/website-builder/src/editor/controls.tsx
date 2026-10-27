import { useId, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n/I18nProvider";
import type { Asset, ImageRef } from "../model/types";

interface FieldShell {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children(id: string, describedBy: string | undefined): ReactNode;
}

function Shell({ label, hint, error, required, children }: FieldShell) {
  const { t } = useI18n();
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="required"> {t("common.required")}</span>}
      </label>
      {children(id, describedBy)}
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

interface TextFieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
  max: number;
  hint?: string;
  multiline?: boolean;
  type?: "text" | "email" | "tel";
  list?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  onBlur?(): void;
}

export function TextField({ label, value, onChange, max, hint, multiline, type = "text", list, placeholder, error, required, autoComplete, onBlur }: TextFieldProps) {
  return (
    <Shell label={label} hint={hint} error={error} required={required}>
      {(id, describedBy) =>
        multiline ? (
          <textarea id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} value={value} maxLength={max} rows={5} placeholder={placeholder} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} aria-required={required || undefined} type={type} value={value} maxLength={max} list={list} placeholder={placeholder} autoComplete={autoComplete} onBlur={onBlur} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </Shell>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange(value: T): void;
  hint?: string;
}

export function SelectField<T extends string>({ label, value, options, onChange, hint }: SelectFieldProps<T>) {
  return (
    <Shell label={label} hint={hint}>
      {(id, describedBy) => (
        <select id={id} aria-describedby={describedBy} value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Shell>
  );
}

interface ImageFieldProps {
  label: string;
  value: ImageRef;
  assets: Record<string, Asset>;
  onChange(value: ImageRef): void;
  /** Resolves to a new Asset (already added to the project) or an error message. */
  onFile(file: File): Promise<Asset | string>;
}

export function ImageField({ label, value, assets, onChange, onFile }: ImageFieldProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const asset = value.assetId ? assets[value.assetId] : undefined;
  const altId = useId();
  const needsAlt = value.assetId !== null && !value.decorative && value.alt.trim() === "";

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const result = await onFile(file);
    setBusy(false);
    if (typeof result === "string") setError(result);
    else onChange({ ...value, assetId: result.id });
  };

  return (
    <fieldset className="image-field">
      <legend>{label}</legend>
      {asset ? (
        <img className="thumb" src={asset.dataUrl} alt="" width={asset.width} height={asset.height} />
      ) : (
        <p className="hint">{t("control.imageNone")}</p>
      )}
      <div className="row">
        <button type="button" className="btn" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? t("control.processing") : asset ? t("control.replaceImage") : t("control.chooseImage")}
        </button>
        {asset && (
          <button type="button" className="btn btn-quiet" onClick={() => onChange({ ...value, assetId: null })}>
            {t("common.remove")}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {asset && (
        <>
          <div className="field">
            <label htmlFor={altId}>{t("control.alt")}</label>
            <input id={altId} type="text" value={value.alt} disabled={value.decorative} maxLength={200} aria-invalid={needsAlt} onChange={(e) => onChange({ ...value, alt: e.target.value })} />
            <p className={`hint${needsAlt ? " warn" : ""}`}>
              {needsAlt ? t("control.altNeeded") : t("control.altHint")}
            </p>
          </div>
          <label className="check">
            <input type="checkbox" checked={value.decorative} onChange={(e) => onChange({ ...value, decorative: e.target.checked })} />
            {t("control.decorative")}
          </label>
        </>
      )}
    </fieldset>
  );
}

interface CheckFieldProps {
  label: string;
  checked: boolean;
  onChange(value: boolean): void;
  hint?: string;
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
  /** Names what one unit is, e.g. "batches". Read out together with the number. */
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
