/**
 * SSCE File Operations
 *
 * Client-side functions for saving and loading .ssce files.
 * Works with ssce-format.js for serialization/deserialization.
 */

import { state, modules } from "./state.js";
import { serialize, deserialize, isSsceFile } from "./utils/ssce-format.js";
import { showToast } from "./utils/toast.js";

/**
 * Save current session as .ssce file
 * @param {Object} options
 * @param {string} options.filename - Filename (without path)
 * @param {string} options.directory - Directory path
 * @param {Object} options.frontMatter - Metadata (title, summary, initials)
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
export async function saveSsceFile({ filename, directory, frontMatter = {} }) {
  try {
    const layers = modules.layerManager.getLayers();
    const canvasSize = modules.canvasManager.getSize();

    // Get current session front matter (merge with provided)
    const currentFrontMatter = state.frontMatter || {};
    const mergedFrontMatter = {
      ...currentFrontMatter,
      ...frontMatter,
    };

    // Get snapshots from session state
    const snapshots = state.snapshots || [];

    // Serialize to JSON
    const ssceData = serialize({
      layers,
      canvasSize,
      frontMatter: mergedFrontMatter,
      snapshots,
    });

    // Send to server
    const response = await fetch("/api/save-ssce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ssceData,
        filename,
        directory,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Update state
      state.filename = result.filename;
      state.hasUnsavedChanges = false;
      state.frontMatter = mergedFrontMatter;

      showToast(`Saved: ${result.filename}`);
    }

    return result;
  } catch (err) {
    console.error("Error saving .ssce file:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Load .ssce file and restore session state
 * @param {string} filePath - Full path to .ssce file
 * @param {Function} updateStatusBar - Callback to update status bar
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function loadSsceFile(filePath, updateStatusBar) {
  try {
    // Fetch file from server
    const response = await fetch(`/api/load-ssce?path=${encodeURIComponent(filePath)}`);
    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Deserialize JSON to layers
    const sessionData = await deserialize(result.data);

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
    state.filename = result.filename;
    state.hasUnsavedChanges = false;
    state.sourceFormat = "ssce"; // Mark as loaded from .ssce file

    // Render
    modules.canvasManager.render();

    // Update zoom
    import("./utils/zoom.js").then((zoom) => {
      zoom.recalculateZoom(true);
    });

    // Update View Snapshots button state
    import("./ui/dialogs/index.js").then((dialogs) => {
      dialogs.updateViewSnapshotsButton();
    });

    // Update status bar
    if (updateStatusBar) {
      updateStatusBar();
    }

    showToast(`Loaded: ${result.filename}`);

    return { success: true };
  } catch (err) {
    console.error("Error loading .ssce file:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Check if current file is an .ssce file
 * @returns {boolean}
 */
export function isCurrentFileSsce() {
  return state.filename ? isSsceFile(state.filename) : false;
}

/**
 * Get current front matter
 * @returns {Object}
 */
export function getFrontMatter() {
  return state.frontMatter || {};
}

/**
 * Update front matter in current session
 * @param {Object} frontMatter
 */
export function setFrontMatter(frontMatter) {
  state.frontMatter = {
    ...(state.frontMatter || {}),
    ...frontMatter,
    modified: new Date().toISOString(),
  };
  state.hasUnsavedChanges = true;
}

/**
 * Get snapshots from current session
 * @returns {Array}
 */
export function getSnapshots() {
  return state.snapshots || [];
}

/**
 * Add a snapshot to current session
 * @param {Object} snapshot - Snapshot object from createSnapshot()
 */
export function addSnapshot(snapshot) {
  if (!state.snapshots) {
    state.snapshots = [];
  }
  state.snapshots.push(snapshot);
  state.hasUnsavedChanges = true;
}

/**
 * Clear all snapshots from current session
 */
export function clearSnapshots() {
  state.snapshots = [];
  state.hasUnsavedChanges = true;
}

/**
 * Initialize .ssce session state (call on app start or new file)
 */
export function initSsceSession() {
  state.frontMatter = null;
  state.snapshots = [];
  state.sourceFormat = "image"; // Reset to image format
}
