/**
 * SSCE File Operations
 *
 * Client-side functions for .ssce file metadata and session management.
 * Actual file I/O is handled by file-operations.js via tauri-bridge.js
 */

import { state, modules } from "./state.js";
import { isSsceFile } from "./utils/ssce-format.js";

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
  state.sourceFormat = "image";
}
