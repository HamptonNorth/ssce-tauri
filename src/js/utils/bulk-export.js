/**
 * SSCE - Bulk Export Utilities
 *
 * Pure logic for date parsing, filtering, grouping, and format detection.
 * Used by the bulk export dialog for .ssce → PNG/JPEG conversion.
 */

/**
 * Parse a YYYY-MM-DD date from a filename
 * @param {string} filename - Filename (with or without path/extension)
 * @returns {{ year: number, month: number, day: number, dateStr: string } | null}
 */
export function parseDateFromFilename(filename) {
  const match = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  // Basic validation
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return {
    year,
    month,
    day,
    dateStr: `${match[1]}-${match[2]}-${match[3]}`,
  };
}

/**
 * Group files by month (YYYY-MM)
 * Files without a parseable date go into "unknown" group.
 * @param {Array<{ name: string }>} files
 * @returns {Map<string, Array>} Map of "YYYY-MM" → files
 */
export function groupByMonth(files) {
  const groups = new Map();

  for (const file of files) {
    const parsed = parseDateFromFilename(file.name);
    const key = parsed ? `${parsed.year}-${String(parsed.month).padStart(2, "0")}` : "unknown";

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(file);
  }

  return groups;
}

/**
 * Filter files to a specific month
 * @param {Array<{ name: string }>} files
 * @param {string} yearMonth - e.g. "2025-12"
 * @returns {Array}
 */
export function filterByMonth(files, yearMonth) {
  const [targetYear, targetMonth] = yearMonth.split("-").map(Number);
  return files.filter((file) => {
    const parsed = parseDateFromFilename(file.name);
    return parsed && parsed.year === targetYear && parsed.month === targetMonth;
  });
}

/**
 * Filter files by date range (inclusive)
 * @param {Array<{ name: string }>} files
 * @param {string} startDate - "YYYY-MM-DD"
 * @param {string} endDate - "YYYY-MM-DD"
 * @returns {Array}
 */
export function filterByDateRange(files, startDate, endDate) {
  return files.filter((file) => {
    const parsed = parseDateFromFilename(file.name);
    if (!parsed) return false;
    return parsed.dateStr >= startDate && parsed.dateStr <= endDate;
  });
}

/**
 * Filter files by selected months
 * @param {Array<{ name: string }>} files
 * @param {string[]} months - Array of "YYYY-MM" strings
 * @returns {Array}
 */
export function filterBySelectedMonths(files, months) {
  const monthSet = new Set(months);
  return files.filter((file) => {
    const parsed = parseDateFromFilename(file.name);
    if (!parsed) return false;
    const key = `${parsed.year}-${String(parsed.month).padStart(2, "0")}`;
    return monthSet.has(key);
  });
}

/**
 * Detect optimal export format based on transparency
 * @param {boolean} hasTransparency - Whether the image has transparent pixels
 * @returns {string} "image/png" or "image/jpeg"
 */
export function detectFormat(hasTransparency) {
  return hasTransparency ? "image/png" : "image/jpeg";
}

/**
 * Suggest a ZIP filename based on date selection
 * @param {Object} options
 * @param {string} [options.type] - "all", "month", "range", "selected"
 * @param {string} [options.month] - "YYYY-MM" for single month
 * @param {string[]} [options.months] - Array of "YYYY-MM" for selected months
 * @param {string} [options.startDate] - "YYYY-MM-DD" for range
 * @param {string} [options.endDate] - "YYYY-MM-DD" for range
 * @returns {string}
 */
export function suggestZipFilename(options = {}) {
  const { type = "all", month, months, startDate, endDate } = options;
  const ts = getTimestamp();

  switch (type) {
    case "month":
      return `ssce-backup-${month}-${ts}.zip`;
    case "range":
      return `ssce-backup-${startDate}-to-${endDate}-${ts}.zip`;
    case "selected":
      if (months && months.length === 1) {
        return `ssce-backup-${months[0]}-${ts}.zip`;
      }
      if (months && months.length > 1) {
        const sorted = [...months].sort();
        return `ssce-backup-${sorted[0]}-to-${sorted[sorted.length - 1]}-${ts}.zip`;
      }
      return `ssce-backup-${ts}.zip`;
    default:
      return `ssce-backup-all-${ts}.zip`;
  }
}

/**
 * Get current timestamp as "YYYY-MM-DD-HH-MM"
 * @returns {string}
 */
export function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

/**
 * Get current month as "YYYY-MM"
 * @returns {string}
 */
export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get last month as "YYYY-MM"
 * @returns {string}
 */
export function getLastMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
