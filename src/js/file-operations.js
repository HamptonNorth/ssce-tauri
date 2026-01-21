/**
 * File Operations
 * Handles file browsing, loading, saving, and undo/redo
 */

import { state, modules, persistState } from "./state.js";
import { saveImage, saveImageAs } from "./utils/export.js";
import { showAlertModal, showConfirmModal } from "./ui/dialogs/index.js";
import { showToast } from "./utils/toast.js";

// ============================================================================
// Browse State
// ============================================================================

// Current browse state
const browseState = {
  currentDir: "",
  selectedFile: null,
  directoryMode: false,
  filter: "all", // "all", "ssce", "images"
};

// ============================================================================
// File Operations
// ============================================================================

/**
 * Create a new blank canvas (800x600 transparent)
 * Warns if there are unsaved changes
 * @param {Function} updateStatusBar - Callback to update status bar
 */
export async function newCanvas(updateStatusBar) {
  if (state.hasUnsavedChanges) {
    const confirmed = await showConfirmModal("Unsaved Changes", "You have unsaved changes that will be lost.\n\nCreate new canvas anyway?", { confirmText: "Discard & Create", cancelText: "Cancel", type: "warning" });
    if (!confirmed) return;
  }

  // Clear all layers and reset to 800x600
  modules.layerManager.clear();

  // Clear filename state
  state.filename = null;
  state.hasUnsavedChanges = false;

  // Update status bar
  if (updateStatusBar) {
    updateStatusBar();
  }
}

/**
 * Open file dialog - shows custom browser first if default path is configured
 */
export function openFile() {
  if (state.config?.defaultPathImageLoad) {
    showBrowseDialog();
  } else {
    document.getElementById("file-input").click();
  }
}

/**
 * Show the file browser dialog
 * @param {boolean} directoryMode - If true, allows selecting directories instead of files
 */
async function showBrowseDialog(directoryMode = false) {
  const dialog = document.getElementById("dialog-browse");
  browseState.selectedFile = null;
  browseState.directoryMode = directoryMode;

  // Update dialog title
  const titleEl = dialog.querySelector("h2");
  if (titleEl) {
    titleEl.textContent = directoryMode ? "Select Save Directory" : "Open Image";
  }

  // Show/hide appropriate buttons
  const openBtn = document.getElementById("browse-open");
  const selectDirBtn = document.getElementById("browse-select-dir");
  if (directoryMode) {
    openBtn.classList.add("hidden");
    selectDirBtn.classList.remove("hidden");
  } else {
    openBtn.classList.remove("hidden");
    selectDirBtn.classList.add("hidden");
  }

  updateBrowseOpenButton();

  // Load default directory
  const defaultDir = directoryMode ? state.customSaveDirectory || state.config?.defaultPathImageSave || state.config?.defaultPathImageLoad || "" : state.config?.defaultPathImageLoad || "";
  await browseDirectory(defaultDir);

  dialog.showModal();
}

/**
 * Browse a directory and update the file list
 */
async function browseDirectory(dir) {
  const listEl = document.getElementById("browse-list");
  listEl.innerHTML = '<div class="p-4 text-gray-500">Loading...</div>';

  try {
    const params = new URLSearchParams();
    if (dir) params.set("dir", dir);
    if (browseState.filter) params.set("filter", browseState.filter);
    const url = `/api/browse?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.success) {
      listEl.innerHTML = `<div class="p-4 text-red-400">${data.error}</div>`;
      return;
    }

    browseState.currentDir = data.currentDir;
    document.getElementById("browse-path").textContent = data.currentDir;

    // Build file list HTML
    let html = "";

    // Directories first
    for (const dir of data.directories) {
      html += `
                <div class="browse-item browse-dir flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer"
                     data-path="${escapeHtml(dir.path)}">
                    <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                    </svg>
                    <span>${escapeHtml(dir.name)}</span>
                </div>
            `;
    }

    // Then files
    for (const file of data.files) {
      html += `
                <div class="browse-item browse-file flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer"
                     data-path="${escapeHtml(file.path)}" data-name="${escapeHtml(file.name)}">
                    <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span>${escapeHtml(file.name)}</span>
                </div>
            `;
    }

    if (!data.directories.length && !data.files.length) {
      html = '<div class="p-4 text-gray-500">No images found in this directory</div>';
    }

    listEl.innerHTML = html;

    // Add click handlers
    listEl.querySelectorAll(".browse-dir").forEach((el) => {
      el.addEventListener("click", () => browseDirectory(el.dataset.path));
    });

    listEl.querySelectorAll(".browse-file").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectBrowseFile(el);
      });
      el.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectBrowseFile(el);
        openBrowseSelected();
      });
    });
  } catch (err) {
    listEl.innerHTML = `<div class="p-4 text-red-400">Error: ${err.message}</div>`;
  }
}

/**
 * Select a file in the browser
 */
function selectBrowseFile(el) {
  // Remove selection from others
  document.querySelectorAll(".browse-file").forEach((item) => {
    item.classList.remove("bg-blue-600");
  });

  // Select this one
  el.classList.add("bg-blue-600");
  browseState.selectedFile = {
    path: el.dataset.path,
    name: el.dataset.name,
  };

  // Update selected file display
  const selectedEl = document.getElementById("browse-selected");
  if (selectedEl) {
    selectedEl.textContent = browseState.selectedFile.name;
  }

  updateBrowseOpenButton();
}

/**
 * Update the Open button state
 */
function updateBrowseOpenButton() {
  const btn = document.getElementById("browse-open");
  if (btn) {
    btn.disabled = !browseState.selectedFile;
  }
}

/**
 * Open the selected file from browser
 */
export async function openBrowseSelected(updateStatusBar) {
  if (!browseState.selectedFile) return;

  const dialog = document.getElementById("dialog-browse");
  dialog.close();

  const filePath = browseState.selectedFile.path;
  const isSsceFile = filePath.toLowerCase().endsWith(".ssce");

  try {
    if (isSsceFile) {
      // Load .ssce file via dedicated endpoint
      const { loadSsceFile } = await import("./ssce-file-ops.js");
      const result = await loadSsceFile(filePath, updateStatusBar);
      if (!result.success) {
        await showAlertModal("Load Failed", `Unable to load the .ssce file.\n\nError: ${result.error || "Unknown error"}`, "error");
      }
    } else {
      // Load standard image file
      const response = await fetch(`/api/load?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();

      if (data.success && data.data) {
        const img = new Image();
        img.onload = () => {
          modules.layerManager.clear();
          modules.layerManager.addImageLayer(img);
          state.filename = data.filename;
          state.hasUnsavedChanges = false;
          updateStatusBar();
          modules.canvasManager.render();

          // Auto-fit large images and update zoom button
          import("./utils/zoom.js").then((zoom) => {
            zoom.recalculateZoom(true);
          });
        };
        img.src = data.data;
      } else {
        await showAlertModal("Load Failed", "Unable to load the image file.\n\nError: " + (data.error || "Unknown error"), "error");
      }
    }
  } catch (err) {
    await showAlertModal("Load Failed", "Unable to load the file.\n\nError: " + err.message, "error");
  }
}

/**
 * Select the current directory in directory mode
 */
export function selectCurrentDirectory(updateStatusBar) {
  if (!browseState.currentDir) return;

  const dialog = document.getElementById("dialog-browse");
  dialog.close();

  // Save the selected directory
  state.customSaveDirectory = browseState.currentDir;
  persistState("customSaveDirectory", browseState.currentDir);

  // Enable save to default if not already enabled
  if (!state.saveToDefault) {
    state.saveToDefault = true;
    persistState("saveToDefault", "true");

    const checkMark = document.getElementById("save-to-default-check");
    const uncheckMark = document.getElementById("save-to-default-uncheck");
    if (checkMark) checkMark.classList.remove("hidden");
    if (uncheckMark) uncheckMark.classList.add("hidden");
  }

  updateStatusBar();
}

/**
 * Set the file type filter for browsing
 * @param {string} filter - "all", "ssce", or "images"
 */
export function setBrowseFilter(filter) {
  browseState.filter = filter;
}

/**
 * Browse directory (exported for dialog use)
 */
export function browseTo(dir) {
  return browseDirectory(dir);
}

/**
 * Show browse dialog for directory selection
 */
export function setSaveDirectory() {
  showBrowseDialog(true);
}

/**
 * Escape HTML for safe insertion
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Handle file selection from system file input
 */
export function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  loadImageFile(file);
}

/**
 * Load an image file or .ssce file into the canvas
 */
export function loadImageFile(file, updateStatusBar) {
  // Check if this is an .ssce file
  if (file.name.toLowerCase().endsWith(".ssce")) {
    loadSsceFromFile(file, updateStatusBar);
    return;
  }

  // Standard image loading
  const reader = new FileReader();

  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      modules.layerManager.clear();
      modules.layerManager.addImageLayer(img);
      state.filename = file.name;
      state.hasUnsavedChanges = false;
      if (updateStatusBar) updateStatusBar();
      modules.canvasManager.render();

      // Auto-fit large images and update zoom button
      import("./utils/zoom.js").then((zoom) => {
        zoom.recalculateZoom(true);
      });
    };
    img.onerror = async () => {
      await showAlertModal("Invalid Image", `The file "${file.name}" could not be loaded as an image.\n\nIt may be corrupted or not a valid image format.`, "error");
    };
    img.src = e.target.result;
  };

  reader.onerror = async () => {
    await showAlertModal("Read Failed", `Could not read the file "${file.name}".\n\nError: ${reader.error?.message || "Unknown error"}`, "error");
  };

  reader.readAsDataURL(file);
}

/**
 * Load .ssce file from File object (via system file picker)
 */
async function loadSsceFromFile(file, updateStatusBar) {
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const jsonString = e.target.result;
      const { deserialize } = await import("./utils/ssce-format.js");
      const { initSsceSession } = await import("./ssce-file-ops.js");

      // Deserialize JSON to layers
      const sessionData = await deserialize(jsonString);

      // Clear current state
      modules.layerManager.clear();

      // Restore canvas size
      modules.canvasManager.setSize(sessionData.canvasSize.width, sessionData.canvasSize.height);

      // Restore layers (directly set, don't use addLayer to avoid undo stack)
      modules.layerManager.layers = sessionData.layers;

      // Reset layer ID counter to max ID + 1
      const maxId = Math.max(...sessionData.layers.map((l) => l.id), 0);
      modules.layerManager.nextId = maxId + 1;

      // Restore front matter and snapshots to state
      state.frontMatter = sessionData.frontMatter;
      state.snapshots = sessionData.snapshots;

      // Update file state
      state.filename = file.name;
      state.hasUnsavedChanges = false;

      // Render
      modules.canvasManager.render();

      // Update zoom
      import("./utils/zoom.js").then((zoom) => {
        zoom.recalculateZoom(true);
      });

      // Update status bar
      if (updateStatusBar) {
        updateStatusBar();
      }

      showToast(`Loaded: ${file.name}`, "success");
    } catch (err) {
      console.error("Error loading .ssce file:", err);
      await showAlertModal("Invalid .ssce File", `The file "${file.name}" could not be loaded.\n\n${err.message}`, "error");
    }
  };

  reader.onerror = async () => {
    await showAlertModal("Read Failed", `Could not read the file "${file.name}".\n\nError: ${reader.error?.message || "Unknown error"}`, "error");
  };

  reader.readAsText(file);
}

/**
 * Load initial image from server (if provided via command line)
 */
export async function loadInitialImage(updateStatusBar) {
  try {
    const response = await fetch("/api/image");
    const data = await response.json();

    if (data.loaded && data.data) {
      const img = new Image();
      img.onload = () => {
        modules.layerManager.addImageLayer(img);
        state.filename = data.filename;
        updateStatusBar();
        modules.canvasManager.render();

        // Auto-fit large images and update zoom button
        import("./utils/zoom.js").then((zoom) => {
          zoom.recalculateZoom(true);
        });
      };
      img.src = data.data;
    }
  } catch (err) {
    console.log("SSCE: No initial image to load");
  }
}

/**
 * Handle save button click
 */
export async function handleSave(handleSaveAs, updateStatusBar) {
  if (!modules.layerManager.hasLayers()) {
    await showAlertModal("Nothing to Save", "Open or create an image first before saving.", "info");
    return;
  }

  // If save to default is enabled, force Save As behavior
  if (state.saveToDefault) {
    handleSaveAs();
    return;
  }

  const imageData = modules.canvasManager.toDataURL();
  const result = await saveImage(imageData);

  if (result.success) {
    state.filename = result.filename;
    state.hasUnsavedChanges = false;
    updateStatusBar();
  }
}

/**
 * Handle save as button click
 */
export async function handleSaveAs(showSaveAsDialog) {
  if (!modules.layerManager.hasLayers()) {
    await showAlertModal("Nothing to Save", "Open or create an image first before saving.", "info");
    return;
  }
  showSaveAsDialog();
}

/**
 * Handle print button click
 */
export async function handlePrint(showPrintDialog) {
  if (!modules.layerManager.hasLayers()) {
    await showAlertModal("Nothing to Print", "Open or create an image first before printing.", "info");
    return;
  }
  showPrintDialog();
}

// ============================================================================
// Undo/Redo
// ============================================================================

export function handleUndo() {
  modules.layerManager.undo();
  modules.canvasManager.render();
  updateUndoRedoButtons();
  state.hasUnsavedChanges = true;
}

export function handleRedo() {
  modules.layerManager.redo();
  modules.canvasManager.render();
  updateUndoRedoButtons();
  state.hasUnsavedChanges = true;
}

export function updateUndoRedoButtons() {
  document.getElementById("btn-undo").disabled = !modules.layerManager.canUndo();
  document.getElementById("btn-redo").disabled = !modules.layerManager.canRedo();
}
