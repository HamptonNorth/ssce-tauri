/**
 * Recent Files Management
 * Tracks recently opened/saved .ssce files using SQLite database
 */

const DEFAULT_MAX_COUNT = 20;
const invoke = window.__TAURI__?.core?.invoke;

/**
 * @typedef {Object} RecentFile
 * @property {number} [id] - Database ID
 * @property {string} path - Full file path
 * @property {string} filename - Just the filename
 * @property {string} [thumbnail] - Base64 thumbnail data URL
 * @property {string} [title] - File title from frontMatter
 * @property {string} [summary] - File summary from frontMatter
 * @property {string} [keywords] - Space-separated keywords
 * @property {string} [modified] - ISO timestamp of last modification
 * @property {string} [lastOpened] - ISO timestamp of last open
 * @property {number} snapshotCount - Number of snapshots in the file
 */

/**
 * Get recent files from SQLite database
 * @param {number} [limit] - Maximum number of files to return
 * @returns {Promise<RecentFile[]>}
 */
export async function getRecentFiles(limit = DEFAULT_MAX_COUNT) {
  if (!invoke) {
    console.warn("Tauri invoke not available, returning empty recent files");
    return [];
  }

  try {
    const files = await invoke("db_get_recent_files", { limit });
    // Convert snake_case to camelCase for JS consumption
    return files.map((f) => ({
      id: f.id,
      path: f.path,
      filename: f.filename,
      thumbnail: f.thumbnail,
      title: f.title,
      summary: f.summary,
      keywords: f.keywords,
      modified: f.modified,
      lastOpened: f.last_opened,
      snapshotCount: f.snapshot_count || 0,
    }));
  } catch (err) {
    console.error("Failed to load recent files from database:", err);
    return [];
  }
}

/**
 * Add or update a file in the library database
 * @param {string} path - Full file path
 * @param {Object} metadata - File metadata
 * @param {string} [metadata.thumbnail] - Thumbnail data URL
 * @param {string} [metadata.title] - File title
 * @param {string} [metadata.summary] - File summary
 * @param {string} [metadata.keywords] - Space-separated keywords
 * @param {string} [metadata.modified] - ISO timestamp
 * @param {number} [metadata.snapshotCount] - Number of snapshots
 * @returns {Promise<number>} - Database ID
 */
export async function addRecentFile(path, metadata = {}) {
  if (!path) return;
  if (!invoke) {
    console.warn("Tauri invoke not available");
    return;
  }

  // Only track .ssce files
  if (!path.toLowerCase().endsWith(".ssce")) return;

  const filename = path.split(/[/\\]/).pop();
  const now = new Date().toISOString();

  try {
    const id = await invoke("db_upsert_file", {
      file: {
        path,
        filename,
        thumbnail: metadata.thumbnail || null,
        title: metadata.title || null,
        summary: metadata.summary || null,
        keywords: metadata.keywords || null,
        modified: metadata.modified || now,
        last_opened: now,
        snapshot_count: metadata.snapshotCount || 0,
      },
    });
    return id;
  } catch (err) {
    console.error("Failed to add recent file to database:", err);
  }
}

/**
 * Update just the last_opened timestamp for a file
 * @param {string} path - Full file path
 * @returns {Promise<void>}
 */
export async function updateLastOpened(path) {
  if (!invoke) return;

  try {
    const timestamp = new Date().toISOString();
    await invoke("db_update_last_opened", { path, timestamp });
  } catch (err) {
    console.error("Failed to update last opened:", err);
  }
}

/**
 * Remove a file from the library database
 * @param {string} path - Full file path to remove
 * @returns {Promise<void>}
 */
export async function removeRecentFile(path) {
  if (!invoke) return;

  try {
    await invoke("db_remove_file", { path });
  } catch (err) {
    console.error("Failed to remove recent file:", err);
  }
}

/**
 * Search files in the library using FTS5
 * @param {Object} params - Search parameters
 * @param {string} [params.query] - Search text (matches filename, title, summary, keywords)
 * @param {string} [params.fromDate] - Filter by modified date (ISO string)
 * @param {string} [params.toDate] - Filter by modified date (ISO string)
 * @param {number} [params.limit] - Maximum results (default 50)
 * @returns {Promise<RecentFile[]>}
 */
export async function searchFiles(params = {}) {
  if (!invoke) {
    console.warn("Tauri invoke not available");
    return [];
  }

  try {
    const files = await invoke("db_search_files", {
      params: {
        query: params.query || null,
        from_date: params.fromDate || null,
        to_date: params.toDate || null,
        limit: params.limit || 50,
      },
    });

    return files.map((f) => ({
      id: f.id,
      path: f.path,
      filename: f.filename,
      thumbnail: f.thumbnail,
      title: f.title,
      summary: f.summary,
      keywords: f.keywords,
      modified: f.modified,
      lastOpened: f.last_opened,
      snapshotCount: f.snapshot_count || 0,
    }));
  } catch (err) {
    console.error("Failed to search files:", err);
    return [];
  }
}

/**
 * Rebuild the library database from the library folder
 * Scans all .ssce files and updates/adds them to the database
 * Also removes stale entries for files that no longer exist
 * @param {string} libraryPath - Path to the library folder
 * @returns {Promise<number>} - Number of files indexed
 */
export async function rebuildFromLibrary(libraryPath) {
  if (!invoke) {
    console.warn("Tauri invoke not available");
    return 0;
  }

  try {
    const count = await invoke("db_rebuild_from_library", { libraryPath });
    return count;
  } catch (err) {
    console.error("Failed to rebuild library:", err);
    throw err;
  }
}

// Legacy functions for backwards compatibility during transition
// These can be removed once all code is updated

/**
 * @deprecated Use addRecentFile with metadata object instead
 */
export function updateRecentFileThumbnail(path, thumbnail) {
  console.warn("updateRecentFileThumbnail is deprecated, use addRecentFile");
}

/**
 * @deprecated Use addRecentFile with metadata object instead
 */
export function updateRecentFileMetadata(path, thumbnail, snapshotCount) {
  console.warn("updateRecentFileMetadata is deprecated, use addRecentFile");
}

/**
 * @deprecated Not needed with SQLite storage
 */
export function clearRecentFiles() {
  console.warn("clearRecentFiles is deprecated");
}
