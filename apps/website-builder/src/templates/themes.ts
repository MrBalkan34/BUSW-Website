import type { FontId, PaletteId } from "../model/types";

export interface Palette {
  label: string;
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  accent: string;
  onAccent: string;
  border: string;
}

/** Every text/background pair here meets WCAG AA (checked in tests/themes.test.ts). */
export const PALETTES: Record<PaletteId, Palette> = {
  paper: { label: "Paper", bg: "#ffffff", surface: "#f4f5f7", fg: "#16181d", muted: "#4b5260", accent: "#1d4ed8", onAccent: "#ffffff", border: "#d5d8de" },
  ink: { label: "Ink", bg: "#0f1115", surface: "#181b21", fg: "#f3f4f6", muted: "#a4abb8", accent: "#7aa2ff", onAccent: "#0b1020", border: "#2b303a" },
  sand: { label: "Sand", bg: "#faf6ef", surface: "#f0e9dc", fg: "#2a2118", muted: "#5e5446", accent: "#9a3b12", onAccent: "#ffffff", border: "#d9cfbd" },
  forest: { label: "Forest", bg: "#f7faf7", surface: "#e9f1ea", fg: "#14231a", muted: "#46574c", accent: "#1f6b3a", onAccent: "#ffffff", border: "#cbdccf" },
};

/** System font stacks only: nothing is downloaded, so generated sites stay fast and private. */
export const FONTS: Record<FontId, { label: string; stack: string }> = {
  system: {
    label: "Modern sans",
    stack: `-apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
  },
  humanist: {
    label: "Humanist sans",
    stack: `Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans", "Trebuchet MS", sans-serif`,
  },
  serif: {
    label: "Classic serif",
    stack: `"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`,
  },
};

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];
export const FONT_IDS = Object.keys(FONTS) as FontId[];
