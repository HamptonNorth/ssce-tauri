/**
 * Snapshot Export
 *
 * Generates a standalone static HTML file containing all snapshots.
 * The exported file is self-contained, has no JavaScript, and can be
 * safely shared via email or other channels.
 */

import { state } from "../state.js";
import { getSnapshots, getFrontMatter } from "../ssce-file-ops.js";

/**
 * Generate static HTML viewer for snapshots (no JavaScript)
 * Displays all snapshots vertically - compatible with email clients
 * @returns {string} Complete HTML document as string
 */
export function generateStaticHtml() {
  const snapshots = getSnapshots();
  const frontMatter = getFrontMatter();

  const title = frontMatter.title || state.filename || "Snapshots";

  // Generate HTML for each snapshot
  const snapshotBlocks = snapshots
    .map((snapshot, index) => {
      const fm = snapshot.frontMatter || {};
      const snapshotTitle = fm.title || `Snapshot ${snapshot.id}`;
      const date = fm.created ? formatDate(fm.created) : "";

      return `
    <div class="snapshot">
      <div class="snapshot-header">
        <span class="snapshot-number">${index + 1} of ${snapshots.length}</span>
      </div>
      <div class="image-container">
        <img src="${snapshot.image}" alt="${escapeHtml(snapshotTitle)}" />
      </div>
      <div class="metadata">
        <h3>${escapeHtml(snapshotTitle)}</h3>
        ${fm.summary ? `<p class="summary">${escapeHtml(fm.summary)}</p>` : ""}
        ${date ? `<p class="date">${date}</p>` : ""}
      </div>
    </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Snapshots</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      background: #111827;
      color: #e5e7eb;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
      border-bottom: 1px solid #374151;
    }
    .header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 0.25rem 0;
      color: #f3f4f6;
    }
    .header p {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }
    .snapshot {
      margin-bottom: 3rem;
      background: #1f2937;
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .snapshot-header {
      padding: 0.5rem 1rem;
      background: #374151;
      border-bottom: 1px solid #4b5563;
    }
    .snapshot-number {
      font-size: 0.875rem;
      color: #9ca3af;
    }
    .image-container {
      padding: 1rem;
      text-align: center;
      background: #111827;
    }
    .image-container img {
      max-width: 100%;
      height: auto;
      border-radius: 0.25rem;
    }
    .metadata {
      padding: 1rem;
      border-top: 1px solid #374151;
    }
    .metadata h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: #f3f4f6;
    }
    .metadata .summary {
      font-size: 0.875rem;
      color: #9ca3af;
      margin: 0 0 0.5rem 0;
      white-space: pre-wrap;
    }
    .metadata .date {
      font-size: 0.75rem;
      color: #6b7280;
      margin: 0;
    }
    .footer {
      text-align: center;
      padding-top: 1.5rem;
      margin-top: 2rem;
      border-top: 1px solid #374151;
      font-size: 0.75rem;
      color: #4b5563;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(title)}</h1>
      <p>${snapshots.length} snapshot${snapshots.length !== 1 ? "s" : ""}</p>
    </div>
    ${snapshotBlocks}
    <div class="footer">
      Created with SSCE - Simple Screen Capture Editor
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate filename for export
 * Format: {basename}_YYYYMMDD-HHMM.html
 * @returns {string} Suggested filename
 */
export function generateExportFilename() {
  const frontMatter = getFrontMatter();
  const baseName = frontMatter.title ? frontMatter.title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "_") : state.filename ? state.filename.replace(/\.[^.]+$/, "") : "snapshots";

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 13); // YYYYMMDD-HHMM

  return `${baseName}_${timestamp}.html`;
}

/**
 * Download the static HTML as a file
 * @returns {string} The filename that was downloaded
 */
export function downloadSnapshotHtml() {
  const html = generateStaticHtml();
  const filename = generateExportFilename();

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Format ISO date string for display
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/**
 * Escape HTML special characters
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
