import { describe, expect, test } from "bun:test";
import { parseDateFromFilename, groupByMonth, filterByMonth, filterByDateRange, filterBySelectedMonths, detectFormat, suggestZipFilename } from "../../src/js/utils/bulk-export.js";

describe("parseDateFromFilename", () => {
  test("parses YYYY-MM-DD from filename", () => {
    const result = parseDateFromFilename("screenshot-2025-12-15.ssce");
    expect(result).toEqual({ year: 2025, month: 12, day: 15, dateStr: "2025-12-15" });
  });

  test("parses date at start of filename", () => {
    const result = parseDateFromFilename("2025-01-03-login-page.ssce");
    expect(result).toEqual({ year: 2025, month: 1, day: 3, dateStr: "2025-01-03" });
  });

  test("returns null for no date", () => {
    expect(parseDateFromFilename("screenshot.ssce")).toBeNull();
    expect(parseDateFromFilename("my-file.ssce")).toBeNull();
  });

  test("returns null for invalid month", () => {
    expect(parseDateFromFilename("2025-13-01.ssce")).toBeNull();
    expect(parseDateFromFilename("2025-00-01.ssce")).toBeNull();
  });

  test("returns null for invalid day", () => {
    expect(parseDateFromFilename("2025-01-00.ssce")).toBeNull();
    expect(parseDateFromFilename("2025-01-32.ssce")).toBeNull();
  });

  test("handles full path", () => {
    const result = parseDateFromFilename("/home/user/ssce/2025-06-20-notes.ssce");
    expect(result.dateStr).toBe("2025-06-20");
  });
});

describe("groupByMonth", () => {
  const files = [{ name: "2025-12-01-a.ssce" }, { name: "2025-12-15-b.ssce" }, { name: "2025-11-20-c.ssce" }, { name: "no-date.ssce" }];

  test("groups files by YYYY-MM", () => {
    const groups = groupByMonth(files);
    expect(groups.get("2025-12").length).toBe(2);
    expect(groups.get("2025-11").length).toBe(1);
  });

  test("puts undated files in 'unknown'", () => {
    const groups = groupByMonth(files);
    expect(groups.get("unknown").length).toBe(1);
  });

  test("handles empty array", () => {
    const groups = groupByMonth([]);
    expect(groups.size).toBe(0);
  });
});

describe("filterByMonth", () => {
  const files = [{ name: "2025-12-01-a.ssce" }, { name: "2025-12-15-b.ssce" }, { name: "2025-11-20-c.ssce" }, { name: "no-date.ssce" }];

  test("filters to specific month", () => {
    const result = filterByMonth(files, "2025-12");
    expect(result.length).toBe(2);
  });

  test("returns empty for no matches", () => {
    expect(filterByMonth(files, "2024-01").length).toBe(0);
  });

  test("excludes undated files", () => {
    expect(filterByMonth(files, "unknown").length).toBe(0);
  });
});

describe("filterByDateRange", () => {
  const files = [{ name: "2025-10-01-a.ssce" }, { name: "2025-11-15-b.ssce" }, { name: "2025-12-20-c.ssce" }, { name: "2026-01-05-d.ssce" }];

  test("filters inclusive range", () => {
    const result = filterByDateRange(files, "2025-11-01", "2025-12-31");
    expect(result.length).toBe(2);
  });

  test("includes exact boundary dates", () => {
    const result = filterByDateRange(files, "2025-10-01", "2025-10-01");
    expect(result.length).toBe(1);
  });

  test("returns empty for no matches", () => {
    expect(filterByDateRange(files, "2024-01-01", "2024-12-31").length).toBe(0);
  });
});

describe("filterBySelectedMonths", () => {
  const files = [{ name: "2025-10-01-a.ssce" }, { name: "2025-11-15-b.ssce" }, { name: "2025-12-20-c.ssce" }];

  test("filters by multiple selected months", () => {
    const result = filterBySelectedMonths(files, ["2025-10", "2025-12"]);
    expect(result.length).toBe(2);
  });

  test("handles single month", () => {
    const result = filterBySelectedMonths(files, ["2025-11"]);
    expect(result.length).toBe(1);
  });

  test("returns empty for no matches", () => {
    expect(filterBySelectedMonths(files, ["2024-01"]).length).toBe(0);
  });
});

describe("detectFormat", () => {
  test("returns PNG for transparent images", () => {
    expect(detectFormat(true)).toBe("image/png");
  });

  test("returns JPEG for opaque images", () => {
    expect(detectFormat(false)).toBe("image/jpeg");
  });
});

describe("suggestZipFilename", () => {
  const tsPattern = /\d{4}-\d{2}-\d{2}-\d{2}-\d{2}/;

  test("suggests filename for all files with timestamp", () => {
    const result = suggestZipFilename({ type: "all" });
    expect(result).toMatch(/^ssce-backup-all-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.zip$/);
  });

  test("suggests filename for single month with timestamp", () => {
    const result = suggestZipFilename({ type: "month", month: "2025-12" });
    expect(result).toMatch(/^ssce-backup-2025-12-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.zip$/);
  });

  test("suggests filename for date range with timestamp", () => {
    const result = suggestZipFilename({ type: "range", startDate: "2025-10-01", endDate: "2025-12-31" });
    expect(result).toMatch(/^ssce-backup-2025-10-01-to-2025-12-31-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.zip$/);
  });

  test("suggests filename for single selected month with timestamp", () => {
    const result = suggestZipFilename({ type: "selected", months: ["2025-11"] });
    expect(result).toMatch(/^ssce-backup-2025-11-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.zip$/);
  });

  test("suggests filename for multiple selected months with timestamp", () => {
    const result = suggestZipFilename({ type: "selected", months: ["2025-12", "2025-10"] });
    expect(result).toMatch(/^ssce-backup-2025-10-to-2025-12-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.zip$/);
  });

  test("defaults to all with timestamp", () => {
    const result = suggestZipFilename();
    expect(result).toMatch(/^ssce-backup-all-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.zip$/);
  });
});
