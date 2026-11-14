/** Escapes text for use in HTML. It sits on its own so the brief can use it without pulling in the site renderer. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
