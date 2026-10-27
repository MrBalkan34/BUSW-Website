/**
 * Link policy for generated sites: only http(s), mailto, tel and in-page anchors.
 * Anything else (javascript:, data:, vbscript:, relative paths, obfuscated schemes) is rejected.
 */
const CONTROL_OR_SPACE = /[\u0000- \u007f-\u009f]/;

/** A link to another page of the same site, optionally to an anchor on it: about.html#team */
const PAGE_LINK = /^[a-z][a-z0-9-]{0,39}\.html(#[A-Za-z][\w-]{0,39})?$/;

/** The page file part of a link ("about.html") or null if it is not a page link. */
export function pageLinkFile(href: string): string | null {
  const trimmed = href.trim();
  if (!PAGE_LINK.test(trimmed)) return null;
  return trimmed.split("#")[0] ?? null;
}

export function safeHref(value: string): string | null {
  const href = value.trim();
  if (href === "" || CONTROL_OR_SPACE.test(href)) return null;

  if (/^#[A-Za-z][\w-]{0,39}$/.test(href)) return href;
  if (PAGE_LINK.test(href)) return href;
  if (MAILTO.test(href)) return href;
  if (/^tel:\+?[0-9()-]{3,30}$/i.test(href)) return href;

  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".")) {
        return href;
      }
    } catch {
      return null;
    }
  }
  return null;
}

const EMAIL_PATTERN = "[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)+";
const EMAIL = new RegExp(`^${EMAIL_PATTERN}$`);
const MAILTO = new RegExp(`^mailto:${EMAIL_PATTERN}$`, "i");

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function mailtoHref(email: string): string | null {
  const trimmed = email.trim();
  return isEmail(trimmed) ? `mailto:${trimmed}` : null;
}

/** Digits, spaces, +, (, ), - only. Returns a tel: link or null. */
export function telHref(phone: string): string | null {
  const compact = phone.replace(/[\s.]/g, "");
  return /^\+?[0-9()-]{3,30}$/.test(compact) ? `tel:${compact}` : null;
}

export function isAnchorSlug(value: string): boolean {
  return value === "" || /^[a-z][a-z0-9-]{0,39}$/.test(value);
}
