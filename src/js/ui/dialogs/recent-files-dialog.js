/**
 * Recent Files Dialog
 * Shows a grid of recently opened/saved .ssce files with thumbnails
 */

import { getRecentFiles, clearRecentFiles, removeRecentFile, updateRecentFileThumbnail, updateRecentFileMetadata } from "../../utils/recent-files.js";
import * as bridge from "../../tauri-bridge.js";

let dialog = null;
let onFileSelect = null;

/**
 * Initialize the recent files dialog
 * @param {Function} fileSelectHandler - Called when a file is selected, receives file path
 */
export function initRecentFilesDialog(fileSelectHandler) {
  onFileSelect = fileSelectHandler;
  dialog = document.getElementById("dialog-recent-files");

  // Close button (X)
  document.getElementById("recent-files-close").addEventListener("click", () => {
    dialog.close();
  });

  // Cancel button
  document.getElementById("recent-files-cancel").addEventListener("click", () => {
    dialog.close();
  });

  // Clear history button
  document.getElementById("recent-files-clear").addEventListener("click", async () => {
    const { showConfirmModal } = await import("./index.js");
    const confirmed = await showConfirmModal("Clear Recent Files", "This will clear your recent files history. This cannot be undone.", { confirmText: "Clear", cancelText: "Cancel", type: "warning" });
    if (confirmed) {
      clearRecentFiles();
      renderGrid();
    }
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
 * Show the recent files dialog
 */
export function showRecentFilesDialog() {
  if (!dialog) {
    console.error("Recent files dialog not initialized");
    return;
  }

  renderGrid();
  dialog.showModal();
}

/**
 * Render the thumbnail grid
 */
async function renderGrid() {
  const grid = document.getElementById("recent-files-grid");
  const emptyState = document.getElementById("recent-files-empty");
  const files = getRecentFiles();

  if (files.length === 0) {
    grid.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  grid.classList.remove("hidden");
  emptyState.classList.add("hidden");
  grid.innerHTML = "";

  for (const file of files) {
    const item = createThumbnailItem(file);
    grid.appendChild(item);

    // Load thumbnail if not cached
    if (!file.thumbnail && bridge.isTauri()) {
      loadThumbnail(file.path, item);
    }
  }
}

/**
 * Create a thumbnail item element
 * @param {Object} file - Recent file object
 * @returns {HTMLElement}
 */
function createThumbnailItem(file) {
  const item = document.createElement("div");
  item.className = "group relative cursor-pointer rounded-lg overflow-hidden bg-gray-700 hover:bg-gray-600 transition-colors";
  item.dataset.path = file.path;

  // Format date
  const date = new Date(file.lastOpened);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  // Format snapshot count (max 99, show 99+ for higher)
  const snapshotCount = file.snapshotCount || 0;
  const snapshotDisplay = snapshotCount > 99 ? "99+" : snapshotCount.toString();
  const snapshotBadge = snapshotCount > 0 ? `<span class="snapshot-badge bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center inline-block" title="${snapshotCount} snapshot${snapshotCount !== 1 ? "s" : ""}">${snapshotDisplay}</span>` : "";

  item.innerHTML = `
    <div class="aspect-square bg-gray-900 flex items-center justify-center overflow-hidden relative">
      ${
        file.thumbnail
          ? `<img src="${file.thumbnail}" alt="${file.filename}" class="w-full h-full object-contain" />`
          : `<div class="thumbnail-placeholder flex flex-col items-center justify-center text-gray-500">
               <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
               <span class="text-xs mt-1">Loading...</span>
             </div>`
      }
    </div>
    <div class="p-2">
      <p class="text-sm font-medium truncate" title="${file.filename}">${file.filename}</p>
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-400">${dateStr}</span>
        ${snapshotBadge}
      </div>
    </div>
    <button class="remove-btn absolute top-1 right-1 p-1 bg-gray-800/80 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600" title="Remove from history">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;

  // Click to open file
  item.addEventListener("click", (e) => {
    // Don't open if clicking remove button
    if (e.target.closest(".remove-btn")) return;

    const path = item.dataset.path;
    dialog.close();
    if (onFileSelect) {
      onFileSelect(path);
    }
  });

  // Remove button
  const removeBtn = item.querySelector(".remove-btn");
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    removeRecentFile(file.path);
    item.remove();

    // Check if grid is now empty
    const files = getRecentFiles();
    if (files.length === 0) {
      document.getElementById("recent-files-grid").classList.add("hidden");
      document.getElementById("recent-files-empty").classList.remove("hidden");
    }
  });

  // Show full path on hover
  item.title = file.path;

  return item;
}

/**
 * Load metadata (thumbnail + snapshot count) from file and update the item
 * @param {string} path - File path
 * @param {HTMLElement} item - Grid item element
 */
async function loadThumbnail(path, item) {
  try {
    const invoke = window.__TAURI__.core.invoke;
    const metadata = await invoke("get_ssce_metadata", { path });

    if (metadata.thumbnail) {
      // Update the thumbnail display
      const placeholder = item.querySelector(".thumbnail-placeholder");
      if (placeholder) {
        placeholder.parentElement.innerHTML = `<img src="${metadata.thumbnail}" alt="" class="w-full h-full object-contain" />`;
      }
    } else {
      // No thumbnail in file - show generic icon
      const placeholder = item.querySelector(".thumbnail-placeholder");
      if (placeholder) {
        placeholder.innerHTML = `
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="text-xs mt-1">.ssce</span>
        `;
      }
    }

    // Add snapshot badge if count > 0
    if (metadata.snapshot_count > 0) {
      const snapshotDisplay = metadata.snapshot_count > 99 ? "99+" : metadata.snapshot_count.toString();
      const existingBadge = item.querySelector(".snapshot-badge");
      if (!existingBadge) {
        // Find the date row container and add badge there
        const dateRow = item.querySelector(".flex.items-center.justify-between");
        if (dateRow) {
          const badge = document.createElement("span");
          badge.className = "snapshot-badge bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center inline-block";
          badge.title = `${metadata.snapshot_count} snapshot${metadata.snapshot_count !== 1 ? "s" : ""}`;
          badge.textContent = snapshotDisplay;
          dateRow.appendChild(badge);
        }
      }
    }

    // Cache the metadata in localStorage
    updateRecentFileMetadata(path, metadata.thumbnail, metadata.snapshot_count);
  } catch (err) {
    console.error("Failed to load metadata:", err);
    // Show error state
    const placeholder = item.querySelector(".thumbnail-placeholder");
    if (placeholder) {
      placeholder.innerHTML = `
        <svg class="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span class="text-xs mt-1">Error</span>
      `;
    }
  }
}
