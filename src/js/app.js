/**
 * SSCE - Simple Screen Capture Editor
 * Main Application Entry Point
 *
 * This file initializes the application, loads configuration,
 * and coordinates between the various modules.
 */

import { CanvasManager } from "./canvas.js";
import { LayerManager } from "./layers.js";
import { SelectTool } from "./tools/select.js";
import { ArrowTool } from "./tools/arrow.js";
import { LineTool } from "./tools/line.js";
import { TextTool } from "./tools/text.js";
import { CombineTool } from "./tools/combine.js";
import { StepsTool } from "./tools/steps.js";
import { SymbolsTool } from "./tools/symbols.js";
import { ShapeTool } from "./tools/shape.js";
import { HighlightTool } from "./tools/highlight.js";
import { CropTool } from "./tools/crop.js";
import { CutTool } from "./tools/cut.js";
import { FadeEdgesTool } from "./tools/fade-edges.js";
import { BordersTool } from "./tools/borders.js";
import { loadColours } from "./utils/colours.js";
import { printImage } from "./utils/export.js";
import { showToast } from "./utils/toast.js";
import { state, modules, loadPersistedState, persistState } from "./state.js";
import { initDragAndDrop } from "./drag-drop.js";
import { initColourPalette, selectColour } from "./ui/colour-palette.js";
import { handlePasteFromClipboard, handleCopyToClipboard, handleFlatten, handleFlattenSelected } from "./clipboard.js";
import { initToolbarEvents, setActiveTool } from "./ui/toolbar.js";
import { initKeyboardShortcuts } from "./keyboard.js";
import { newCanvas, openFile, handleFileSelect, loadImageFile, handleSave, handleSaveAs, handlePrint, handleUndo, handleRedo, updateUndoRedoButtons, setDirectoryConfig, saveAsSsce } from "./file-operations.js";
import * as tauriBridge from "./tauri-bridge.js";
import { initDialogs, showResizeDialog, showPrintDialog, showCombineDialog, showColourPickerDialog, showPastePositionDialog, showFrontMatterDialog, showViewSnapshotsDialog, updateViewSnapshotsButton, showBulkExportDialog } from "./ui/dialogs/index.js";
import { initRecentFilesDialog, showRecentFilesDialog } from "./ui/dialogs/recent-files-dialog.js";
import { initSearchLibraryDialog, showSearchLibraryDialog } from "./ui/dialogs/search-library-dialog.js";
import { toggleZoom, updateZoomButton, recalculateZoom, initZoomResizeListener } from "./utils/zoom.js";
import { initCanvasBackgroundToggle } from "./utils/canvas-background.js";
import { loadConfig, getToolConfig, getSymbols, getSteps, updateWindowTitleWithBuildTime, getAutosaveConfig } from "./utils/config.js";
import { initPropertyCards, showPropertyCard } from "./ui/property-cards/index.js";
import { initSsceSession, addSnapshot, getSnapshots, setFrontMatter } from "./ssce-file-ops.js";
import { serialize, deserialize, createSnapshot } from "./utils/ssce-format.js";
import { initAutoSave, cleanupTempFile, checkForRecovery, loadRecoveryFile, deleteRecoveryFile } from "./utils/autosave.js";
import { downloadSnapshotHtml } from "./utils/snapshot-viewer-export.js";

// ============================================================================
// Application State (imported from state.js)
// ============================================================================
// State and modules are imported from state.js

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the application
 * Called when DOM is ready
 */
async function init() {
  console.log("SSCE: Initializing...");

  // Load tool defaults configuration first (from defaults.json and .env)
  try {
    await loadConfig();
    console.log("SSCE: Tool defaults loaded");
    // Update window title with build timestamp if enabled in .env
    updateWindowTitleWithBuildTime();
  } catch (err) {
    console.error("SSCE: Failed to load tool defaults, using fallbacks", err);
  }

  // Build state.config from loaded defaults and env config
  try {
    state.config = await loadColours();
    console.log("SSCE: Configuration loaded", state.config);
  } catch (err) {
    console.error("SSCE: Failed to load configuration", err);
    // Use defaults
    state.config = {
      colours: {
        white: "#FFFFFF",
        black: "#000000",
        red: "#FF0000",
        green: "#00FF00",
        blue: "#0000FF",
        yellow: "#FFFF00",
      },
    };
  }

  // Configure directory defaults for Tauri file dialogs
  setDirectoryConfig({
    defaultOpenDir: state.config?.defaultOpenDir || state.config?.defaultPathImageLoad,
    defaultSaveDir: state.config?.defaultSaveDir || state.config?.defaultPathImageSave,
  });

  // Load persisted state from localStorage
  loadPersistedState();

  // Initialize colour palette UI
  initColourPalette(showColourPickerDialog);

  // Update color indicator to match current color (persisted or default)
  selectColour(state.currentColour);

  // Initialize canvas and layer managers
  const canvas = document.getElementById("main-canvas");
  modules.canvasManager = new CanvasManager(canvas);
  modules.layerManager = new LayerManager(modules.canvasManager);

  // Initialize tools
  modules.selectTool = new SelectTool(modules.canvasManager, modules.layerManager);
  modules.arrowTool = new ArrowTool(
    modules.canvasManager,
    modules.layerManager,
    () => state.currentColour,
    () => state.lineStyle,
    () => getToolConfig("arrow", "lineWidth") || 2,
  );
  modules.lineTool = new LineTool(
    modules.canvasManager,
    modules.layerManager,
    () => state.currentColour,
    () => state.lineStyle,
    () => getToolConfig("line", "lineWidth") || 3,
  );
  modules.textTool = new TextTool(
    modules.canvasManager,
    modules.layerManager,
    () => state.currentColour,
    () => state.textSize,
  );
  modules.combineTool = new CombineTool(modules.canvasManager, modules.layerManager);
  modules.stepsTool = new StepsTool(modules.canvasManager, modules.layerManager);
  modules.symbolsTool = new SymbolsTool(modules.canvasManager, modules.layerManager);

  // Helper function to get border width for shapes
  const getBorderWidth = () => state.shapeBorderWidth;

  modules.shapeTool = new ShapeTool(
    modules.canvasManager,
    modules.layerManager,
    () => state.currentColour,
    () => state.lineStyle,
    getBorderWidth,
    () => state.shapeFillColour,
    () => state.shapeCornerStyle,
  );

  modules.highlightTool = new HighlightTool(modules.canvasManager, modules.layerManager);

  modules.cropTool = new CropTool(modules.canvasManager, modules.layerManager, notifyLayerChange);
  modules.cutTool = new CutTool(modules.canvasManager, modules.layerManager, notifyLayerChange);
  modules.fadeEdgesTool = new FadeEdgesTool(modules.canvasManager, modules.layerManager, notifyLayerChange);
  modules.bordersTool = new BordersTool(modules.canvasManager, modules.layerManager, notifyLayerChange);

  // Set symbols array from defaults on the symbols tool
  modules.symbolsTool.setSymbols(getSymbols());

  // Set steps array from defaults on the steps tool
  modules.stepsTool.setSteps(getSteps());

  // Set up event listeners
  initToolbarEvents({
    newCanvas: () => newCanvas(updateStatusBar),
    openFile: () => openFile(updateStatusBar),
    handleSave: () => handleSaveWithSsceSupport(updateStatusBar),
    handleSaveAs: () => handleSaveAsWithSsceSupport(updateStatusBar),
    handlePrint: () => handlePrint(showPrintDialog),
    handlePasteFromClipboard: () => handlePasteFromClipboard((file) => loadImageFile(file, updateStatusBar), showPastePositionDialog),
    handleCopyToClipboard,
    handleFlatten: () => handleFlatten(updateStatusBar, updateUndoRedoButtons),
    handleFlattenSelected: () => handleFlattenSelected(updateStatusBar, updateUndoRedoButtons),
    toggleSaveToDefault,
    handleUndo,
    handleRedo,
    showResizeDialog,
    handleFileSelect,
    handleExportPng: () => handleExportPngCommand(updateStatusBar),
    handleExportJpg: () => handleExportJpgCommand(updateStatusBar),
    handleRecentFiles: () => showRecentFilesDialog(),
    handleSearchLibrary: () => showSearchLibraryDialog(),
    handleEditFileInfo,
    handleSnapshot: () => handleSnapshot(false),
    handleViewSnapshots: () => showViewSnapshotsDialog(),
    handleExportSnapshotViewer: () => handleExportSnapshotViewer(),
    handleBulkExport: () => showBulkExportDialog(),
  });
  initKeyboardShortcuts({
    newCanvas: () => newCanvas(updateStatusBar),
    openFile: () => openFile(updateStatusBar),
    handleSave: () => handleSaveWithSsceSupport(updateStatusBar),
    handleSaveAs: () => handleSaveAsWithSsceSupport(updateStatusBar),
    handlePrint: () => handlePrint(showPrintDialog),
    handleExportPng: () => handleExportPngCommand(updateStatusBar),
    handleUndo,
    handleRedo,
    handleCopyToClipboard,
    handlePasteFromClipboard: () => handlePasteFromClipboard((file) => loadImageFile(file, updateStatusBar), showPastePositionDialog),
    setActiveTool,
    loadImageFile: (file) => loadImageFile(file, updateStatusBar),
    handleSnapshot: () => handleSnapshot(false),
    handleBulkExport: () => showBulkExportDialog(),
  });
  initDragAndDrop((file) => loadImageFile(file, updateStatusBar), setActiveTool);
  initZoomResizeListener();
  initCanvasBackgroundToggle();
  initPropertyCards();
  initDialogs({
    updateStatusBar,
    updateUndoRedoButtons,
    getSaveDirectory,
    getAutoIncrementedFilename,
  });

  // Initialize recent files and search library dialogs with file open handler
  const fileOpenHandler = async (filePath) => {
    const { loadFileFromPath } = await import("./file-operations.js");
    await loadFileFromPath(filePath, updateStatusBar);
  };
  initRecentFilesDialog(fileOpenHandler);
  initSearchLibraryDialog(fileOpenHandler);

  // Check for recovery files from previous crash
  await checkRecoveryFiles();

  // Initialize auto-save system from config
  const autosaveConfig = getAutosaveConfig();
  initAutoSave({
    enabled: autosaveConfig.enabled,
    inactivitySeconds: autosaveConfig.inactivitySeconds,
    tempDirectory: autosaveConfig.tempDirectory,
  });

  // Set snapshot reminder threshold from config (0 to disable)
  snapshotReminderThreshold = autosaveConfig.snapshotReminderEdits ?? 20;

  // Update UI state
  updateUndoRedoButtons();
  updateStatusBar();

  // Restore persisted tool (activate after tools are initialized)
  if (state.currentTool) {
    setActiveTool(state.currentTool);
  }

  // Update text size UI to match persisted state
  document.getElementById("current-text-size").textContent = state.textSize.toUpperCase();

  // Update line style UI to match persisted state
  const lineStyleText = state.lineStyle.charAt(0).toUpperCase() + state.lineStyle.slice(1);
  document.getElementById("current-line-style").textContent = lineStyleText;

  // Update shape fill indicator UI to match persisted state
  const shapeFillIndicator = document.getElementById("shape-fill-indicator");
  if (shapeFillIndicator) {
    if (state.shapeFillColour === "transparent") {
      shapeFillIndicator.style.background = "transparent";
      shapeFillIndicator.style.backgroundImage = "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)";
      shapeFillIndicator.style.backgroundSize = "8px 8px";
      shapeFillIndicator.style.backgroundPosition = "0 0, 0 4px, 4px -4px, -4px 0px";
    } else {
      shapeFillIndicator.style.background = state.shapeFillColour;
      shapeFillIndicator.style.backgroundImage = "none";
    }
  }

  // Update corner style UI to match persisted state
  const cornerStyleIndicator = document.getElementById("current-corner-style");
  if (cornerStyleIndicator) {
    cornerStyleIndicator.textContent = state.shapeCornerStyle.charAt(0).toUpperCase() + state.shapeCornerStyle.slice(1);
  }

  // Initialize save to default toggle UI
  if (state.saveToDefault) {
    document.getElementById("save-to-default-check").classList.remove("hidden");
    document.getElementById("save-to-default-uncheck").classList.add("hidden");
  }

  // Initialize zoom toggle button
  const zoomBtn = document.getElementById("zoom-toggle-btn");
  if (zoomBtn) {
    zoomBtn.addEventListener("click", () => {
      toggleZoom(updateZoomButton);
    });
  }

  // Set up beforeunload handler for unsaved changes warning
  window.addEventListener("beforeunload", handleBeforeUnload);

  // Clamp window size to 90% of monitor (window-state plugin may have restored an oversized window)
  await tauriBridge.clampWindowSize();

  console.log("SSCE: Initialization complete");
}

/**
 * Handle beforeunload event to warn about unsaved changes
 */
function handleBeforeUnload(e) {
  if (state.hasUnsavedChanges) {
    // Modern browsers ignore the custom message and show their own
    // But we still need to set returnValue for the warning to show
    e.preventDefault();
    e.returnValue = "";
    return "";
  }

  // Clean up temp files on normal exit
  cleanupTempFile();
}

/**
 * Check for recovery files from previous crash and offer to restore
 */
async function checkRecoveryFiles() {
  try {
    const recoveryFiles = await checkForRecovery();

    if (recoveryFiles.length === 0) {
      return;
    }

    console.log("SSCE: Recovery from existing temp file triggered");

    // Show recovery dialog
    const { showChoiceModal } = await import("./ui/dialogs/index.js");

    // Get most recent file
    const mostRecent = recoveryFiles[0];
    const fileDate = new Date(mostRecent.mtime).toLocaleString();

    const choice = await showChoiceModal("Recover Previous Session?", `Found auto-saved work from ${fileDate}.\n\nWould you like to recover this session?`, [
      { label: "Recover", value: "recover", primary: true },
      { label: "Discard", value: "discard", danger: true },
    ]);

    if (choice === "recover") {
      // Load the recovery file
      const result = await loadRecoveryFile(mostRecent.path);

      if (result.success) {
        // Deserialize and restore
        const sessionData = await deserialize(result.data);

        // Clear current state
        modules.layerManager.clear();

        // Restore canvas size
        modules.canvasManager.setSize(sessionData.canvasSize.width, sessionData.canvasSize.height);

        // Restore layers
        modules.layerManager.layers = sessionData.layers;
        const maxId = Math.max(...sessionData.layers.map((l) => l.id), 0);
        modules.layerManager.nextId = maxId + 1;

        // Save initial undo state so user can undo back to recovered state
        modules.layerManager.saveUndoState();

        // Restore front matter and snapshots
        state.frontMatter = sessionData.frontMatter;
        state.snapshots = sessionData.snapshots;
        state.hasUnsavedChanges = true;
        // Extract original filename from autosave format: autosave_${sessionId}_${baseName}.ssce
        // Session IDs are 13-char alphanumeric strings (e.g., mkmkxbxy1kowd)
        // Strip autosave prefix and any accumulated session IDs
        state.filename = mostRecent.name
          .replace(/^autosave_/, "") // Strip autosave_ prefix
          .replace(/^([a-z0-9]{13}_)+/gi, ""); // Strip all 13-char session ID prefixes

        // Render
        modules.canvasManager.render();

        // Update zoom
        import("./utils/zoom.js").then((zoom) => {
          zoom.recalculateZoom(true);
        });

        // Update status bar and undo/redo buttons
        updateStatusBar();
        updateUndoRedoButtons();

        showToast("Session recovered", "success");
      }

      // Delete the recovery file after successful load
      await deleteRecoveryFile(mostRecent.path);
    } else if (choice === "discard") {
      // Delete all recovery files
      for (const file of recoveryFiles) {
        await deleteRecoveryFile(file.path);
      }
      showToast("Recovery files discarded", "info");
    }
    // If null (cancelled), leave files for next time
  } catch (err) {
    console.error("SSCE: Recovery check failed:", err);
  }
}

// Edit counter for snapshot reminder
let editsSinceLastSnapshot = 0;
let snapshotReminderThreshold = 20; // Default, updated from config
let snapshotReminderShowing = false;

// Make this available to other modules
export function notifyLayerChange({ skipEditCount = false } = {}) {
  updateUndoRedoButtons();
  state.hasUnsavedChanges = true;

  // Track edits and prompt for snapshot periodically
  // Move operations pass skipEditCount=true to avoid inflating the counter
  if (!skipEditCount) editsSinceLastSnapshot++;

  if (snapshotReminderThreshold > 0 && editsSinceLastSnapshot >= snapshotReminderThreshold && !snapshotReminderShowing) {
    promptSnapshotReminder();
  }
}

/**
 * Reset edit counter (call after snapshot is taken)
 */
export function resetEditCounter() {
  editsSinceLastSnapshot = 0;
}

/**
 * Prompt user to take a snapshot for recovery purposes
 */
async function promptSnapshotReminder() {
  snapshotReminderShowing = true;

  const { showChoiceModal } = await import("./ui/dialogs/index.js");

  const choice = await showChoiceModal("Take a Snapshot?", `You've made ${editsSinceLastSnapshot} edits since your last snapshot.\n\nSnapshots provide recovery points you can return to if needed.`, [
    { label: "Take Snapshot", value: "snapshot", primary: true },
    { label: "Remind Later", value: "later" },
    { label: "Don't Remind", value: "dismiss" },
  ]);

  snapshotReminderShowing = false;

  if (choice === "snapshot") {
    // Trigger the snapshot flow (isAutoPrompted = true)
    await handleSnapshot(true);
  } else if (choice === "later") {
    // Reset counter to half threshold - will remind again after half more edits
    editsSinceLastSnapshot = Math.floor(snapshotReminderThreshold / 2);
  } else if (choice === "dismiss") {
    // User doesn't want reminders this session - set very high
    editsSinceLastSnapshot = -1000;
  }
}

// ============================================================================
// Status Bar
// ============================================================================

function updateStatusBar() {
  const filenameEl = document.getElementById("filename");
  const dimensionsEl = document.getElementById("dimensions");
  const saveDirIndicator = document.getElementById("save-directory-indicator");
  const saveDirPath = document.getElementById("save-directory-path");

  // Show filename with unsaved indicator
  let displayName = state.filename || "No image loaded";
  if (state.hasUnsavedChanges) {
    displayName = "• " + displayName;
  }
  filenameEl.textContent = displayName;

  // Show/hide save directory indicator
  if (state.saveToDefault) {
    const saveDir = state.customSaveDirectory || state.config?.defaultPathImageSave || "Not set";
    saveDirPath.textContent = saveDir;
    saveDirIndicator.classList.remove("hidden");
  } else {
    saveDirIndicator.classList.add("hidden");
  }

  // Show dimensions
  const size = modules.canvasManager.getSize();
  dimensionsEl.textContent = `${size.width} × ${size.height}`;
}

function toggleSaveToDefault() {
  state.saveToDefault = !state.saveToDefault;
  persistState("saveToDefault", state.saveToDefault.toString());

  // Update checkmark visibility
  const checkMark = document.getElementById("save-to-default-check");
  const uncheckMark = document.getElementById("save-to-default-uncheck");

  if (state.saveToDefault) {
    checkMark.classList.remove("hidden");
    uncheckMark.classList.add("hidden");
  } else {
    checkMark.classList.add("hidden");
    uncheckMark.classList.remove("hidden");
  }

  updateStatusBar();
}

/**
 * Handle save - always saves as .ssce format
 * Uses file-operations.js handleSave which saves directly to .ssce
 */
async function handleSaveWithSsceSupport(updateStatusBar) {
  // handleSave now always saves as .ssce
  await handleSave(null, updateStatusBar);
}

/**
 * Handle save as - always saves as .ssce format
 * Uses file-operations.js handleSaveAs which saves as new .ssce file
 */
async function handleSaveAsWithSsceSupport(updateStatusBar) {
  // handleSaveAs now always saves as .ssce
  await handleSaveAs(updateStatusBar);
}

/**
 * Export current canvas as PNG (flattened, no layers)
 */
async function handleExportPngCommand(updateStatusBar) {
  const { exportAsPng } = await import("./file-operations.js");
  await exportAsPng(updateStatusBar);
}

/**
 * Export current canvas as JPG (flattened, no layers)
 */
async function handleExportJpgCommand(updateStatusBar) {
  const { exportAsJpg } = await import("./file-operations.js");
  await exportAsJpg(updateStatusBar);
}

/**
 * Export snapshots as standalone HTML viewer
 */
async function handleExportSnapshotViewer() {
  const snapshots = getSnapshots();
  if (snapshots.length === 0) {
    const { showAlertModal } = await import("./ui/dialogs/index.js");
    await showAlertModal("No Snapshots", "Create at least one snapshot before exporting.", "info");
    return;
  }

  const filename = downloadSnapshotHtml();
  showToast(`Exported: ${filename}`, "success");
}

/**
 * Edit file info (front matter) for current session
 */
async function handleEditFileInfo() {
  const frontMatter = await showFrontMatterDialog({
    title: "Edit File Info",
    frontMatter: state.frontMatter || {},
    mode: "edit",
  });

  if (frontMatter) {
    state.frontMatter = frontMatter;
    state.hasUnsavedChanges = true;
    showToast("File info updated", "success");
  }
}

/**
 * Capture a snapshot of the current canvas state
 * Flattens all layers to an image without modifying the layer stack
 * @param {boolean} isAutoPrompted - True if triggered by edit count reminder
 */
async function handleSnapshot(isAutoPrompted = false) {
  if (!modules.layerManager.hasLayers()) {
    const { showAlertModal } = await import("./ui/dialogs/index.js");
    await showAlertModal("Nothing to Snapshot", "Open or create an image first before taking a snapshot.", "info");
    return;
  }

  // Get next snapshot ID
  const currentSnapshots = getSnapshots();
  const nextId = currentSnapshots.length + 1;

  // Default title depends on how snapshot was triggered
  const defaultTitle = isAutoPrompted ? `Auto snapshot step ${nextId}` : `Step ${nextId}`;

  // Show front matter dialog for snapshot metadata
  const frontMatter = await showFrontMatterDialog({
    title: "Snapshot Details",
    frontMatter: {
      title: defaultTitle,
      summary: "",
    },
    mode: "save",
  });

  if (!frontMatter) {
    return; // User cancelled
  }

  // Reset edit counter (snapshot taken, either manually or via prompt)
  editsSinceLastSnapshot = 0;

  // Show spinner while creating snapshot (can be slow for large images)
  const { showSpinner, hideSpinner } = await import("./utils/spinner.js");
  showSpinner();

  try {
    // Flatten canvas to image without modifying layers
    // Get the current canvas element (already has all layers rendered)
    const canvas = modules.canvasManager.getCanvas();

    // Create the snapshot object
    const snapshot = createSnapshot({
      canvas,
      frontMatter,
      id: nextId,
    });

    // Add to session state
    addSnapshot(snapshot);

    // Update View Snapshots button state (now enabled)
    updateViewSnapshotsButton();

    showToast(`Snapshot ${nextId} captured`, "success");

    // Update status bar to show unsaved changes
    if (updateStatusBar) {
      updateStatusBar();
    }
  } finally {
    hideSpinner();
  }
}

/**
 * Get the save directory based on current settings
 */
function getSaveDirectory() {
  if (state.saveToDefault) {
    return state.customSaveDirectory || state.config?.defaultPathImageSave || "";
  }
  return ""; // Empty means use original location
}

/**
 * Generate auto-incremented filename if file exists
 * @param {string} directory - Directory path
 * @param {string} filename - Original filename
 * @returns {Promise<string>} - Available filename
 */
async function getAutoIncrementedFilename(directory, filename) {
  // If no directory or not in Tauri, just return filename
  if (!directory || !tauriBridge.isTauri()) {
    return filename;
  }

  // Extract name and extension
  const lastDot = filename.lastIndexOf(".");
  const name = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.substring(lastDot) : "";

  let counter = 1;
  let testFilename = filename;

  // Check if file exists and increment
  // Limit to 100 attempts to prevent infinite loop
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const fullPath = `${directory}/${testFilename}`;
      const exists = await tauriBridge.fileExists(fullPath);

      if (!exists) {
        return testFilename;
      }

      testFilename = `${name}_${counter}${ext}`;
      counter++;
    } catch (err) {
      // On error, just return the original filename
      console.error("SSCE: File exists check failed:", err.message);
      return filename;
    }
  }

  // If we hit max attempts, just return with counter
  return testFilename;
}

// ============================================================================
// Start Application
// ============================================================================

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
