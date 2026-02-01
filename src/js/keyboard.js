/**
 * Keyboard Shortcuts
 * Handles keyboard event listeners and shortcuts
 */

import { state, modules } from "./state.js";

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

/**
 * Initialize keyboard shortcuts
 * @param {Object} handlers - Object containing all handler functions
 */
export function initKeyboardShortcuts(handlers) {
  const { newCanvas, openFile, handleSave, handleSaveAs, handlePrint, handleExportPng, handleBulkExport, handleUndo, handleRedo, handleCopyToClipboard, handlePasteFromClipboard, setActiveTool, loadImageFile, handleSnapshot } = handlers;

  document.addEventListener("keydown", (e) => {
    // Check for modifier keys
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // File operations
    if (ctrl && !shift && e.key === "n") {
      e.preventDefault();
      newCanvas();
    }
    if (ctrl && !shift && e.key === "o") {
      e.preventDefault();
      openFile();
    }
    if (ctrl && !shift && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if (ctrl && shift && e.key === "S") {
      e.preventDefault();
      handleSaveAs();
    }
    if (ctrl && e.key === "p") {
      e.preventDefault();
      handlePrint();
    }

    // Export as PNG (Ctrl+E)
    if (ctrl && !shift && e.key === "e") {
      e.preventDefault();
      handleExportPng();
    }

    // Bulk Export / Backup (Ctrl+Shift+E)
    if (ctrl && shift && e.key === "E") {
      e.preventDefault();
      handleBulkExport();
    }

    // Take snapshot (Alt+S)
    if (e.altKey && !ctrl && !shift && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      handleSnapshot();
    }

    // Undo/Redo (only when not in text input - let native undo/redo work there)
    if (ctrl && !shift && e.key === "z" && !e.target.matches("input, textarea")) {
      e.preventDefault();
      handleUndo();
    }
    if (ctrl && (e.key === "y" || (shift && e.key === "Z")) && !e.target.matches("input, textarea")) {
      e.preventDefault();
      handleRedo();
    }

    // Copy to clipboard (only when not in text input)
    if (ctrl && !shift && e.key === "c" && !e.target.matches("input, textarea")) {
      e.preventDefault();
      handleCopyToClipboard();
    }

    // Paste from clipboard (only when not in text input - let native paste work there)
    if (ctrl && !shift && e.key === "v" && !e.target.matches("input, textarea")) {
      e.preventDefault();
      handlePasteFromClipboard();
    }

    // Arrow keys for moving selected objects (only when not typing in text input)
    if (!e.target.matches("input, textarea")) {
      const isArrowKey = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);

      if (isArrowKey && state.currentTool === "select" && modules.selectTool.hasSelection()) {
        e.preventDefault();

        // Ctrl key = 1px movement, no modifier = 10px movement
        const step = ctrl ? 1 : 10;

        let dx = 0;
        let dy = 0;

        switch (e.key) {
          case "ArrowUp":
            dy = -step;
            break;
          case "ArrowDown":
            dy = step;
            break;
          case "ArrowLeft":
            dx = -step;
            break;
          case "ArrowRight":
            dx = step;
            break;
        }

        modules.selectTool.moveSelectedLayer(dx, dy);
      }

      // Tool shortcuts
      if (e.key === "v" || e.key === "V") setActiveTool("select");
      if (e.key === "a" || e.key === "A") setActiveTool("arrow");
      if (e.key === "l" || e.key === "L") setActiveTool("line");
      if (e.key === "t" || e.key === "T") setActiveTool("text");
      if (e.key === "c" || e.key === "C") setActiveTool("combine");
      if (e.key === "r" || e.key === "R") setActiveTool("crop");
      if (e.key === "u" || e.key === "U") setActiveTool("cut");
      if (e.key === "f" || e.key === "F") setActiveTool("fill");
    }

    // Escape to deselect tool (only if no dialog is open)
    if (e.key === "Escape") {
      const openDialog = document.querySelector("dialog[open]");
      if (!openDialog) {
        setActiveTool("select");
      }
    }
  });

  // Handle paste for combining images (legacy support, not triggered by Ctrl+V due to preventDefault in keyboard handler)
  document.addEventListener("paste", (e) => handlePaste(e, setActiveTool, loadImageFile));
}

/**
 * Handle paste event for combining images (legacy - not from keyboard shortcut)
 * @param {ClipboardEvent} e - Paste event
 * @param {Function} setActiveTool - Callback to set active tool
 * @param {Function} loadImageFile - Callback to load image file
 */
function handlePaste(e, setActiveTool, loadImageFile) {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      e.preventDefault();
      const file = item.getAsFile();

      if (modules.layerManager.hasLayers()) {
        // If we already have an image, go to combine mode
        setActiveTool("combine");
        modules.combineTool.loadSecondImage(file);
      } else {
        // Otherwise just load as primary image
        loadImageFile(file);
      }
      break;
    }
  }
}
