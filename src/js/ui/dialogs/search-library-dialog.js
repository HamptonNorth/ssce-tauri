/**
 * Search Library Dialog
 *
 * Provides full-text search of .ssce files in the library using SQLite FTS5.
 * Users can search by keywords and filter by date range.
 *
 * Features:
 * - Text search: Matches filename, title, summary, keywords (with prefix matching)
 * - Date filtering: From/To date range on the modified date
 * - Locale-aware date parsing: Automatically detects UK (dd/mm/yyyy) vs US (mm/dd/yyyy)
 * - Thumbnail grid: Visual preview of search results
 *
 * The actual search is performed by the Rust backend via db_search_files command.
 * This dialog handles the UI and date parsing/validation.
 *
 * @module search-library-dialog
 */

import { searchFiles } from "../../utils/recent-files.js";

let dialog = null;
let onFileSelect = null;

/**
 * Parse a date string using locale-aware parsing
 * Supports multiple common formats:
 * - ISO: 2026-01-15
 * - US: 1/15/2026 or 01/15/2026
 * - EU: 15/1/2026 or 15/01/2026
 * - Dashes: 1-15-2026, 15-1-2026, etc.
 *
 * Uses browser's locale to determine if day or month comes first
 * @param {string} input - Date string to parse
 * @returns {string|null} ISO date string (YYYY-MM-DD) or null if invalid
 */
function parseLocalDate(input) {
  if (!input || !input.trim()) return null;

  const str = input.trim();

  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return validateAndFormat(parseInt(year), parseInt(month), parseInt(day));
  }

  // Try formats with / or - separators (could be US or EU format)
  const slashMatch = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (slashMatch) {
    const [, first, second, year] = slashMatch;
    const firstNum = parseInt(first);
    const secondNum = parseInt(second);
    const yearNum = parseInt(year);

    // Determine locale preference for day/month order
    // Create a date and format it to see which comes first
    const testDate = new Date(2000, 11, 25); // Dec 25, 2000
    const formatted = testDate.toLocaleDateString();
    const dayFirst = formatted.startsWith("25");

    let month, day;
    if (dayFirst) {
      // EU format: day/month/year
      day = firstNum;
      month = secondNum;
    } else {
      // US format: month/day/year
      month = firstNum;
      day = secondNum;
    }

    // If the guessed format produces invalid date, try the other way
    const result = validateAndFormat(yearNum, month, day);
    if (result) return result;

    // Try swapped interpretation
    return validateAndFormat(yearNum, firstNum, secondNum) || validateAndFormat(yearNum, secondNum, firstNum);
  }

  // Try natural language parsing via Date constructor as last resort
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return validateAndFormat(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }

  return null;
}

/**
 * Validate date components and format as ISO string
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @returns {string|null} ISO date string or null if invalid
 */
function validateAndFormat(year, month, day) {
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // Check if the date is actually valid (e.g., not Feb 30)
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  // Return ISO format
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Generate a locale-appropriate date placeholder example
 * @param {Date} date - The date to format as an example
 * @returns {string} Formatted example like "e.g. 15/1/2026" or "e.g. 1/15/2026"
 */
function getLocaleDatePlaceholder(date) {
  // Use toLocaleDateString with numeric format to get locale-appropriate order
  const formatted = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  return `e.g. ${formatted}`;
}

/**
 * Initialize the search library dialog
 * @param {Function} fileSelectHandler - Called when a file is selected, receives file path
 */
export function initSearchLibraryDialog(fileSelectHandler) {
  onFileSelect = fileSelectHandler;
  dialog = document.getElementById("dialog-search-library");

  // Set locale-aware date placeholders
  const now = new Date();
  const fromExample = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
  const toExample = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
  document.getElementById("search-library-from").placeholder = getLocaleDatePlaceholder(fromExample);
  document.getElementById("search-library-to").placeholder = getLocaleDatePlaceholder(toExample);

  // Close button (X)
  document.getElementById("search-library-close").addEventListener("click", () => {
    dialog.close();
  });

  // Cancel button
  document.getElementById("search-library-cancel").addEventListener("click", () => {
    dialog.close();
  });

  // Search button
  document.getElementById("search-library-btn").addEventListener("click", performSearch);

  // Enter key in search field
  document.getElementById("search-library-query").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  });

  // Clear button
  document.getElementById("search-library-clear").addEventListener("click", () => {
    document.getElementById("search-library-query").value = "";
    document.getElementById("search-library-from").value = "";
    document.getElementById("search-library-to").value = "";
    clearResults();
  });

  // Close on backdrop click
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      dialog.close();
    }
  });

  // Close on Escape
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dialog.close();
    }
  });
}

/**
 * Show the search library dialog
 */
export function showSearchLibraryDialog() {
  if (!dialog) {
    console.error("Search library dialog not initialized");
    return;
  }

  clearResults();
  dialog.showModal();

  // Focus the search input
  document.getElementById("search-library-query").focus();
}

/**
 * Clear the results grid
 */
function clearResults() {
  const grid = document.getElementById("search-library-grid");
  const emptyState = document.getElementById("search-library-empty");
  const status = document.getElementById("search-library-status");

  grid.innerHTML = "";
  grid.classList.add("hidden");
  emptyState.classList.add("hidden");
  status.textContent = "";
}

/**
 * Perform the search
 */
async function performSearch() {
  const query = document.getElementById("search-library-query").value.trim();
  const fromInput = document.getElementById("search-library-from");
  const toInput = document.getElementById("search-library-to");
  const fromValue = fromInput.value.trim();
  const toValue = toInput.value.trim();

  const grid = document.getElementById("search-library-grid");
  const emptyState = document.getElementById("search-library-empty");
  const status = document.getElementById("search-library-status");

  // Reset validation styling
  fromInput.classList.remove("border-red-500");
  toInput.classList.remove("border-red-500");

  // Parse and validate dates
  let fromDate = null;
  let toDate = null;

  if (fromValue) {
    fromDate = parseLocalDate(fromValue);
    if (!fromDate) {
      fromInput.classList.add("border-red-500");
      status.textContent = "Invalid 'From' date format";
      return;
    }
  }

  if (toValue) {
    toDate = parseLocalDate(toValue);
    if (!toDate) {
      toInput.classList.add("border-red-500");
      status.textContent = "Invalid 'To' date format";
      return;
    }
  }

  // Show loading
  grid.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8">Searching...</div>';
  grid.classList.remove("hidden");
  emptyState.classList.add("hidden");
  status.textContent = "";

  try {
    const results = await searchFiles({
      query: query || null,
      fromDate: fromDate,
      toDate: toDate,
      limit: 100,
    });

    if (results.length === 0) {
      grid.classList.add("hidden");
      emptyState.classList.remove("hidden");
      status.textContent = "No files found";
      return;
    }

    status.textContent = `Found ${results.length} file${results.length !== 1 ? "s" : ""}`;
    grid.innerHTML = "";
    grid.classList.remove("hidden");
    emptyState.classList.add("hidden");

    for (const file of results) {
      const item = createResultItem(file);
      grid.appendChild(item);
    }
  } catch (err) {
    console.error("Search failed:", err);
    grid.innerHTML = `<div class="col-span-full text-center text-red-400 py-8">Search failed: ${err}</div>`;
    status.textContent = "";
  }
}

/**
 * Create a result item element
 * @param {Object} file - File object from search results
 * @returns {HTMLElement}
 */
function createResultItem(file) {
  const item = document.createElement("div");
  item.className = "group relative cursor-pointer rounded-lg overflow-hidden bg-gray-700 hover:bg-gray-600 transition-colors";
  item.dataset.path = file.path;

  // Format date
  const dateValue = file.modified || file.lastOpened;
  const date = dateValue ? new Date(dateValue) : null;
  const dateStr = date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

  // Format snapshot count
  const snapshotCount = file.snapshotCount || 0;
  const snapshotDisplay = snapshotCount > 99 ? "99+" : snapshotCount.toString();
  const snapshotBadge = snapshotCount > 0 ? `<span class="snapshot-badge bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center inline-block" title="${snapshotCount} snapshot${snapshotCount !== 1 ? "s" : ""}">${snapshotDisplay}</span>` : "";

  // Title or filename
  const displayName = file.title || file.filename;

  item.innerHTML = `
    <div class="aspect-square bg-gray-900 flex items-center justify-center overflow-hidden relative">
      ${
        file.thumbnail
          ? `<img src="${file.thumbnail}" alt="${file.filename}" class="w-full h-full object-contain" />`
          : `<div class="flex flex-col items-center justify-center text-gray-500">
               <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
               <span class="text-xs mt-1">.ssce</span>
             </div>`
      }
    </div>
    <div class="p-2">
      <p class="text-sm font-medium truncate" title="${displayName}">${displayName}</p>
      ${file.title && file.title !== file.filename ? `<p class="text-xs text-gray-400 truncate">${file.filename}</p>` : ""}
      <div class="flex items-center justify-between mt-1">
        <span class="text-xs text-gray-400">${dateStr}</span>
        ${snapshotBadge}
      </div>
    </div>
  `;

  // Click to open file
  item.addEventListener("click", () => {
    const path = item.dataset.path;
    dialog.close();
    if (onFileSelect) {
      onFileSelect(path);
    }
  });

  // Show full path on hover
  item.title = file.path;

  return item;
}
