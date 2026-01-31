import { describe, expect, test } from "bun:test";
import { generatePrintContent } from "../../src/js/utils/export.js";

const DUMMY_IMAGE = "data:image/png;base64,iVBORw0KGgo=";

describe("generatePrintContent", () => {
  test("defaults to center positioning", () => {
    const result = generatePrintContent(DUMMY_IMAGE, {});
    expect(result.alignItems).toBe("center");
    expect(result.styles).toContain("align-items: center");
  });

  test("top position uses flex-start", () => {
    const result = generatePrintContent(DUMMY_IMAGE, { imagePosition: "top" });
    expect(result.alignItems).toBe("flex-start");
    expect(result.styles).toContain("align-items: flex-start");
  });

  test("bottom position uses flex-end", () => {
    const result = generatePrintContent(DUMMY_IMAGE, { imagePosition: "bottom" });
    expect(result.alignItems).toBe("flex-end");
    expect(result.styles).toContain("align-items: flex-end");
  });

  test("center position uses center", () => {
    const result = generatePrintContent(DUMMY_IMAGE, { imagePosition: "center" });
    expect(result.alignItems).toBe("center");
    expect(result.styles).toContain("align-items: center");
  });

  test("includes image in container HTML", () => {
    const result = generatePrintContent(DUMMY_IMAGE, {});
    expect(result.container).toContain(`<img src="${DUMMY_IMAGE}"`);
  });

  test("includes filename in footer", () => {
    const result = generatePrintContent(DUMMY_IMAGE, { filename: "test-image.png" });
    expect(result.container).toContain("test-image.png");
  });

  test("uses A4 paper size by default", () => {
    const result = generatePrintContent(DUMMY_IMAGE, {});
    expect(result.paperSizeValue).toBe("A4");
  });

  test("uses letter paper size when specified", () => {
    const result = generatePrintContent(DUMMY_IMAGE, { paperSize: "letter" });
    expect(result.paperSizeValue).toBe("letter");
  });

  test("applies orientation to print styles", () => {
    const result = generatePrintContent(DUMMY_IMAGE, { orientation: "landscape" });
    expect(result.styles).toContain("landscape");
  });

  test("applies padding values", () => {
    const result = generatePrintContent(DUMMY_IMAGE, { paddingVertical: 20, paddingHorizontal: 15 });
    expect(result.styles).toContain("20mm 15mm");
  });
});
