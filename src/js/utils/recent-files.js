/**
 * Recent Files Management
 * Tracks recently opened/saved .ssce files in localStorage
 */

const STORAGE_KEY = "ssce_recent_files";
const DEFAULT_MAX_COUNT = 20;

/**
 * @typedef {Object} RecentFile
 * @property {string} path - Full file path
 * @property {string} filename - Just the filename
 * @property {number} lastOpened - Unix timestamp of last open/save
 * @property {string} [thumbnail] - Base64 thumbnail data URL (cached from file)
 * @property {number} [snapshotCount] - Number of snapshots in the file
 */

/**
 * Get the max recent files count from config
 * @returns {number}
 */
function getMaxCount() {
  // Try to get from loaded config (sync access to already-loaded config)
  try {
    // Config is loaded at app startup, access via global if needed
    // For now, just use the default since config loading is async
    return DEFAULT_MAX_COUNT;
  } catch {
    return DEFAULT_MAX_COUNT;
  }
}

/**
 * Get all recent files from localStorage
 * @returns {RecentFile[]}
 */
export function getRecentFiles() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (err) {
    console.error("Failed to load recent files:", err);
    return [];
  }
}

/**
 * Add or update a file in the recent files list
 * @param {string} path - Full file path
 * @param {string} [thumbnail] - Optional thumbnail data URL
 */
export function addRecentFile(path, thumbnail = null, snapshotCount = 0) {
  if (!path) return;

  // Only track .ssce files
  if (!path.toLowerCase().endsWith(".ssce")) return;

  const files = getRecentFiles();
  const filename = path.split(/[/\\]/).pop();
  const now = Date.now();

  // Remove existing entries with same path OR same filename
  // This prevents duplicates when saving to library (same filename, different path)
  const filtered = files.filter((f) => f.path !== path && f.filename !== filename);

  // Add new entry at the beginning
  const newEntry = {
    path,
    filename,
    lastOpened: now,
    snapshotCount: snapshotCount || 0,
  };

  // Only include thumbnail if provided (we'll load it on-demand otherwise)
  if (thumbnail) {
    newEntry.thumbnail = thumbnail;
  }

  filtered.unshift(newEntry);

  // Trim to max count
  const maxCount = getMaxCount();
  const trimmed = filtered.slice(0, maxCount);

  // Save back to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error("Failed to save recent files:", err);
  }
}

/**
 * Remove a file from the recent files list
 * @param {string} path - Full file path to remove
 */
export function removeRecentFile(path) {
  const files = getRecentFiles();
  const filtered = files.filter((f) => f.path !== path);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to save recent files:", err);
  }
}

/**
 * Clear all recent files
 */
export function clearRecentFiles() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear recent files:", err);
  }
}

/**
 * Update the thumbnail for a recent file
 * @param {string} path - File path
 * @param {string} thumbnail - Thumbnail data URL
 */
export function updateRecentFileThumbnail(path, thumbnail) {
  const files = getRecentFiles();
  const file = files.find((f) => f.path === path);

  if (file) {
    file.thumbnail = thumbnail;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch (err) {
      console.error("Failed to update recent file thumbnail:", err);
    }
  }
}

/**
 * Update metadata (thumbnail and snapshot count) for a recent file
 * @param {string} path - File path
 * @param {string} [thumbnail] - Thumbnail data URL
 * @param {number} [snapshotCount] - Number of snapshots
 */
export function updateRecentFileMetadata(path, thumbnail, snapshotCount) {
  const files = getRecentFiles();
  const file = files.find((f) => f.path === path);

  if (file) {
    if (thumbnail !== undefined && thumbnail !== null) {
      file.thumbnail = thumbnail;
    }
    if (snapshotCount !== undefined) {
      file.snapshotCount = snapshotCount;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch (err) {
      console.error("Failed to update recent file metadata:", err);
    }
  }
}
