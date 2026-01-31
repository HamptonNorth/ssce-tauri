import { describe, expect, test } from "bun:test";
import { isValidHex, getContrastColour } from "../../src/js/utils/colours.js";

describe("isValidHex", () => {
  test("accepts 6-digit hex with #", () => {
    expect(isValidHex("#FF0000")).toBe(true);
    expect(isValidHex("#000000")).toBe(true);
    expect(isValidHex("#ffffff")).toBe(true);
    expect(isValidHex("#1a2B3c")).toBe(true);
  });

  test("accepts 3-digit hex with #", () => {
    expect(isValidHex("#F00")).toBe(true);
    expect(isValidHex("#fff")).toBe(true);
    expect(isValidHex("#123")).toBe(true);
  });

  test("rejects hex without #", () => {
    expect(isValidHex("FF0000")).toBe(false);
    expect(isValidHex("fff")).toBe(false);
  });

  test("rejects invalid hex characters", () => {
    expect(isValidHex("#GGGGGG")).toBe(false);
    expect(isValidHex("#XYZ")).toBe(false);
  });

  test("rejects wrong length", () => {
    expect(isValidHex("#FF00")).toBe(false);
    expect(isValidHex("#FF00000")).toBe(false);
    expect(isValidHex("#F")).toBe(false);
    expect(isValidHex("#")).toBe(false);
  });

  test("rejects empty and non-string", () => {
    expect(isValidHex("")).toBe(false);
  });
});

describe("getContrastColour", () => {
  test("returns black for light backgrounds", () => {
    expect(getContrastColour("#FFFFFF")).toBe("#000000");
    expect(getContrastColour("#FFFF00")).toBe("#000000");
    expect(getContrastColour("#00FF00")).toBe("#000000");
  });

  test("returns white for dark backgrounds", () => {
    expect(getContrastColour("#000000")).toBe("#FFFFFF");
    expect(getContrastColour("#000080")).toBe("#FFFFFF");
    expect(getContrastColour("#800000")).toBe("#FFFFFF");
  });

  test("handles 3-digit hex", () => {
    expect(getContrastColour("#FFF")).toBe("#000000");
    expect(getContrastColour("#000")).toBe("#FFFFFF");
  });

  test("handles hex without #", () => {
    // The function strips # with replace, so this should still work
    expect(getContrastColour("FFFFFF")).toBe("#000000");
    expect(getContrastColour("000000")).toBe("#FFFFFF");
  });
});
