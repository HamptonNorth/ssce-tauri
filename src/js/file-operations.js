/**
 * File Operations
 * Handles file loading, saving, and undo/redo
 *
 * Uses native Tauri dialogs when available, falls back to system file input.
 */

import { state, modules, persistState } from "./state.js";
import { showAlertModal, showConfirmModal } from "./ui/dialogs/index.js";
import { showToast } from "./utils/toast.js";
import { showSpinner, hideSpinner } from "./utils/spinner.js";
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

  // Clear canvas immediately and show spinner
  modules.layerManager.clear();
  modules.canvasManager.render();
  showSpinner();

  try {
    if (isSsce) {
      // Load .ssce file
      const jsonString = await bridge.loadSsce(filePath);
      const { deserialize } = await import("./utils/ssce-format.js");
      const sessionData = await deserialize(jsonString);

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
      state.currentSnapshotIndex = -1; // Reset snapshot navigation
      state.savedLoadedState = null; // Clear any saved loaded state

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

      // Update undo button state (may be enabled due to snapshots)
      updateUndoRedoButtons();

      hideSpinner();
      showToast(`Loaded: ${state.filename}`, "success");
      if (updateStatusBar) updateStatusBar();
    } else {
      // Load image file
      const dataUrl = await bridge.loadImage(filePath);

      // Pre-load the zoom module before entering the callback
      const zoom = await import("./utils/zoom.js");

      // Wait for image to load
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Invalid image format"));
        image.src = dataUrl;
      });

      // Now process the loaded image synchronously
      modules.layerManager.addImageLayer(img);

      state.filename = bridge.getFilename(filePath);
      state.currentFilePath = filePath;
      state.hasUnsavedChanges = false;
      state.sourceFormat = "image";

      modules.canvasManager.render();

      // Auto-fit and update zoom
      zoom.recalculateZoom(true);

      hideSpinner();
      showToast(`Loaded: ${state.filename}`, "success");
      if (updateStatusBar) updateStatusBar();
    }
  } catch (err) {
    hideSpinner();
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
      state.currentSnapshotIndex = -1; // Reset snapshot navigation
      state.savedLoadedState = null; // Clear any saved loaded state

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

      // Update undo button state (may be enabled due to snapshots)
      updateUndoRedoButtons();

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
    showSpinner();
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
    } finally {
      hideSpinner();
    }
  }

  // Otherwise, do Save As
  handleSaveAs();
}

/**
 * Handle save as - shows native save dialog
 * @param {Function} updateStatusBar - Callback to update status bar
 * @param {string} [suggestedFilename] - Optional filename to use as default in save dialog
 * @returns {Promise<boolean>} True if saved successfully, false if cancelled or error
 */
export async function handleSaveAs(updateStatusBar, suggestedFilename) {
  if (!modules.layerManager.hasLayers()) {
    await showAlertModal("Nothing to Save", "Open or create an image first before saving.", "info");
    return false;
  }

  if (bridge.isTauri()) {
    return await saveAsNative(updateStatusBar, suggestedFilename);
  } else {
    // Fallback: download via browser
    const imageData = modules.canvasManager.toDataURL();
    const { downloadImage } = await import("./utils/export.js");
    downloadImage(imageData, suggestedFilename || state.filename || "screenshot.png");
    return true;
  }
}

/**
 * Save file using native Tauri dialog
 * @param {Function} updateStatusBar - Callback to update status bar
 * @param {string} [suggestedFilename] - Optional filename to use as default in save dialog
 * @returns {Promise<boolean>} True if saved successfully, false if cancelled or error
 */
async function saveAsNative(updateStatusBar, suggestedFilename) {
  // Determine default filename - use suggested name, fall back to state, then default
  let defaultName = suggestedFilename || state.filename || "screenshot.png";
  const lowerName = defaultName.toLowerCase();

  // Only add .png extension if file doesn't have a supported image extension
  const supportedExtensions = [".png", ".jpg", ".jpeg", ".ssce"];
  const hasValidExtension = supportedExtensions.some((ext) => lowerName.endsWith(ext));

  if (!hasValidExtension) {
    // Remove any existing extension and add .png
    defaultName = defaultName.replace(/\.[^/.]+$/, "") + ".png";
  }

  // Order filters so the matching format is first (selected by default)
  const isJpeg = lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg");
  const filters = isJpeg
    ? [
        { name: "JPEG Image", extensions: ["jpg", "jpeg"] },
        { name: "PNG Image", extensions: ["png"] },
        { name: "All Files", extensions: ["*"] },
      ]
    : [
        { name: "PNG Image", extensions: ["png"] },
        { name: "JPEG Image", extensions: ["jpg", "jpeg"] },
        { name: "All Files", extensions: ["*"] },
      ];

  const filePath = await bridge.showSaveDialog({
    title: "Save Image As",
    defaultName,
    filters,
  });

  if (!filePath) return false; // User cancelled

  showSpinner();
  try {
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
    return true;
  } catch (err) {
    console.error("Save as error:", err);
    await showAlertModal("Save Failed", `Could not save the file.\n\nError: ${err.message}`, "error");
    return false;
  } finally {
    hideSpinner();
  }
}

/**
 * Save as SSCE file using native dialog
 * @param {Object} options - Save options
 * @param {Object} options.frontMatter - Front matter metadata
 * @param {string} [options.suggestedFilename] - Optional filename to use as default in save dialog
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
    // Determine default filename - use suggested name, fall back to state, then default
    let defaultName = options.suggestedFilename || state.filename || "screenshot.ssce";
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

    showSpinner();
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
  } finally {
    hideSpinner();
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

export async function handleUndo() {
  // If undo stack has items, do normal undo
  if (modules.layerManager.canUndo()) {
    modules.layerManager.undo();
    modules.canvasManager.render();
    updateUndoRedoButtons();
    state.hasUnsavedChanges = true;
    // Reset snapshot index when doing normal undo (we're back in edit mode)
    state.currentSnapshotIndex = -1;
    return;
  }

  // If no undo but snapshots exist, step backwards through snapshots
  if (state.snapshots && state.snapshots.length > 0) {
    // Determine which snapshot to restore
    let targetIndex;
    if (state.currentSnapshotIndex === -1) {
      // First time hitting undo after edits - save current state so we can redo back
      state.savedLoadedState = {
        layers: [...modules.layerManager.layers],
        canvasSize: modules.canvasManager.getSize(),
      };
      targetIndex = state.snapshots.length - 1;
    } else if (state.currentSnapshotIndex > 0) {
      // Already at a snapshot - go to previous one
      targetIndex = state.currentSnapshotIndex - 1;
    } else {
      // Already at first snapshot - can't go further back
      return;
    }

    await restoreSnapshot(state.snapshots[targetIndex], targetIndex);
  }
}

export async function handleRedo() {
  // If redo stack has items, do normal redo
  if (modules.layerManager.canRedo()) {
    modules.layerManager.redo();
    modules.canvasManager.render();
    updateUndoRedoButtons();
    state.hasUnsavedChanges = true;
    // Reset snapshot index when doing normal redo
    state.currentSnapshotIndex = -1;
    return;
  }

  // If at a snapshot, step forward through snapshots or back to saved loaded state
  if (state.currentSnapshotIndex >= 0 && state.snapshots && state.snapshots.length > 0) {
    if (state.currentSnapshotIndex < state.snapshots.length - 1) {
      // Go to next snapshot
      const targetIndex = state.currentSnapshotIndex + 1;
      await restoreSnapshot(state.snapshots[targetIndex], targetIndex);
    } else if (state.savedLoadedState) {
      // At last snapshot and we have a saved loaded state - restore it
      await restoreLoadedState();
    }
  }
}

/**
 * Restore canvas to the saved loaded state (for redo past last snapshot)
 */
async function restoreLoadedState() {
  if (!state.savedLoadedState) return;

  const { layers, canvasSize } = state.savedLoadedState;

  // Clear and restore
  modules.layerManager.layers = [];
  modules.layerManager.undoStack = [];
  modules.layerManager.redoStack = [];
  modules.canvasManager.setSize(canvasSize.width, canvasSize.height);
  modules.layerManager.layers = [...layers];
  modules.canvasManager.render();

  // Reset snapshot navigation state
  state.currentSnapshotIndex = -1;
  state.savedLoadedState = null;
  state.hasUnsavedChanges = true;
  updateUndoRedoButtons();

  // Recalculate zoom
  import("./utils/zoom.js").then((zoom) => {
    zoom.recalculateZoom(true);
  });

  showToast("Restored to loaded state", "success");
}

/**
 * Restore canvas to a snapshot state
 * @param {Object} snapshot - Snapshot object with image data
 * @param {number} snapshotIndex - Index of this snapshot in state.snapshots
 */
async function restoreSnapshot(snapshot, snapshotIndex) {
  if (!snapshot || !snapshot.image) {
    console.error("Invalid snapshot for restore");
    return;
  }

  // Load the snapshot image
  const img = new Image();
  img.onload = () => {
    // Clear current layers (this clears undo/redo stacks too)
    modules.layerManager.clear();

    // Set canvas size to match snapshot
    modules.canvasManager.setSize(img.width, img.height);

    // Add snapshot as base image layer (using addLayerDirect to avoid undo state)
    modules.layerManager.addLayerDirect(img, 0, 0);

    // Render
    modules.canvasManager.render();

    // Update snapshot index
    state.currentSnapshotIndex = snapshotIndex;

    // Update state
    state.hasUnsavedChanges = true;
    updateUndoRedoButtons();

    // Recalculate zoom
    import("./utils/zoom.js").then((zoom) => {
      zoom.recalculateZoom(true);
    });

    showToast(`Restored to: ${snapshot.frontMatter?.title || "Snapshot"}`, "success");
  };

  img.onerror = () => {
    showAlertModal("Restore Failed", "Could not load the snapshot image.", "error");
  };

  img.src = snapshot.image;
}

export function updateUndoRedoButtons() {
  // Undo is available if:
  // - undo stack has items, OR
  // - snapshots exist and we're not already at the first snapshot
  const hasUndoStack = modules.layerManager.canUndo();
  const canUndoToSnapshot = state.snapshots && state.snapshots.length > 0 && (state.currentSnapshotIndex === -1 || state.currentSnapshotIndex > 0);

  // Redo is available if:
  // - redo stack has items, OR
  // - we're at a snapshot and there are more snapshots ahead, OR
  // - we're at the last snapshot and there's a saved loaded state to return to
  const hasRedoStack = modules.layerManager.canRedo();
  const canRedoToSnapshot = state.currentSnapshotIndex >= 0 && state.snapshots && state.currentSnapshotIndex < state.snapshots.length - 1;
  const canRedoToLoadedState = state.currentSnapshotIndex === state.snapshots?.length - 1 && state.savedLoadedState !== null;

  document.getElementById("btn-undo").disabled = !(hasUndoStack || canUndoToSnapshot);
  document.getElementById("btn-redo").disabled = !(hasRedoStack || canRedoToSnapshot || canRedoToLoadedState);
}
