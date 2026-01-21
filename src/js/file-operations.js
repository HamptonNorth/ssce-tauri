/**
 * File Operations
 * Handles file loading, saving, and undo/redo
 *
 * Uses native Tauri dialogs when available, falls back to system file input.
 */

import { state, modules, persistState } from "./state.js";
import { showAlertModal, showConfirmModal } from "./ui/dialogs/index.js";
import { showToast } from "./utils/toast.js";
import * as bridge from "./tauri-bridge.js";

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
  state.currentFilePath = null;
  state.hasUnsavedChanges = false;

  // Update status bar
  if (updateStatusBar) {
    updateStatusBar();
  }
}

/**
 * Open file dialog - uses native Tauri dialog or falls back to system file input
 * @param {Function} updateStatusBar - Callback to update status bar
 */
export async function openFile(updateStatusBar) {
  if (bridge.isTauri()) {
    await openFileNative(updateStatusBar);
  } else {
    // Fallback to system file input
    document.getElementById("file-input").click();
  }
}

/**
 * Open file using native Tauri dialog
 * @param {Function} updateStatusBar - Callback to update status bar
 */
async function openFileNative(updateStatusBar) {
  try {
    const filePath = await bridge.showOpenDialog({
      title: "Open Image",
      filters: [
        { name: "All Supported", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ssce"] },
        { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] },
        { name: "SSCE Files", extensions: ["ssce"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (!filePath) return; // User cancelled

    await loadFileFromPath(filePath, updateStatusBar);
  } catch (err) {
    console.error("Open file error:", err);
    await showAlertModal("Open Failed", `Could not open file.\n\nError: ${err.message}`, "error");
  }
}

/**
 * Load a file from a given path (Tauri only)
 * @param {string} filePath - Full path to file
 * @param {Function} updateStatusBar - Callback to update status bar
 */
async function loadFileFromPath(filePath, updateStatusBar) {
  const isSsce = bridge.isSsceFile(filePath);

  try {
    if (isSsce) {
      // Load .ssce file
      const jsonString = await bridge.loadSsce(filePath);
      const { deserialize } = await import("./utils/ssce-format.js");
      const sessionData = await deserialize(jsonString);

      // Clear current state
      modules.layerManager.clear();

      // Restore canvas size
      modules.canvasManager.setSize(sessionData.canvasSize.width, sessionData.canvasSize.height);

      // Restore layers
      modules.layerManager.layers = sessionData.layers;

      // Reset layer ID counter
      const maxId = Math.max(...sessionData.layers.map((l) => l.id), 0);
      modules.layerManager.nextId = maxId + 1;

      // Restore front matter and snapshots
      state.frontMatter = sessionData.frontMatter;
      state.snapshots = sessionData.snapshots;

      // Update file state
      state.filename = bridge.getFilename(filePath);
      state.currentFilePath = filePath;
      state.hasUnsavedChanges = false;
      state.sourceFormat = "ssce";

      // Render
      modules.canvasManager.render();

      // Update zoom
      const zoom = await import("./utils/zoom.js");
      zoom.recalculateZoom(true);

      // Update View Snapshots button
      const dialogs = await import("./ui/dialogs/index.js");
      dialogs.updateViewSnapshotsButton();

      showToast(`Loaded: ${state.filename}`, "success");
    } else {
      // Load image file
      const dataUrl = await bridge.loadImage(filePath);

      const img = new Image();
      img.onload = async () => {
        modules.layerManager.clear();
        modules.layerManager.addImageLayer(img);

        state.filename = bridge.getFilename(filePath);
        state.currentFilePath = filePath;
        state.hasUnsavedChanges = false;
        state.sourceFormat = "image";

        modules.canvasManager.render();

        // Auto-fit and update zoom
        const zoom = await import("./utils/zoom.js");
        zoom.recalculateZoom(true);

        showToast(`Loaded: ${state.filename}`, "success");

        if (updateStatusBar) updateStatusBar();
      };
      img.onerror = async () => {
        await showAlertModal("Invalid Image", `The file could not be loaded as an image.\n\nIt may be corrupted or not a valid image format.`, "error");
      };
      img.src = dataUrl;
    }

    if (updateStatusBar) updateStatusBar();
  } catch (err) {
    console.error("Load file error:", err);
    await showAlertModal("Load Failed", `Could not load the file.\n\nError: ${err.message}`, "error");
  }
}

/**
 * Handle file selection from system file input (fallback for non-Tauri)
 * @param {Event} e - File input change event
 * @param {Function} updateStatusBar - Callback to update status bar
 */
export function handleFileSelect(e, updateStatusBar) {
  const file = e.target.files[0];
  if (!file) return;

  loadImageFile(file, updateStatusBar);
}

/**
 * Load an image file or .ssce file into the canvas (from File object)
 * @param {File} file - File object from file input or drag-drop
 * @param {Function} updateStatusBar - Callback to update status bar
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
      state.currentFilePath = null; // No path for File objects
      state.hasUnsavedChanges = false;
      state.sourceFormat = "image";

      if (updateStatusBar) updateStatusBar();
      modules.canvasManager.render();

      // Auto-fit large images
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
 * Load .ssce file from File object (via system file picker or drag-drop)
 * @param {File} file - File object
 * @param {Function} updateStatusBar - Callback to update status bar
 */
async function loadSsceFromFile(file, updateStatusBar) {
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const jsonString = e.target.result;
      const { deserialize } = await import("./utils/ssce-format.js");

      const sessionData = await deserialize(jsonString);

      // Clear current state
      modules.layerManager.clear();

      // Restore canvas size
      modules.canvasManager.setSize(sessionData.canvasSize.width, sessionData.canvasSize.height);

      // Restore layers
      modules.layerManager.layers = sessionData.layers;

      // Reset layer ID counter
      const maxId = Math.max(...sessionData.layers.map((l) => l.id), 0);
      modules.layerManager.nextId = maxId + 1;

      // Restore front matter and snapshots
      state.frontMatter = sessionData.frontMatter;
      state.snapshots = sessionData.snapshots;

      // Update file state
      state.filename = file.name;
      state.currentFilePath = null;
      state.hasUnsavedChanges = false;
      state.sourceFormat = "ssce";

      // Render
      modules.canvasManager.render();

      // Update zoom
      const zoom = await import("./utils/zoom.js");
      zoom.recalculateZoom(true);

      // Update View Snapshots button
      const dialogs = await import("./ui/dialogs/index.js");
      dialogs.updateViewSnapshotsButton();

      if (updateStatusBar) updateStatusBar();

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
 * Handle save button click
 * @param {Function} handleSaveAs - Function to call for Save As
 * @param {Function} updateStatusBar - Callback to update status bar
 */
export async function handleSave(handleSaveAs, updateStatusBar) {
  if (!modules.layerManager.hasLayers()) {
    await showAlertModal("Nothing to Save", "Open or create an image first before saving.", "info");
    return;
  }

  // If we have a current file path and it's not an ssce file being saved as image, save directly
  if (state.currentFilePath && bridge.isTauri()) {
    try {
      const imageData = modules.canvasManager.toDataURL();
      await bridge.saveImage(state.currentFilePath, imageData);

      state.hasUnsavedChanges = false;
      showToast(`Saved: ${state.filename}`, "success");
      if (updateStatusBar) updateStatusBar();
      return;
    } catch (err) {
      console.error("Save error:", err);
      await showAlertModal("Save Failed", `Could not save the file.\n\nError: ${err.message}`, "error");
      return;
    }
  }

  // Otherwise, do Save As
  handleSaveAs();
}

/**
 * Handle save as - shows native save dialog
 * @param {Function} updateStatusBar - Callback to update status bar
 */
export async function handleSaveAs(updateStatusBar) {
  if (!modules.layerManager.hasLayers()) {
    await showAlertModal("Nothing to Save", "Open or create an image first before saving.", "info");
    return;
  }

  if (bridge.isTauri()) {
    await saveAsNative(updateStatusBar);
  } else {
    // Fallback: download via browser
    const imageData = modules.canvasManager.toDataURL();
    const { downloadImage } = await import("./utils/export.js");
    downloadImage(imageData, state.filename || "screenshot.png");
  }
}

/**
 * Save file using native Tauri dialog
 * @param {Function} updateStatusBar - Callback to update status bar
 */
async function saveAsNative(updateStatusBar) {
  try {
    // Determine default filename
    let defaultName = state.filename || "screenshot.png";
    // Ensure .png extension for images
    if (!defaultName.toLowerCase().endsWith(".png") && !defaultName.toLowerCase().endsWith(".ssce")) {
      defaultName = defaultName.replace(/\.[^/.]+$/, "") + ".png";
    }

    const filePath = await bridge.showSaveDialog({
      title: "Save Image As",
      defaultName,
      filters: [
        { name: "PNG Image", extensions: ["png"] },
        { name: "JPEG Image", extensions: ["jpg", "jpeg"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (!filePath) return; // User cancelled

    // Get image data with appropriate format
    const ext = bridge.getExtension(filePath);
    let imageData;
    if (ext === "jpg" || ext === "jpeg") {
      imageData = modules.canvasManager.toDataURL("image/jpeg", 0.92);
    } else {
      imageData = modules.canvasManager.toDataURL("image/png");
    }

    await bridge.saveImage(filePath, imageData);

    // Update state
    state.filename = bridge.getFilename(filePath);
    state.currentFilePath = filePath;
    state.hasUnsavedChanges = false;

    showToast(`Saved: ${state.filename}`, "success");
    if (updateStatusBar) updateStatusBar();
  } catch (err) {
    console.error("Save as error:", err);
    await showAlertModal("Save Failed", `Could not save the file.\n\nError: ${err.message}`, "error");
  }
}

/**
 * Save as SSCE file using native dialog
 * @param {Object} options - Save options
 * @param {Object} options.frontMatter - Front matter metadata
 * @param {Function} updateStatusBar - Callback to update status bar
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveAsSsce(options = {}, updateStatusBar) {
  if (!modules.layerManager.hasLayers()) {
    await showAlertModal("Nothing to Save", "Open or create an image first before saving.", "info");
    return { success: false, error: "No content" };
  }

  if (!bridge.isTauri()) {
    return { success: false, error: "SSCE save requires Tauri" };
  }

  try {
    // Determine default filename
    let defaultName = state.filename || "screenshot.ssce";
    if (!defaultName.toLowerCase().endsWith(".ssce")) {
      defaultName = defaultName.replace(/\.[^/.]+$/, "") + ".ssce";
    }

    const filePath = await bridge.showSaveDialog({
      title: "Save SSCE File",
      defaultName,
      filters: [
        { name: "SSCE Files", extensions: ["ssce"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (!filePath) return { success: false, error: "Cancelled" };

    // Serialize session data
    const { serialize } = await import("./utils/ssce-format.js");

    const layers = modules.layerManager.getLayers();
    const canvasSize = modules.canvasManager.getSize();
    const frontMatter = {
      ...(state.frontMatter || {}),
      ...(options.frontMatter || {}),
      modified: new Date().toISOString(),
    };
    const snapshots = state.snapshots || [];

    const ssceData = serialize({ layers, canvasSize, frontMatter, snapshots });

    await bridge.saveSsce(filePath, ssceData);

    // Update state
    state.filename = bridge.getFilename(filePath);
    state.currentFilePath = filePath;
    state.hasUnsavedChanges = false;
    state.frontMatter = frontMatter;
    state.sourceFormat = "ssce";

    showToast(`Saved: ${state.filename}`, "success");
    if (updateStatusBar) updateStatusBar();

    return { success: true };
  } catch (err) {
    console.error("Save SSCE error:", err);
    await showAlertModal("Save Failed", `Could not save the file.\n\nError: ${err.message}`, "error");
    return { success: false, error: err.message };
  }
}

/**
 * Handle print button click
 * @param {Function} showPrintDialog - Function to show print dialog
 */
export async function handlePrint(showPrintDialog) {
  if (!modules.layerManager.hasLayers()) {
    await showAlertModal("Nothing to Print", "Open or create an image first before printing.", "info");
    return;
  }
  showPrintDialog();
}

/**
 * Switch save directory to Downloads
 */
export async function useSaveToDownloads() {
  const downloads = await bridge.useDownloadsDir();
  showToast(`Save directory: Downloads`, "info");
  return downloads;
}

/**
 * Get current save directory
 * @returns {Promise<string>}
 */
export async function getSaveDirectory() {
  return bridge.getSaveDirectory();
}

/**
 * Set directory configuration from config
 * @param {Object} config - Config object with defaultOpenDir, defaultSaveDir
 */
export function setDirectoryConfig(config) {
  bridge.setDirectoryConfig({
    defaultOpenDir: config?.defaultOpenDir || config?.defaultPathImageLoad,
    defaultSaveDir: config?.defaultSaveDir || config?.defaultPathImageSave,
  });
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
