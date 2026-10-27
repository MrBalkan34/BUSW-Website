import { describe, expect, it } from "vitest";
import { PALETTES } from "../src/templates/themes";

function luminance(hex: string): number {
  const channels = (hex.slice(1).match(/../g) ?? []).map((x) => parseInt(x, 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe.each(Object.entries(PALETTES))("palette %s", (_name, p) => {
  it("keeps body text readable on both surfaces", () => {
    expect(contrast(p.fg, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.fg, p.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps muted text readable on both surfaces", () => {
    expect(contrast(p.muted, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.muted, p.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps links readable on both surfaces", () => {
    expect(contrast(p.accent, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.accent, p.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps button text readable on the accent colour", () => {
    expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
  });
});
