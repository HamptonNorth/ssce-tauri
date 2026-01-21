/**
 * Auto-save Module
 * Automatically saves session state to temp .ssce file after inactivity
 * Provides crash recovery by detecting orphaned temp files on startup
 *
 * Each session uses a single temp file (overwritten on each auto-save).
 * The temp file is deleted on normal save/exit.
 * Orphaned temp files from crashes are detected on next startup.
 */

import { state, modules } from "../state.js";
import { serialize } from "./ssce-format.js";
import { showToast } from "./toast.js";

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG = {
  enabled: true,
  inactivitySeconds: 30,
  tempDirectory: ".ssce-temp",
};

let config = { ...DEFAULT_CONFIG };
let lastActivityTime = Date.now();
let autoSaveTimer = null;
let currentTempFile = null;
let sessionId = null; // Unique ID for this session's temp file

// ============================================================================
// Activity Tracking
// ============================================================================

/**
 * Record user activity (call on any user interaction)
 */
export function recordActivity() {
  lastActivityTime = Date.now();
}

/**
 * Check if enough time has passed since last activity
 */
function isInactive() {
  const elapsed = (Date.now() - lastActivityTime) / 1000;
  return elapsed >= config.inactivitySeconds;
}

// ============================================================================
// Auto-save Logic
// ============================================================================

/**
 * Initialize auto-save system
 * @param {Object} options - Configuration options
 */
export function initAutoSave(options = {}) {
  config = { ...DEFAULT_CONFIG, ...options };

  if (!config.enabled) {
    console.log("SSCE AutoSave: Disabled by config");
    return;
  }

  // Generate a unique session ID for this session's temp file
  sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  // Start the auto-save check timer
  startAutoSaveTimer();

  // Track activity on user interactions
  setupActivityTracking();

  console.log(`SSCE AutoSave: Initialized (${config.inactivitySeconds}s inactivity threshold, session: ${sessionId})`);
}

/**
 * Start the periodic auto-save check
 */
function startAutoSaveTimer() {
  // Check every 10 seconds if we should auto-save
  const checkInterval = 10000;

  autoSaveTimer = setInterval(async () => {
    if (!config.enabled) return;
    if (!state.hasUnsavedChanges) return;
    if (!modules.layerManager?.hasLayers()) return;

    if (isInactive()) {
      await performAutoSave();
    }
  }, checkInterval);
}

/**
 * Stop the auto-save timer
 */
export function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

/**
 * Set up activity tracking on user interactions
 */
function setupActivityTracking() {
  // Track mouse and keyboard activity
  const events = ["mousedown", "mousemove", "keydown", "wheel", "touchstart"];

  events.forEach((event) => {
    document.addEventListener(event, recordActivity, { passive: true });
  });
}

/**
 * Perform the auto-save operation
 * Uses a single temp file per session (overwrites on each save)
 */
async function performAutoSave() {
  try {
    const layers = modules.layerManager.getLayers();
    const canvasSize = modules.canvasManager.getSize();

    // Generate temp filename using session ID (same file each time)
    const baseName = state.filename ? state.filename.replace(/\.[^.]+$/, "") : "untitled";
    const tempFilename = `autosave_${sessionId}_${baseName}.ssce`;

    // Serialize current state
    const ssceData = serialize({
      layers,
      canvasSize,
      frontMatter: state.frontMatter || {},
      snapshots: state.snapshots || [],
    });

    // Save to server (overwrites existing file with same name)
    const response = await fetch("/api/autosave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ssceData,
        filename: tempFilename,
        directory: config.tempDirectory,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Track current temp file for cleanup
      currentTempFile = result.path;
      console.log(`SSCE AutoSave: Saved to ${result.path}`);
    } else {
      console.error("SSCE AutoSave: Failed -", result.error);
    }
  } catch (err) {
    console.error("SSCE AutoSave: Error -", err.message);
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Delete the current temp file (call on successful save or clean exit)
 */
export async function cleanupTempFile() {
  if (!currentTempFile) return;

  try {
    await fetch("/api/autosave-cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: currentTempFile }),
    });
    currentTempFile = null;
    console.log("SSCE AutoSave: Cleaned up temp file");
  } catch (err) {
    console.error("SSCE AutoSave: Cleanup failed -", err.message);
  }
}

// ============================================================================
// Recovery
// ============================================================================

/**
 * Check for orphaned temp files from previous sessions
 * @returns {Promise<Array>} List of recoverable files
 */
export async function checkForRecovery() {
  try {
    const response = await fetch(`/api/autosave-list?directory=${encodeURIComponent(config.tempDirectory)}`);
    const result = await response.json();

    if (result.success && result.files.length > 0) {
      return result.files;
    }
  } catch (err) {
    console.error("SSCE AutoSave: Recovery check failed -", err.message);
  }

  return [];
}

/**
 * Load a recovery file
 * @param {string} filePath - Path to the temp file
 */
export async function loadRecoveryFile(filePath) {
  try {
    const response = await fetch(`/api/load-ssce?path=${encodeURIComponent(filePath)}`);
    const result = await response.json();

    if (result.success) {
      return result;
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    console.error("SSCE AutoSave: Recovery load failed -", err.message);
    throw err;
  }
}

/**
 * Delete a recovery file (after user dismisses it)
 * @param {string} filePath - Path to delete
 */
export async function deleteRecoveryFile(filePath) {
  try {
    await fetch("/api/autosave-cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath }),
    });
  } catch (err) {
    console.error("SSCE AutoSave: Delete recovery file failed -", err.message);
  }
}
