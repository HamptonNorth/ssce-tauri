import { describe, expect, test } from "bun:test";
import { getDefaultCanvasSize } from "../../src/js/utils/config.js";

describe("getDefaultCanvasSize", () => {
  test("returns default canvas size with fallback values when config not loaded", () => {
    const size = getDefaultCanvasSize();
    expect(size).toEqual({ width: 800, height: 600 });
  });

  test("returns object with width and height properties", () => {
    const size = getDefaultCanvasSize();
    expect(typeof size.width).toBe("number");
    expect(typeof size.height).toBe("number");
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
});
