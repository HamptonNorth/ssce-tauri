/**
 * Dialog Management - Main Entry Point
 *
 * This module re-exports all dialog functions and provides a unified
 * initialization function. Import from this file to access any dialog.
 *
 * Architecture:
 * - alert-confirm.js: Generic alert, confirm, and choice modals
 * - file-dialogs.js: Save As, Browse, Save Options
 * - image-dialogs.js: Resize, Print, Paste Position, Combine
 * - colour-dialogs.js: Colour Picker, Shape Fill Picker
 * - ssce-dialogs.js: Front Matter, View Snapshots
 * - tool-dialogs.js: Steps Reset, Symbol Picker
 *
 * @example
 * import { initDialogs, showAlertModal, showConfirmModal } from './ui/dialogs/index.js';
 *
 * // Initialize all dialogs on app startup
 * initDialogs({ updateStatusBar, updateUndoRedoButtons, ... });
 *
 * // Use individual dialogs
 * await showAlertModal("Error", "Something went wrong", "error");
 * const confirmed = await showConfirmModal("Delete?", "Are you sure?");
 */

// ============================================================================
// Re-exports from individual dialog modules
// ============================================================================

// Alert/Confirm/Choice modals
export { showAlertModal, showConfirmModal, showChoiceModal } from "./alert-confirm.js";

// File dialogs
export { showSaveOptionsDialog } from "./file-dialogs.js";
import { initFileDialogs } from "./file-dialogs.js";

// Image operation dialogs
export { showResizeDialog, showPrintDialog, showPastePositionDialog, showCombineDialog } from "./image-dialogs.js";
import { initImageDialogs } from "./image-dialogs.js";

// Colour picker dialogs
export { showColourPickerDialog, showShapeFillPickerDialog } from "./colour-dialogs.js";
import { initColourDialogs } from "./colour-dialogs.js";

// SSCE file format dialogs
export { showFrontMatterDialog, showViewSnapshotsDialog, updateViewSnapshotsButton } from "./ssce-dialogs.js";
import { initSsceDialogs } from "./ssce-dialogs.js";

// Tool dialogs
export { showStepsResetDialog, showSymbolPickerDialog } from "./tool-dialogs.js";
import { initToolDialogs } from "./tool-dialogs.js";

// ============================================================================
// Unified Initialization
// ============================================================================

/**
 * Initialize all dialog event handlers
 *
 * Call this once during application startup. It sets up event listeners
 * for all dialog elements and stores callbacks for cross-dialog communication.
 *
 * @param {Object} options - Callback functions for dialog interactions
 * @param {Function} options.updateStatusBar - Update the status bar display
 * @param {Function} options.updateUndoRedoButtons - Update undo/redo button states
 * @param {Function} options.getSaveDirectory - Get current save directory path
 * @param {Function} options.getAutoIncrementedFilename - Get auto-incremented filename
 *
 * @example
 * initDialogs({
 *   updateStatusBar: () => { ... },
 *   updateUndoRedoButtons: () => { ... },
 *   getSaveDirectory: () => state.customSaveDirectory || '',
 *   getAutoIncrementedFilename: async (dir, name) => { ... }
 * });
 */
export function initDialogs(options) {
  const { updateStatusBar, updateUndoRedoButtons, getSaveDirectory, getAutoIncrementedFilename } = options;

  // Initialize each dialog category with relevant callbacks
  initFileDialogs({
    updateStatusBar,
    getSaveDirectory,
    getAutoIncrementedFilename,
  });

  initImageDialogs({
    updateStatusBar,
    updateUndoRedoButtons,
  });

  initColourDialogs();

  initSsceDialogs();

  initToolDialogs();
}

// ============================================================================
// Legacy export for backward compatibility
// ============================================================================

// Some modules may still import initResizeAddMode directly
// This is now handled internally by initImageDialogs
