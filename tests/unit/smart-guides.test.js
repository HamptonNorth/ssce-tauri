import { describe, test, expect } from "bun:test";
import { getLayerBounds, getCombinedBounds, detectAlignments, getAlignmentCandidates } from "../../src/js/utils/smart-guides.js";

// Mock canvas context with font metrics
function mockCtx() {
  return {
    font: "",
    textBaseline: "",
    measureText(text) {
      // Simple mock: 8px per char, fixed ascent/descent
      return {
        width: text.length * 8,
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 3,
        fontBoundingBoxAscent: 14,
      };
    },
  };
}

describe("getLayerBounds", () => {
  test("arrow - uses min/max of endpoints", () => {
    const layer = { type: "arrow", data: { startX: 100, startY: 50, endX: 200, endY: 150 } };
    const bounds = getLayerBounds(layer, mockCtx());
    expect(bounds.left).toBe(100);
    expect(bounds.top).toBe(50);
    expect(bounds.right).toBe(200);
    expect(bounds.bottom).toBe(150);
    expect(bounds.centerX).toBe(150);
    expect(bounds.centerY).toBe(100);
  });

  test("arrow - reversed endpoints", () => {
    const layer = { type: "arrow", data: { startX: 200, startY: 150, endX: 100, endY: 50 } };
    const bounds = getLayerBounds(layer, mockCtx());
    expect(bounds.left).toBe(100);
    expect(bounds.top).toBe(50);
    expect(bounds.right).toBe(200);
    expect(bounds.bottom).toBe(150);
  });

  test("shape - uses x/y/width/height", () => {
    const layer = { type: "shape", data: { x: 10, y: 20, width: 100, height: 50 } };
    const bounds = getLayerBounds(layer, mockCtx());
    expect(bounds.left).toBe(10);
    expect(bounds.top).toBe(20);
    expect(bounds.right).toBe(110);
    expect(bounds.bottom).toBe(70);
    expect(bounds.centerX).toBe(60);
    expect(bounds.centerY).toBe(45);
  });

  test("image - with defaults for missing x/y", () => {
    const layer = { type: "image", data: { width: 200, height: 100 } };
    const bounds = getLayerBounds(layer, mockCtx());
    expect(bounds.left).toBe(0);
    expect(bounds.top).toBe(0);
    expect(bounds.right).toBe(200);
    expect(bounds.bottom).toBe(100);
  });

  test("text - uses font metrics", () => {
    const layer = { type: "text", data: { x: 50, y: 30, text: "Hello", size: "md" } };
    const bounds = getLayerBounds(layer, mockCtx());
    expect(bounds.left).toBe(50);
    // glyphTop = 14 - 10 = 4, so top = 30 + 4 = 34
    expect(bounds.top).toBe(34);
    // width = 5 chars * 8 = 40
    expect(bounds.right).toBe(90);
    // height = ascent(10) + descent(3) = 13, bottom = 34 + 13 = 47
    expect(bounds.bottom).toBe(47);
  });

  test("unknown type returns null", () => {
    const layer = { type: "unknown", data: {} };
    expect(getLayerBounds(layer, mockCtx())).toBeNull();
  });
});

describe("getCombinedBounds", () => {
  test("merges two rects", () => {
    const a = { left: 10, top: 20, right: 100, bottom: 80, centerX: 55, centerY: 50 };
    const b = { left: 50, top: 10, right: 200, bottom: 60, centerX: 125, centerY: 35 };
    const combined = getCombinedBounds([a, b]);
    expect(combined.left).toBe(10);
    expect(combined.top).toBe(10);
    expect(combined.right).toBe(200);
    expect(combined.bottom).toBe(80);
    expect(combined.centerX).toBe(105);
    expect(combined.centerY).toBe(45);
  });

  test("empty list returns null", () => {
    expect(getCombinedBounds([])).toBeNull();
  });
});

describe("detectAlignments", () => {
  test("snaps left edge within threshold", () => {
    const dragging = { left: 103, top: 50, right: 203, bottom: 150, centerX: 153, centerY: 100 };
    const candidates = {
      verticals: [{ value: 100, type: "edge" }],
      horizontals: [],
    };
    const result = detectAlignments(dragging, candidates, 6);
    expect(result.snapDx).toBe(-3);
    expect(result.snapDy).toBe(0);
    expect(result.guides.length).toBe(1);
    expect(result.guides[0].axis).toBe("vertical");
    expect(result.guides[0].position).toBe(100);
  });

  test("no snap when outside threshold", () => {
    const dragging = { left: 110, top: 50, right: 210, bottom: 150, centerX: 160, centerY: 100 };
    const candidates = {
      verticals: [{ value: 100, type: "edge" }],
      horizontals: [],
    };
    const result = detectAlignments(dragging, candidates, 6);
    expect(result.snapDx).toBe(0);
    expect(result.snapDy).toBe(0);
    expect(result.guides.length).toBe(0);
  });

  test("centre alignment", () => {
    const dragging = { left: 95, top: 45, right: 205, bottom: 155, centerX: 150, centerY: 100 };
    const candidates = {
      verticals: [{ value: 150, type: "canvas-center" }],
      horizontals: [{ value: 100, type: "canvas-center" }],
    };
    const result = detectAlignments(dragging, candidates, 6);
    expect(result.snapDx).toBe(0);
    expect(result.snapDy).toBe(0);
    expect(result.guides.length).toBe(2);
  });

  test("picks closest when multiple candidates", () => {
    const dragging = { left: 102, top: 50, right: 202, bottom: 150, centerX: 152, centerY: 100 };
    const candidates = {
      verticals: [
        { value: 100, type: "edge" },
        { value: 105, type: "edge" },
      ],
      horizontals: [],
    };
    const result = detectAlignments(dragging, candidates, 6);
    // left edge is at 102: dist to 100 = 2, dist to 105 = 3 → snaps to 100
    expect(result.snapDx).toBe(-2);
  });

  test("snaps both axes independently", () => {
    const dragging = { left: 103, top: 52, right: 203, bottom: 152, centerX: 153, centerY: 102 };
    const candidates = {
      verticals: [{ value: 100, type: "edge" }],
      horizontals: [{ value: 50, type: "edge" }],
    };
    const result = detectAlignments(dragging, candidates, 6);
    expect(result.snapDx).toBe(-3);
    expect(result.snapDy).toBe(-2);
  });
});

describe("getAlignmentCandidates", () => {
  test("excludes selected layers and base image", () => {
    const layers = [
      { type: "image", data: { x: 0, y: 0, width: 800, height: 600 } }, // index 0 - base
      { type: "shape", data: { x: 10, y: 20, width: 100, height: 50 } }, // index 1
      { type: "shape", data: { x: 200, y: 200, width: 80, height: 80 } }, // index 2
    ];
    const ctx = mockCtx();
    const result = getAlignmentCandidates(layers, [1], ctx, 800, 600);
    // Should include layer 2 edges + canvas center, but NOT layer 0 or layer 1
    // Layer 2: left=200, right=280, centerX=240, top=200, bottom=280, centerY=240
    // Canvas: centerX=400, centerY=300
    expect(result.verticals.some((v) => v.value === 200)).toBe(true);
    expect(result.verticals.some((v) => v.value === 400 && v.type === "canvas-center")).toBe(true);
    // Layer 1 should NOT be present
    expect(result.verticals.some((v) => v.value === 10)).toBe(false);
  });
});
