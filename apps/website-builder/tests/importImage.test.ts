import { describe, expect, it } from "vitest";
import { MAX_DIMENSION, fitWithin } from "../src/editor/importImage";

describe("fitWithin", () => {
  it("leaves small images alone", () => {
    expect(fitWithin(800, 600, MAX_DIMENSION)).toEqual({ width: 800, height: 600 });
  });

  it("shrinks landscape images to the longest side, keeping the aspect ratio", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("shrinks portrait images the same way", () => {
    expect(fitWithin(3000, 6000, 1600)).toEqual({ width: 800, height: 1600 });
  });

  it("never returns a zero dimension", () => {
    const { width, height } = fitWithin(10000, 1, 1600);
    expect(width).toBe(1600);
    expect(height).toBe(1);
  });
});
