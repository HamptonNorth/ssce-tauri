/**
 * Tauri Bridge Module
 *
 * Provides abstraction layer for Tauri APIs.
 * Detects if running in Tauri environment and provides native file dialogs
 * and file system operations via Rust commands.
 *
 * Directory Configuration:
 * - defaultOpenDir: Directory for Open dialog (from config or home)
 * - defaultSaveDir: Directory for Save dialog (from config or home)
 * - lastOpenDir: Last used Open directory (session only)
 * - lastSaveDir: Last used Save directory (session only)
 *
 * NOTE: Uses window.__TAURI__ global API (requires withGlobalTauri: true in tauri.conf.json)
 * Dynamic imports like import('@tauri-apps/api/core') do NOT work without a bundler.
 */

// Track last used directories (session only, not persisted)
let lastOpenDir = null;
let lastSaveDir = null;

// Configuration (set via setDirectoryConfig)
let configOpenDir = null;
let configSaveDir = null;

/**
 * Get the Tauri invoke function from global API
 * @returns {Function|null}
 */
function getInvoke() {
  return window.__TAURI__?.core?.invoke || null;
}

/**
 * Get the Tauri dialog API from global API
 * @returns {Object|null}
 */
function getDialog() {
  return window.__TAURI__?.dialog || null;
}

/**
 * Check if running in Tauri environment
 * @returns {boolean}
 */
export function isTauri() {
  return window.__TAURI__ !== undefined;
}

/**
 * Set directory configuration from config.js
 * Call this during app initialization after loading config
 * @param {Object} config - { defaultOpenDir, defaultSaveDir }
 */
export function setDirectoryConfig(config) {
  configOpenDir = config?.defaultOpenDir || null;
  configSaveDir = config?.defaultSaveDir || null;
}

/**
 * Get the default open directory
 * Priority: lastOpenDir > configOpenDir > home
 * @returns {Promise<string>}
 */
export async function getOpenDirectory() {
  if (lastOpenDir) return lastOpenDir;
  if (configOpenDir) return configOpenDir;
  return await getHomeDir();
}

/**
 * Get the default save directory
 * Priority: lastSaveDir > configSaveDir > home
 * @returns {Promise<string>}
 */
export async function getSaveDirectory() {
  if (lastSaveDir) return lastSaveDir;
  if (configSaveDir) return configSaveDir;
  return await getHomeDir();
}

/**
 * Set last used open directory
 * @param {string} dir
 */
export function setLastOpenDir(dir) {
  lastOpenDir = dir;
}

/**
 * Set last used save directory
 * @param {string} dir
 */
export function setLastSaveDir(dir) {
  lastSaveDir = dir;
}

/**
 * Switch to Downloads directory for save operations
 * @returns {Promise<string>} The downloads directory path
 */
export async function useDownloadsDir() {
  const downloads = await getDownloadsDir();
  lastSaveDir = downloads;
  return downloads;
}

/**
 * Get user's home directory
 * @returns {Promise<string>}
 */
export async function getHomeDir() {
  if (!isTauri()) {
    return "/home";
  }

  try {
    const invoke = getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke("get_home_dir");
  } catch (error) {
    console.error("Failed to get home directory:", error);
    return "/home";
  }
}

/**
 * Get user's downloads directory
 * @returns {Promise<string>}
 */
export async function getDownloadsDir() {
  if (!isTauri()) {
    return "/home/Downloads";
  }

  try {
    const invoke = getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke("get_downloads_dir");
  } catch (error) {
    console.error("Failed to get downloads directory:", error);
    // Fallback to home/Downloads
    const home = await getHomeDir();
    return `${home}/Downloads`;
  }
}

/**
 * Show native file open dialog
 * @param {Object} options
 * @param {string} options.title - Dialog title
 * @param {Array} options.filters - File filters [{name: 'Images', extensions: ['png', 'jpg']}]
 * @param {boolean} options.multiple - Allow multiple selection
 * @param {string} options.defaultPath - Starting directory
 * @returns {Promise<string|string[]|null>} Selected path(s) or null if cancelled
 */
export async function showOpenDialog(options = {}) {
  if (!isTauri()) {
    console.warn("showOpenDialog: Not in Tauri environment");
    return null;
  }

  try {
    const dialog = getDialog();
    if (!dialog || !dialog.open) throw new Error("Tauri dialog API not available");

    const defaultPath = options.defaultPath || (await getOpenDirectory());

    const result = await dialog.open({
      title: options.title || "Open File",
      defaultPath,
      multiple: options.multiple || false,
      directory: false,
      filters: options.filters || [
        { name: "All Supported", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ssce"] },
        { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] },
        { name: "SSCE Files", extensions: ["ssce"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    // Update last used directory if a file was selected
    if (result) {
      const path = Array.isArray(result) ? result[0] : result;
      const dir = getParentDirectory(path);
      if (dir) setLastOpenDir(dir);
    }

    return result;
  } catch (error) {
    console.error("showOpenDialog failed:", error);
    return null;
  }
}

/**
 * Show native file save dialog
 * @param {Object} options
 * @param {string} options.title - Dialog title
 * @param {string} options.defaultPath - Default file path/name
 * @param {Array} options.filters - File filters
 * @returns {Promise<string|null>} Selected path or null if cancelled
 */
export async function showSaveDialog(options = {}) {
  if (!isTauri()) {
    console.warn("showSaveDialog: Not in Tauri environment");
    return null;
  }

  try {
    const dialog = getDialog();
    if (!dialog || !dialog.save) throw new Error("Tauri dialog API not available");

    // Build default path from directory + filename
    let defaultPath = options.defaultPath;
    if (defaultPath && options.defaultName) {
      // Both path and name provided - combine them
      defaultPath = `${defaultPath}/${options.defaultName}`;
    } else if (!defaultPath) {
      const dir = await getSaveDirectory();
      defaultPath = options.defaultName ? `${dir}/${options.defaultName}` : dir;
    }

    const result = await dialog.save({
      title: options.title || "Save File",
      defaultPath,
      filters: options.filters || [
        { name: "PNG Image", extensions: ["png"] },
        { name: "JPEG Image", extensions: ["jpg", "jpeg"] },
        { name: "SSCE File", extensions: ["ssce"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    // Update last used directory if a path was selected
    if (result) {
      const dir = getParentDirectory(result);
      if (dir) setLastSaveDir(dir);
    }

    return result;
  } catch (error) {
    console.error("showSaveDialog failed:", error);
    return null;
  }
}

/**
 * Browse a directory and return file listing
 * @param {string} dir - Directory path
 * @param {string} filter - Filter: "all", "ssce", "images"
 * @returns {Promise<Array<{name: string, is_dir: boolean, size: number}>>}
 */
export async function browseDirectory(dir, filter = "all") {
  if (!isTauri()) {
    console.warn("browseDirectory: Not in Tauri environment");
    return [];
  }

  try {
    const invoke = getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke("browse_directory", { dir, filter });
  } catch (error) {
    console.error("browseDirectory failed:", error);
    throw error;
  }
}

/**
 * Load an image file and return as base64 data URL
 * @param {string} path - File path
 * @returns {Promise<string>} Base64 data URL
 */
export async function loadImage(path) {
  if (!isTauri()) {
    throw new Error("loadImage: Not in Tauri environment");
  }

  try {
    const invoke = getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke("load_image", { path });
  } catch (error) {
    console.error("loadImage failed:", error);
    throw error;
  }
}

/**
 * Save an image to file
 * @param {string} path - File path
 * @param {string} data - Base64 data (with or without data URL prefix)
 * @returns {Promise<void>}
 */
export async function saveImage(path, data) {
  if (!isTauri()) {
    throw new Error("saveImage: Not in Tauri environment");
  }

  try {
    const invoke = getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    await invoke("save_image", { path, data });
  } catch (error) {
    console.error("saveImage failed:", error);
    throw error;
  }
}

/**
 * Load a .ssce file and return JSON content
 * @param {string} path - File path
 * @returns {Promise<string>} JSON string
 */
export async function loadSsce(path) {
  if (!isTauri()) {
    throw new Error("loadSsce: Not in Tauri environment");
  }

  try {
    const invoke = getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke("load_ssce", { path });
  } catch (error) {
    console.error("loadSsce failed:", error);
    throw error;
  }
}

/**
 * Save a .ssce file
 * @param {string} path - File path
 * @param {string} data - JSON string
 * @returns {Promise<void>}
 */
export async function saveSsce(path, data) {
  if (!isTauri()) {
    throw new Error("saveSsce: Not in Tauri environment");
  }

  try {
    const invoke = getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    await invoke("save_ssce", { path, data });
  } catch (error) {
    console.error("saveSsce failed:", error);
    throw error;
  }
}

/**
 * Check if a file exists
 * @param {string} path - File path
 * @returns {Promise<boolean>}
 */
export async function fileExists(path) {
  if (!isTauri()) {
    return false;
  }

  try {
    const invoke = getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke("file_exists", { path });
  } catch (error) {
    console.error("fileExists failed:", error);
    return false;
  }
}

/**
 * Get parent directory from a file path
 * @param {string} path - File path
 * @returns {string|null} Parent directory or null
 */
export function getParentDirectory(path) {
  if (!path) return null;
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) {
    const lastBackslash = path.lastIndexOf("\\");
    if (lastBackslash === -1) return null;
    return path.substring(0, lastBackslash);
  }
  return path.substring(0, lastSlash);
}

/**
 * Get filename from a path
 * @param {string} path - File path
 * @returns {string} Filename
 */
export function getFilename(path) {
  if (!path) return "";
  const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return lastSlash === -1 ? path : path.substring(lastSlash + 1);
}

/**
 * Get file extension from a path
 * @param {string} path - File path
 * @returns {string} Extension (lowercase, without dot) or empty string
 */
export function getExtension(path) {
  const filename = getFilename(path);
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return "";
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Check if a path is an image file
 * @param {string} path - File path
 * @returns {boolean}
 */
export function isImageFile(path) {
  const ext = getExtension(path);
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext);
}

/**
 * Check if a path is an SSCE file
 * @param {string} path - File path
 * @returns {boolean}
 */
export function isSsceFile(path) {
  return getExtension(path) === "ssce";
}

// ============================================================================
// Autosave Functions
// ============================================================================

/**
 * Save autosave data to a temp file
 * @param {string} data - JSON string data to save
 * @param {string} filename - Filename for the autosave file
 * @param {string} directory - Directory to save the file in
 * @returns {Promise<string>} Full path of saved file
 */
export async function saveAutosave(data, filename, directory) {
  if (!isTauri()) {
    throw new Error("saveAutosave: Not in Tauri environment");
  }

  try {
    const invoke = getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke("save_autosave", { data, filename, directory });
  } catch (error) {
    console.error("saveAutosave failed:", error);
    throw error;
  }
}

/**
 * Delete an autosave temp file
 * @param {string} path - Full path to the autosave file
 * @returns {Promise<void>}
 */
export async function deleteAutosave(path) {
  if (!isTauri()) {
    throw new Error("deleteAutosave: Not in Tauri environment");
  }

  try {
    const invoke = getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    await invoke("delete_autosave", { path });
  } catch (error) {
    console.error("deleteAutosave failed:", error);
    throw error;
  }
}

/**
 * List autosave files in a directory
 * @param {string} directory - Directory to list files from
 * @returns {Promise<Array<{name: string, path: string, mtime: number}>>}
 */
export async function listAutosaveFiles(directory) {
  if (!isTauri()) {
    return [];
  }

  try {
    const invoke = getInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke("list_autosave_files", { directory });
  } catch (error) {
    console.error("listAutosaveFiles failed:", error);
    return [];
  }
}

// ============================================================================
// Clipboard Functions
// ============================================================================

/**
 * Get the Tauri clipboard API from global API
 * @returns {Object|null}
 */
function getClipboard() {
  return window.__TAURI__?.clipboardManager || null;
}

/**
 * Write image to clipboard using canvas PNG data
 * @param {HTMLCanvasElement} canvas - Canvas element to copy
 * @returns {Promise<boolean>} True if successful
 */
export async function writeImageToClipboard(canvas) {
  if (!isTauri()) {
    return false;
  }

  try {
    const clipboard = getClipboard();
    if (!clipboard || !clipboard.writeImage) {
      console.error("Clipboard writeImage not available");
      return false;
    }

    // Convert canvas to PNG blob
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      console.error("Failed to create PNG blob");
      return false;
    }

    // Write PNG bytes to clipboard as Uint8Array
    const arrayBuffer = await blob.arrayBuffer();
    await clipboard.writeImage(new Uint8Array(arrayBuffer));
    return true;
  } catch (error) {
    console.error("writeImageToClipboard failed:", error);
    return false;
  }
}

/**
 * Read image from clipboard
 * @returns {Promise<string|null>} Data URL of the image or null if no image
 */
export async function readImageFromClipboard() {
  if (!isTauri()) {
    return null;
  }

  try {
    const clipboard = getClipboard();
    if (!clipboard) throw new Error("Clipboard API not available");

    // readImage returns a Tauri Image object
    const image = await clipboard.readImage();

    if (!image) {
      return null;
    }

    // Get RGBA data and dimensions from the Image object
    // Note: size() returns { width, height }, not separate methods
    const rgba = await image.rgba();
    const { width, height } = await image.size();

    if (!rgba || rgba.length === 0 || !width || !height) {
      return null;
    }

    // Convert RGBA data to canvas, then to data URL
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL("image/png");
  } catch (error) {
    // No image in clipboard is not an error, just return null
    console.log("readImageFromClipboard: No image in clipboard or error:", error.message);
    return null;
  }
}

/**
 * Check if clipboard has an image
 * @returns {Promise<boolean>}
 */
export async function hasClipboardImage() {
  if (!isTauri()) {
    return false;
  }

  try {
    const imageData = await readImageFromClipboard();
    return imageData !== null;
  } catch {
    return false;
  }
}
