import type { ThemeSettings } from "../model/types";
import { FONTS, PALETTES } from "../templates/themes";

/**
 * The one stylesheet for generated sites. It is injected into the editor's preview frame and
 * written to styles.css on export, so what you edit is what you ship. Mobile-first, no JavaScript.
 */
export function siteCss(theme: ThemeSettings): string {
  const p = PALETTES[theme.palette];
  const font = FONTS[theme.font].stack;
  return `:root {
  --bg: ${p.bg};
  --surface: ${p.surface};
  --fg: ${p.fg};
  --muted: ${p.muted};
  --accent: ${p.accent};
  --on-accent: ${p.onAccent};
  --border: ${p.border};
  --font: ${font};
  color-scheme: ${theme.palette === "ink" ? "dark" : "light"};
}
*, *::before, *::after { box-sizing: border-box; }
html { background: var(--bg); }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 1rem; line-height: 1.65; }
img { display: block; max-width: 100%; height: auto; }
h1, h2, h3, p, figure, ul { margin: 0; }
h1, h2, h3 { line-height: 1.15; letter-spacing: -0.01em; text-wrap: balance; }
h1 { font-size: clamp(2rem, 1.4rem + 3vw, 3.5rem); }
h2 { font-size: clamp(1.5rem, 1.2rem + 1.4vw, 2.25rem); }
h3 { font-size: 1.2rem; }
p { text-wrap: pretty; }
a { color: var(--accent); text-underline-offset: 0.2em; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }

.bw-skip { position: absolute; left: -9999px; top: 0; z-index: 10; padding: 0.5rem 1rem; background: var(--accent); color: var(--on-accent); }
.bw-skip:focus { left: 1rem; top: 1rem; }

.bw-container { width: 100%; max-width: 68rem; margin-inline: auto; padding-inline: clamp(1rem, 4vw, 2rem); }
.bw-section { padding-block: clamp(2.5rem, 6vw, 5rem); }
.bw-section:nth-of-type(even) { background: var(--surface); }
.bw-section[id] { scroll-margin-top: 1rem; }
.bw-stack > * + * { margin-top: 1rem; }
.bw-muted { color: var(--muted); }
.bw-lede { color: var(--muted); font-size: 1.125rem; max-width: 40rem; }

.bw-header { border-bottom: 1px solid var(--border); }
.bw-header .bw-container { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem 1.5rem; padding-block: 1rem; }
.bw-brand { font-weight: 700; font-size: 1.125rem; color: var(--fg); text-decoration: none; }
.bw-nav { display: flex; flex-wrap: wrap; gap: 0.25rem 1.25rem; margin: 0; padding: 0; list-style: none; }
.bw-nav a { display: inline-block; padding: 0.35rem 0; color: var(--muted); text-decoration: none; font-weight: 500; }
.bw-nav a:hover { color: var(--fg); text-decoration: underline; }

.bw-btn { display: inline-block; margin-top: 0.5rem; padding: 0.7rem 1.4rem; background: var(--accent); color: var(--on-accent); border-radius: 6px; font-weight: 600; text-decoration: none; }
.bw-btn:hover { filter: brightness(1.08); }

.bw-hero .bw-grid { display: grid; gap: 2rem; align-items: center; }
.bw-hero .bw-stack > * + * { margin-top: 1.25rem; }
.bw-hero figure img, .bw-split figure img { width: 100%; border-radius: 8px; }

.bw-split .bw-grid { display: grid; gap: 2rem; align-items: center; }
.bw-prose p { white-space: pre-line; }
.bw-prose p + p { margin-top: 1.65em; }

.bw-cards { display: grid; gap: 1rem; margin-top: 2rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); }
.bw-card { padding: 1.5rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; }
.bw-section:nth-of-type(even) .bw-card { background: var(--bg); }
.bw-card h3 + p { margin-top: 0.5rem; color: var(--muted); }

.bw-gallery { display: grid; gap: 1.25rem; margin-top: 2rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
.bw-gallery img { width: 100%; border-radius: 8px; }
.bw-gallery figcaption { margin-top: 0.5rem; color: var(--muted); font-size: 0.9375rem; }

.bw-contact-list { display: grid; gap: 0.75rem; margin: 1.5rem 0 0; padding: 0; list-style: none; }
.bw-contact-list dt { font-size: 0.875rem; color: var(--muted); }
.bw-contact-list dd { margin: 0; overflow-wrap: anywhere; }

.bw-footer { border-top: 1px solid var(--border); padding-block: 2rem; color: var(--muted); font-size: 0.9375rem; }

@media (min-width: 48rem) {
  .bw-hero .bw-grid { grid-template-columns: 1fr 1fr; }
  .bw-hero .bw-grid.bw-no-image { grid-template-columns: minmax(0, 46rem); }
  .bw-split .bw-grid { grid-template-columns: 1fr 1fr; gap: 3rem; }
  .bw-split .bw-grid.bw-no-image { grid-template-columns: minmax(0, 42rem); }
  .bw-split .bw-image-left figure { order: -1; }
}

@media (prefers-reduced-motion: reduce) {
  * { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
}
`;
}

/** Extra rules that exist only inside the editor's preview frame; never exported. */
export const EDITOR_CANVAS_CSS = `
html { overflow: hidden; }
[data-bw-block] { position: relative; cursor: default; }
[data-bw-block]:hover { box-shadow: inset 0 0 0 2px rgba(122, 162, 255, 0.45); }
[data-bw-block].bw-selected { box-shadow: inset 0 0 0 3px #7aa2ff; }
[data-bw-edit] { outline: none; border-radius: 3px; cursor: text; min-width: 1ch; }
[data-bw-edit]:hover { background: rgba(122, 162, 255, 0.12); }
[data-bw-edit]:focus { background: rgba(122, 162, 255, 0.18); box-shadow: 0 0 0 2px #7aa2ff; }
[data-bw-edit]:empty::before { content: attr(data-placeholder); opacity: 0.55; pointer-events: none; }
.bw-slot { display: grid; place-items: center; min-height: 12rem; width: 100%; border: 2px dashed var(--border); border-radius: 8px; color: var(--muted); font-size: 0.9375rem; text-align: center; padding: 1rem; background: rgba(127,127,127,0.06); }
.bw-note { margin: 0; padding: 1rem; text-align: center; color: var(--muted); font-size: 0.9375rem; }
`;
