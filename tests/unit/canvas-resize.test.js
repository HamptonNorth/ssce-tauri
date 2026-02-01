import { describe, expect, test } from "bun:test";
import { HANDLE_CONFIG, MIN_CANVAS_SIZE } from "../../src/js/utils/canvas-resize-handles.js";

describe("Canvas Resize Handle Config", () => {
  test("has 8 handles (4 corners + 4 edges)", () => {
    expect(Object.keys(HANDLE_CONFIG)).toHaveLength(8);
  });

  test("each handle has cursor and anchor", () => {
    for (const [id, config] of Object.entries(HANDLE_CONFIG)) {
      expect(config.cursor).toBeDefined();
      expect(config.anchor).toBeDefined();
    }
  });

  test("corner handles have diagonal resize cursors", () => {
    expect(HANDLE_CONFIG.tl.cursor).toBe("nwse-resize");
    expect(HANDLE_CONFIG.br.cursor).toBe("nwse-resize");
    expect(HANDLE_CONFIG.tr.cursor).toBe("nesw-resize");
    expect(HANDLE_CONFIG.bl.cursor).toBe("nesw-resize");
  });

  test("edge handles have axis resize cursors", () => {
    expect(HANDLE_CONFIG.t.cursor).toBe("ns-resize");
    expect(HANDLE_CONFIG.b.cursor).toBe("ns-resize");
    expect(HANDLE_CONFIG.l.cursor).toBe("ew-resize");
    expect(HANDLE_CONFIG.r.cursor).toBe("ew-resize");
  });

  test("anchor is opposite of handle position", () => {
    expect(HANDLE_CONFIG.tl.anchor).toBe("br");
    expect(HANDLE_CONFIG.tr.anchor).toBe("bl");
    expect(HANDLE_CONFIG.bl.anchor).toBe("tr");
    expect(HANDLE_CONFIG.br.anchor).toBe("tl");
    expect(HANDLE_CONFIG.t.anchor).toBe("bc");
    expect(HANDLE_CONFIG.b.anchor).toBe("tc");
    expect(HANDLE_CONFIG.l.anchor).toBe("mr");
    expect(HANDLE_CONFIG.r.anchor).toBe("ml");
  });
});

describe("MIN_CANVAS_SIZE", () => {
  test("is a positive number", () => {
    expect(MIN_CANVAS_SIZE).toBeGreaterThan(0);
    expect(MIN_CANVAS_SIZE).toBe(100);
  });
});
