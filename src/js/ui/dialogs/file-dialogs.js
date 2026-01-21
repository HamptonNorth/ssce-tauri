/**
 * File-Related Dialogs
 *
 * Dialogs for file operations: Save Options.
 * Native file open/save dialogs are handled by tauri-bridge.js
 *
 * Exports:
 * - initFileDialogs(callbacks) - Initialize file dialog event handlers
 * - showSaveOptionsDialog(options) - Show unified save options dialog
 */

import { state, modules } from "../../state.js";

// Callback storage for file dialogs
let callbacks = {
  updateStatusBar: null,
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize file dialog event handlers
 *
 * @param {Object} options - Callback functions
 * @param {Function} options.updateStatusBar - Update the status bar display
 */
export function initFileDialogs(options) {
  callbacks = { ...callbacks, ...options };

  // Unified Save Options dialog
  const saveOptionsDialog = document.getElementById("dialog-save-options");
  if (saveOptionsDialog) {
    document.getElementById("save-options-cancel")?.addEventListener("click", () => {
      saveOptionsDialog.close();
      state.saveOptionsResolve?.(null);
    });
    saveOptionsDialog.addEventListener("submit", handleSaveOptionsSubmit);
    saveOptionsDialog.addEventListener("cancel", () => {
      state.saveOptionsResolve?.(null);
    });
  }
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
