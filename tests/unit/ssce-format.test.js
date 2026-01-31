import { describe, expect, test } from "bun:test";
import { validate, extractKeywords, isSsceFile } from "../../src/js/utils/ssce-format.js";

describe("validate", () => {
  test("accepts valid .ssce structure", () => {
    const data = JSON.stringify({
      version: "1.1",
      canvas: { width: 800, height: 600 },
      layers: [],
    });
    const result = validate(data);
    expect(result.valid).toBe(true);
    expect(result.version).toBe("1.1");
  });

  test("accepts version 1.0", () => {
    const data = JSON.stringify({
      version: "1.0",
      canvas: { width: 100, height: 100 },
      layers: [{ type: "text", id: "1", data: {} }],
    });
    expect(validate(data).valid).toBe(true);
  });

  test("rejects missing version", () => {
    const data = JSON.stringify({
      canvas: { width: 800, height: 600 },
      layers: [],
    });
    const result = validate(data);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("version");
  });

  test("rejects missing canvas", () => {
    const data = JSON.stringify({
      version: "1.1",
      layers: [],
    });
    expect(validate(data).valid).toBe(false);
  });

  test("rejects invalid canvas dimensions", () => {
    const data = JSON.stringify({
      version: "1.1",
      canvas: { width: "big", height: 600 },
      layers: [],
    });
    expect(validate(data).valid).toBe(false);
  });

  test("rejects missing layers", () => {
    const data = JSON.stringify({
      version: "1.1",
      canvas: { width: 800, height: 600 },
    });
    expect(validate(data).valid).toBe(false);
  });

  test("rejects non-array layers", () => {
    const data = JSON.stringify({
      version: "1.1",
      canvas: { width: 800, height: 600 },
      layers: "not an array",
    });
    expect(validate(data).valid).toBe(false);
  });

  test("rejects invalid JSON", () => {
    const result = validate("not json at all");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid JSON");
  });
});

describe("extractKeywords", () => {
  test("extracts words from filename", () => {
    const keywords = extractKeywords({ filename: "my-screenshot-2025.ssce" });
    expect(keywords).toContain("my");
    expect(keywords).toContain("screenshot");
    expect(keywords).toContain("2025");
  });

  test("strips .ssce extension from filename", () => {
    const keywords = extractKeywords({ filename: "test.ssce" });
    expect(keywords).toContain("test");
    expect(keywords).not.toContain("ssce");
  });

  test("extracts from front matter title and summary", () => {
    const keywords = extractKeywords({
      frontMatter: {
        title: "Login Page",
        summary: "Screenshot of login form",
      },
    });
    expect(keywords).toContain("login");
    expect(keywords).toContain("page");
    expect(keywords).toContain("screenshot");
    expect(keywords).toContain("form");
  });

  test("extracts from snapshot metadata", () => {
    const keywords = extractKeywords({
      snapshots: [
        { frontMatter: { title: "Before changes" } },
        { frontMatter: { title: "After refactor" } },
      ],
    });
    expect(keywords).toContain("before");
    expect(keywords).toContain("changes");
    expect(keywords).toContain("after");
    expect(keywords).toContain("refactor");
  });

  test("filters out stop words", () => {
    const keywords = extractKeywords({
      frontMatter: { title: "The quick brown fox and the lazy dog" },
    });
    expect(keywords).not.toContain("the");
    expect(keywords).not.toContain("and");
    expect(keywords).toContain("quick");
    expect(keywords).toContain("brown");
  });

  test("filters out single-character words", () => {
    const keywords = extractKeywords({ filename: "a-b-test.ssce" });
    expect(keywords).not.toContain("a");
    expect(keywords).not.toContain("b");
    expect(keywords).toContain("test");
  });

  test("deduplicates keywords", () => {
    const keywords = extractKeywords({
      filename: "login.ssce",
      frontMatter: { title: "Login page" },
    });
    const loginCount = keywords.filter((w) => w === "login").length;
    expect(loginCount).toBe(1);
  });

  test("handles empty input", () => {
    const keywords = extractKeywords({});
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBe(0);
  });
});

describe("isSsceFile", () => {
  test("recognises .ssce extension", () => {
    expect(isSsceFile("test.ssce")).toBe(true);
    expect(isSsceFile("my-file.SSCE")).toBe(true);
    expect(isSsceFile("path/to/file.ssce")).toBe(true);
  });

  test("rejects non-.ssce files", () => {
    expect(isSsceFile("test.png")).toBe(false);
    expect(isSsceFile("test.ssce.bak")).toBe(false);
    expect(isSsceFile("ssce")).toBe(false);
  });
});
