/**
 * File-Related Dialogs
 *
 * Dialogs for file operations: Save As, Browse, and Save Options.
 *
 * Exports:
 * - initFileDialogs(callbacks) - Initialize file dialog event handlers
 * - showSaveAsDialog() - Show the Save As dialog
 * - showSaveOptionsDialog(options) - Show unified save options dialog
 */

import { state, modules } from "../../state.js";
import { saveImageAs } from "../../utils/export.js";
import { openBrowseSelected, selectCurrentDirectory, browseTo, setBrowseFilter } from "../../file-operations.js";

// Callback storage for file dialogs
let callbacks = {
  updateStatusBar: null,
  getSaveDirectory: null,
  getAutoIncrementedFilename: null,
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize file dialog event handlers
 *
 * @param {Object} options - Callback functions
 * @param {Function} options.updateStatusBar - Update the status bar display
 * @param {Function} options.getSaveDirectory - Get current save directory
 * @param {Function} options.getAutoIncrementedFilename - Get auto-incremented filename
 */
export function initFileDialogs(options) {
  callbacks = { ...callbacks, ...options };

  // Save As dialog
  const saveAsDialog = document.getElementById("dialog-saveas");
  document.getElementById("saveas-cancel").addEventListener("click", () => saveAsDialog.close());
  saveAsDialog.addEventListener("submit", handleSaveAsSubmit);

  // Browse dialog
  const browseDialog = document.getElementById("dialog-browse");
  document.getElementById("browse-cancel").addEventListener("click", () => browseDialog.close());
  document.getElementById("browse-open").addEventListener("click", () => openBrowseSelected(callbacks.updateStatusBar));
  document.getElementById("browse-select-dir").addEventListener("click", () => selectCurrentDirectory(callbacks.updateStatusBar));
  document.getElementById("browse-refresh").addEventListener("click", () => {
    // Get current directory from the browse-path element
    const currentDir = document.getElementById("browse-path").textContent;
    browseTo(currentDir);
  });
  document.getElementById("browse-filter").addEventListener("change", (e) => {
    setBrowseFilter(e.target.value);
    // Refresh the current directory with new filter
    const currentDir = document.getElementById("browse-path").textContent;
    browseTo(currentDir);
  });
  document.getElementById("browse-system").addEventListener("click", () => {
    browseDialog.close();
    document.getElementById("file-input").click();
  });

  // Unified Save Options dialog
  const saveOptionsDialog = document.getElementById("dialog-save-options");
  document.getElementById("save-options-cancel").addEventListener("click", () => {
    saveOptionsDialog.close();
    state.saveOptionsResolve?.(null);
  });
  saveOptionsDialog.addEventListener("submit", handleSaveOptionsSubmit);
  saveOptionsDialog.addEventListener("cancel", () => {
    state.saveOptionsResolve?.(null);
  });
}

// ============================================================================
// Save As Dialog
// ============================================================================

/**
 * Show the Save As dialog
 * Pre-populates with current filename or default
 */
export function showSaveAsDialog() {
  const dialog = document.getElementById("dialog-saveas");
  document.getElementById("saveas-filename").value = state.filename || "screenshot.png";
  document.getElementById("saveas-width").value = "";
  document.getElementById("saveas-height").value = "";
  dialog.showModal();
}

/**
 * Handle Save As dialog form submission
 */
async function handleSaveAsSubmit(e) {
  e.preventDefault();

  let filename = document.getElementById("saveas-filename").value || "screenshot.png";
  const width = parseInt(document.getElementById("saveas-width").value) || null;
  const height = parseInt(document.getElementById("saveas-height").value) || null;

  // Ensure filename has .png extension (replace other image extensions)
  const imageExtensions = [".jpg", ".jpeg", ".gif", ".bmp", ".webp"];
  const lowerFilename = filename.toLowerCase();

  // Check if it has another image extension and replace it
  let hasImageExtension = false;
  for (const ext of imageExtensions) {
    if (lowerFilename.endsWith(ext)) {
      filename = filename.substring(0, filename.length - ext.length) + ".png";
      hasImageExtension = true;
      break;
    }
  }

  // If no extension at all, add .png
  if (!hasImageExtension && !lowerFilename.endsWith(".png")) {
    filename += ".png";
  }

  // If saving to default directory, auto-increment filename
  if (state.saveToDefault) {
    const saveDir = callbacks.getSaveDirectory();
    if (saveDir) {
      filename = await callbacks.getAutoIncrementedFilename(saveDir, filename);
    }
  }

  const imageData = modules.canvasManager.toDataURL(width, height);
  const saveDir = callbacks.getSaveDirectory();
  const result = await saveImageAs(imageData, filename, saveDir);

  if (result.success) {
    state.filename = result.filename;
    state.hasUnsavedChanges = false;
    callbacks.updateStatusBar();
  }

  document.getElementById("dialog-saveas").close();
}

// ============================================================================
// Unified Save Options Dialog
// ============================================================================

/**
 * Show unified save options dialog with format and .ssce options
 *
 * @param {Object} options - Dialog options
 * @param {string} options.filename - Default filename (without extension)
 * @param {string} options.format - Default format: "png" or "jpg"
 * @param {boolean} options.keepSsce - Default value for "Keep .ssce" checkbox
 * @returns {Promise<Object|null>} Save options if confirmed, null if cancelled
 *   - filename: string (without extension)
 *   - format: "png" | "jpg"
 *   - keepSsce: boolean
 */
export function showSaveOptionsDialog({ filename = "screenshot", format = "png", keepSsce = false } = {}) {
  return new Promise((resolve) => {
    const dialog = document.getElementById("dialog-save-options");
    const filenameInput = document.getElementById("save-options-filename");
    const pngRadio = document.getElementById("save-format-png");
    const jpgRadio = document.getElementById("save-format-jpg");
    const keepSsceCheckbox = document.getElementById("save-options-keep-ssce");

    // Strip extension from filename if present
    let baseName = filename;
    const extMatch = filename.match(/\.(png|jpg|jpeg|ssce)$/i);
    if (extMatch) {
      baseName = filename.substring(0, filename.length - extMatch[0].length);
    }

    // Populate fields
    filenameInput.value = baseName;
    pngRadio.checked = format === "png";
    jpgRadio.checked = format === "jpg";
    keepSsceCheckbox.checked = keepSsce;

    // Store resolve function
    state.saveOptionsResolve = resolve;

    dialog.showModal();

    // Focus filename input
    setTimeout(() => {
      filenameInput.focus();
      filenameInput.select();
    }, 50);
  });
}

/**
 * Handle unified save options dialog submit
 */
async function handleSaveOptionsSubmit(e) {
  e.preventDefault();

  const filenameInput = document.getElementById("save-options-filename");
  const pngRadio = document.getElementById("save-format-png");
  const keepSsceCheckbox = document.getElementById("save-options-keep-ssce");

  const result = {
    filename: filenameInput.value.trim() || "screenshot",
    format: pngRadio.checked ? "png" : "jpg",
    keepSsce: keepSsceCheckbox.checked,
  };

  document.getElementById("dialog-save-options").close();

  // Resolve promise with options
  state.saveOptionsResolve?.(result);
  state.saveOptionsResolve = null;
}
