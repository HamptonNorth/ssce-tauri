import { describe, expect, test } from "bun:test";
import { findTransparentRect, ALPHA_THRESHOLD } from "../../src/js/utils/rect-detect.js";

/**
 * Create a mock ImageData object
 * @param {number} width
 * @param {number} height
 * @param {Function} pixelFn - (x, y) => [r, g, b, a]
 */
function createImageData(width, height, pixelFn) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }
  return { width, height, data };
}

describe("findTransparentRect", () => {
  test("returns null when click point is opaque", () => {
    const imageData = createImageData(10, 10, () => [255, 0, 0, 255]);
    expect(findTransparentRect(imageData, 5, 5)).toBeNull();
  });

  test("returns null when click is out of bounds", () => {
    const imageData = createImageData(10, 10, () => [0, 0, 0, 0]);
    expect(findTransparentRect(imageData, -1, 5)).toBeNull();
    expect(findTransparentRect(imageData, 10, 5)).toBeNull();
    expect(findTransparentRect(imageData, 5, -1)).toBeNull();
    expect(findTransparentRect(imageData, 5, 10)).toBeNull();
  });

  test("finds full canvas when entirely transparent", () => {
    const imageData = createImageData(20, 15, () => [0, 0, 0, 0]);
    const rect = findTransparentRect(imageData, 10, 7);
    expect(rect).toEqual({ x: 0, y: 0, width: 20, height: 15 });
  });

  test("finds transparent rectangle bordered by opaque pixels", () => {
    // 10x10 canvas with a 4x4 transparent rectangle at (3,3)
    const imageData = createImageData(10, 10, (x, y) => {
      if (x >= 3 && x <= 6 && y >= 3 && y <= 6) {
        return [0, 0, 0, 0]; // transparent
      }
      return [255, 0, 0, 255]; // opaque
    });
    const rect = findTransparentRect(imageData, 4, 4);
    expect(rect).toEqual({ x: 3, y: 3, width: 4, height: 4 });
  });

  test("finds transparent area at canvas edge", () => {
    // Top-left corner is transparent, rest is opaque
    const imageData = createImageData(10, 10, (x, y) => {
      if (x < 5 && y < 3) return [0, 0, 0, 0];
      return [255, 0, 0, 255];
    });
    const rect = findTransparentRect(imageData, 2, 1);
    expect(rect).toEqual({ x: 0, y: 0, width: 5, height: 3 });
  });

  test("treats near-transparent pixels as transparent", () => {
    // All pixels have alpha just below threshold
    const imageData = createImageData(5, 5, () => [0, 0, 0, ALPHA_THRESHOLD - 1]);
    const rect = findTransparentRect(imageData, 2, 2);
    expect(rect).toEqual({ x: 0, y: 0, width: 5, height: 5 });
  });

  test("treats pixels at threshold as opaque", () => {
    // All pixels have alpha exactly at threshold
    const imageData = createImageData(5, 5, () => [0, 0, 0, ALPHA_THRESHOLD]);
    expect(findTransparentRect(imageData, 2, 2)).toBeNull();
  });

  test("finds a single transparent pixel", () => {
    const imageData = createImageData(5, 5, (x, y) => {
      if (x === 2 && y === 2) return [0, 0, 0, 0];
      return [255, 0, 0, 255];
    });
    const rect = findTransparentRect(imageData, 2, 2);
    expect(rect).toEqual({ x: 2, y: 2, width: 1, height: 1 });
  });

  test("finds transparent border around opaque center", () => {
    // 10x10 canvas, opaque 4x4 block in center, transparent border
    const imageData = createImageData(10, 10, (x, y) => {
      if (x >= 3 && x <= 6 && y >= 3 && y <= 6) {
        return [255, 0, 0, 255]; // opaque center
      }
      return [0, 0, 0, 0]; // transparent border
    });
    // Click on top transparent area
    const rect = findTransparentRect(imageData, 5, 1);
    expect(rect).not.toBeNull();
    expect(rect.y).toBe(0);
    expect(rect.height).toBe(3); // rows 0,1,2 are transparent across full width at x=5
  });
});
