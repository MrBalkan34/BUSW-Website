import { useLayoutEffect, useRef, type ElementType, type KeyboardEvent, type ReactNode } from "react";
import { english } from "../i18n/translate";
import type { TranslationKey } from "../i18n/messages/en";
import type { Path } from "../model/reducer";
import type { ImageRef } from "../model/types";
import type { RenderCtx } from "./ctx";

/** Wording for an editing-only hint, in the interface language. The exported site never shows these. */
export function ph(ctx: RenderCtx, key: TranslationKey): string {
  return (ctx.t ?? english.t)(key);
}

interface TextProps {
  ctx: RenderCtx;
  target: string;
  path: Path;
  value: string;
  as: ElementType;
  className?: string;
  placeholder: string;
  maxLength: number;
  /** Allows Enter to insert line breaks (used for body text only). */
  multiline?: boolean;
}

/** Plain text that is a normal element on export and an in-place editable one in the editor. */
export function Text({ ctx, target, path, value, as: Tag, className, placeholder, maxLength, multiline }: TextProps) {
  if (!ctx.edit) {
    if (value.trim() === "") return null;
    return <Tag className={className}>{value}</Tag>;
  }
  const edit = ctx.edit;
  return (
    <EditableText
      as={Tag}
      className={className}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      multiline={multiline ?? false}
      onChange={(text) => edit.set(target, path, text)}
      onUndo={edit.undo}
      onRedo={edit.redo}
    />
  );
}

interface EditableProps {
  as: ElementType;
  className: string | undefined;
  value: string;
  placeholder: string;
  maxLength: number;
  multiline: boolean;
  onChange(text: string): void;
  onUndo(): void;
  onRedo(): void;
}

function readText(el: HTMLElement, multiline: boolean): string {
  const raw = multiline ? el.innerText : (el.textContent ?? "");
  return (multiline ? raw.replace(/\r\n?/g, "\n").replace(/\n+$/, "") : raw.replace(/[\r\n]+/g, " "));
}

function EditableText({ as: Tag, className, value, placeholder, maxLength, multiline, onChange, onUndo, onRedo }: EditableProps) {
  const ref = useRef<HTMLElement>(null);
  const lastEmitted = useRef(value);

  // Keep the DOM in step with the model without fighting the caret: only rewrite when the
  // change did not come from typing in this element (initial render, undo/redo, Inspector edits).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value !== lastEmitted.current || (el.textContent === "" && value !== "")) {
      el.textContent = value;
      lastEmitted.current = value;
      if (el.ownerDocument.activeElement === el) placeCaretAtEnd(el);
    }
  }, [value]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== value) el.textContent = value;
    // Prefer true plain-text editing where the browser supports it.
    if (multiline && el) {
      el.contentEditable = "plaintext-only";
      if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const emit = (el: HTMLElement) => {
    let text = readText(el, multiline);
    if (text.length > maxLength) {
      text = text.slice(0, maxLength);
      el.textContent = text;
      placeCaretAtEnd(el);
    }
    lastEmitted.current = text;
    onChange(text);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const el = event.currentTarget;
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) onRedo();
      else onUndo();
    } else if (mod && event.key.toLowerCase() === "y") {
      event.preventDefault();
      onRedo();
    } else if (event.key === "Enter" && !multiline) {
      event.preventDefault();
      el.blur();
    } else if (event.key === "Escape") {
      el.blur();
    }
  };

  return (
    <Tag
      ref={ref}
      className={className}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      aria-multiline={multiline}
      aria-label={placeholder}
      data-bw-edit=""
      data-placeholder={placeholder}
      style={multiline ? { whiteSpace: "pre-wrap" } : undefined}
      onInput={(event: React.FormEvent<HTMLElement>) => emit(event.currentTarget)}
      onKeyDown={onKeyDown}
      onPaste={(event: React.ClipboardEvent<HTMLElement>) => {
        event.preventDefault();
        const pasted = event.clipboardData.getData("text/plain");
        insertPlainText(event.currentTarget, multiline ? pasted : pasted.replace(/[\r\n]+/g, " "));
        emit(event.currentTarget);
      }}
      onDrop={(event: React.DragEvent<HTMLElement>) => event.preventDefault()}
    />
  );
}

function placeCaretAtEnd(el: HTMLElement): void {
  const doc = el.ownerDocument;
  const selection = doc.getSelection();
  if (!selection) return;
  const range = doc.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertPlainText(el: HTMLElement, text: string): void {
  const doc = el.ownerDocument;
  const selection = doc.getSelection();
  if (!selection || selection.rangeCount === 0) {
    el.append(doc.createTextNode(text));
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = doc.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

interface ImgProps {
  ctx: RenderCtx;
  image: ImageRef;
  /** Hero images load immediately; everything else is lazy. */
  eager?: boolean;
}

/** True when an image slot should take up space: always in the editor, only when filled on export. */
export function imageVisible(ctx: RenderCtx, image: ImageRef): boolean {
  if (ctx.mode === "edit") return true;
  return image.assetId !== null && ctx.src(image.assetId) !== null && ctx.assets[image.assetId] !== undefined;
}

export function Img({ ctx, image, eager }: ImgProps) {
  const asset = image.assetId ? ctx.assets[image.assetId] : undefined;
  const src = image.assetId ? ctx.src(image.assetId) : null;
  if (!asset || !src) {
    if (ctx.mode === "export") return null;
    return <div className="bw-slot">{ph(ctx, "canvas.imagePlaceholder")}</div>;
  }
  return (
    <img
      src={src}
      alt={image.decorative ? "" : image.alt}
      width={asset.width}
      height={asset.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

interface FrameProps {
  ctx: RenderCtx;
  id: string;
  tag: "section" | "header" | "footer";
  anchor?: string;
  className: string;
  children: ReactNode;
}

/** Wraps a block: a plain element on export, a selectable one in the editor. */
export function Frame({ ctx, id, tag: Tag, anchor, className, children }: FrameProps) {
  if (!ctx.edit) {
    return (
      <Tag id={anchor || undefined} className={className}>
        {children}
      </Tag>
    );
  }
  const edit = ctx.edit;
  const selected = edit.selected === id;
  return (
    <Tag
      id={anchor || undefined}
      className={`${className}${selected ? " bw-selected" : ""}`}
      data-bw-block={id}
      onClick={() => edit.select(id)}
      onFocus={() => edit.select(id)}
    >
      {children}
    </Tag>
  );
}
