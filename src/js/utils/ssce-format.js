/**
 * SSCE File Format - Serialization and Deserialization
 *
 * Handles conversion between in-memory layer structure and .ssce JSON file format.
 * .ssce files preserve layers, canvas dimensions, front matter, snapshots,
 * embedded thumbnail, and auto-generated keywords for search.
 *
 * File format version: 1.1
 *
 * v1.1 additions:
 * - thumbnail: Small preview image (~150x150) for file browsers
 * - keywords: Auto-generated search terms from metadata
 */

// Current format version
const FORMAT_VERSION = "1.1";

// Thumbnail settings
const THUMBNAIL_MAX_SIZE = 150;

/**
 * Serialize current session state to .ssce JSON format
 * @param {Object} options
 * @param {Array} options.layers - Layer array from LayerManager
 * @param {Object} options.canvasSize - {width, height} from CanvasManager
 * @param {Object} options.frontMatter - Metadata (title, summary, initials, dates)
 * @param {Array} options.snapshots - Array of snapshot objects
 * @param {HTMLCanvasElement} [options.canvas] - Canvas element for thumbnail generation
 * @param {string} [options.filename] - Filename for keyword extraction
 * @returns {string} JSON string ready to save
 */
export function serialize({ layers, canvasSize, frontMatter = {}, snapshots = [], canvas = null, filename = "" }) {
  const now = new Date().toISOString();

  // Build front matter with defaults
  const fm = {
    title: frontMatter.title || "",
    summary: frontMatter.summary || "",
    initials: frontMatter.initials || "",
    created: frontMatter.created || now,
    modified: now,
  };

  // Serialize layers (convert image elements to base64)
  const serializedLayers = layers.map((layer) => serializeLayer(layer));

  // Generate thumbnail if canvas provided
  const thumbnail = canvas ? generateThumbnail(canvas) : null;

  // Extract keywords for search
  const keywords = extractKeywords({ filename, frontMatter: fm, snapshots });

  // Build .ssce structure
  const ssceData = {
    version: FORMAT_VERSION,
    thumbnail,
    keywords,
    frontMatter: fm,
    canvas: {
      width: canvasSize.width,
      height: canvasSize.height,
    },
    layers: serializedLayers,
    snapshots: snapshots,
  };

  return JSON.stringify(ssceData, null, 2);
}

/**
 * Deserialize .ssce JSON string to session state
 * @param {string} jsonString - Raw .ssce file content
 * @returns {Promise<Object>} Parsed session state with layers, canvasSize, frontMatter, snapshots
 * @throws {Error} If JSON is invalid or format version is unsupported
 */
export async function deserialize(jsonString) {
  let data;

  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    throw new Error(`Invalid .ssce file: ${e.message}`);
  }

  // Version check
  if (!data.version) {
    throw new Error("Invalid .ssce file: missing version field");
  }

  const majorVersion = data.version.split(".")[0];
  if (majorVersion !== "1") {
    throw new Error(`Unsupported .ssce format version: ${data.version}`);
  }

  // Validate required fields
  if (!data.canvas || !data.layers) {
    throw new Error("Invalid .ssce file: missing canvas or layers");
  }

  // Deserialize layers (convert base64 back to image elements)
  const layers = await Promise.all(data.layers.map((layer) => deserializeLayer(layer)));

  return {
    layers,
    canvasSize: {
      width: data.canvas.width,
      height: data.canvas.height,
    },
    frontMatter: data.frontMatter || {},
    snapshots: data.snapshots || [],
  };
}

/**
 * Serialize a single layer
 * @param {Object} layer - Layer object from LayerManager
 * @returns {Object} Serialized layer (JSON-safe)
 */
function serializeLayer(layer) {
  const serialized = {
    type: layer.type,
    id: layer.id,
    data: { ...layer.data },
  };

  // Special handling for image layers
  if (layer.type === "image") {
    // Convert HTMLImageElement to base64 data URL
    serialized.data.src = imageToDataURL(layer.data.image);
    // Remove the HTMLImageElement reference (not serializable)
    delete serialized.data.image;
  }

  return serialized;
}

/**
 * Deserialize a single layer
 * @param {Object} serialized - Serialized layer from .ssce file
 * @returns {Promise<Object>} Layer object ready for LayerManager
 */
async function deserializeLayer(serialized) {
  const layer = {
    type: serialized.type,
    id: serialized.id,
    data: { ...serialized.data },
  };

  // Special handling for image layers
  if (serialized.type === "image") {
    // Convert base64 data URL back to HTMLImageElement
    const img = await dataURLToImage(serialized.data.src);
    layer.data.image = img;
    // Remove the src string (we have the image element now)
    delete layer.data.src;
  }

  return layer;
}

/**
 * Convert HTMLImageElement to base64 data URL
 * @param {HTMLImageElement} img
 * @returns {string} Data URL (e.g., "data:image/png;base64,...")
 */
function imageToDataURL(img) {
  // If the image already has a data URL src, use it directly
  if (img.src && img.src.startsWith("data:")) {
    return img.src;
  }

  // Otherwise, draw to canvas and export
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  return canvas.toDataURL("image/png");
}

/**
 * Convert base64 data URL to HTMLImageElement
 * @param {string} dataURL
 * @returns {Promise<HTMLImageElement>}
 */
function dataURLToImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image from data URL"));

    img.src = dataURL;
  });
}

/**
 * Create a snapshot from the current canvas state
 * @param {Object} options
 * @param {HTMLCanvasElement} options.canvas - The canvas element (or work canvas)
 * @param {Object} options.frontMatter - Snapshot metadata
 * @param {number} options.id - Snapshot ID
 * @returns {Object} Snapshot object ready to add to snapshots array
 */
export function createSnapshot({ canvas, frontMatter, id }) {
  const now = new Date().toISOString();

  return {
    id,
    frontMatter: {
      title: frontMatter.title || `Snapshot ${id}`,
      summary: frontMatter.summary || "",
      created: now,
    },
    image: canvas.toDataURL("image/png"),
  };
}

/**
 * Validate .ssce file structure without fully parsing
 * @param {string} jsonString - Raw file content
 * @returns {Object} { valid: boolean, error?: string, version?: string }
 */
export function validate(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    if (!data.version) {
      return { valid: false, error: "Missing version field" };
    }

    if (!data.canvas || typeof data.canvas.width !== "number") {
      return { valid: false, error: "Missing or invalid canvas dimensions" };
    }

    if (!Array.isArray(data.layers)) {
      return { valid: false, error: "Missing or invalid layers array" };
    }

    return { valid: true, version: data.version };
  } catch (e) {
    return { valid: false, error: `Invalid JSON: ${e.message}` };
  }
}

/**
 * Get file extension for .ssce files
 * @returns {string}
 */
export function getFileExtension() {
  return ".ssce";
}

/**
 * Check if a filename is an .ssce file
 * @param {string} filename
 * @returns {boolean}
 */
export function isSsceFile(filename) {
  return filename.toLowerCase().endsWith(".ssce");
}

// ============================================================================
// Thumbnail and Keyword Generation (v1.1)
// ============================================================================

/**
 * Generate a thumbnail from a canvas element
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {number} [maxSize=THUMBNAIL_MAX_SIZE] - Maximum dimension (width or height)
 * @returns {string} Data URL of thumbnail PNG
 */
export function generateThumbnail(canvas, maxSize = THUMBNAIL_MAX_SIZE) {
  const { width, height } = canvas;

  // Calculate thumbnail dimensions maintaining aspect ratio
  let thumbWidth, thumbHeight;
  if (width > height) {
    thumbWidth = Math.min(width, maxSize);
    thumbHeight = Math.round((height / width) * thumbWidth);
  } else {
    thumbHeight = Math.min(height, maxSize);
    thumbWidth = Math.round((width / height) * thumbHeight);
  }

  // Create thumbnail canvas
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = thumbWidth;
  thumbCanvas.height = thumbHeight;

  const ctx = thumbCanvas.getContext("2d");

  // Use high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw scaled image
  ctx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);

  return thumbCanvas.toDataURL("image/png");
}

/**
 * Extract keywords from file metadata for search indexing
 * @param {Object} options
 * @param {string} options.filename - Filename (without extension)
 * @param {Object} options.frontMatter - Front matter metadata
 * @param {Array} options.snapshots - Array of snapshot objects
 * @returns {string[]} Array of lowercase keywords
 */
export function extractKeywords({ filename = "", frontMatter = {}, snapshots = [] }) {
  const words = new Set();

  // Helper to extract words from a string
  const addWords = (text) => {
    if (!text || typeof text !== "string") return;
    // Split on common separators and filter
    const extracted = text
      .toLowerCase()
      .split(/[\s_\-.,;:!?()[\]{}'"]+/)
      .filter((w) => w.length >= 2 && w.length <= 30);
    extracted.forEach((w) => words.add(w));
  };

  // Extract from filename (remove .ssce extension if present)
  const baseName = filename.replace(/\.ssce$/i, "");
  addWords(baseName);

  // Extract from front matter
  addWords(frontMatter.title);
  addWords(frontMatter.summary);

  // Extract from snapshot titles and summaries
  if (Array.isArray(snapshots)) {
    snapshots.forEach((snap) => {
      if (snap.frontMatter) {
        addWords(snap.frontMatter.title);
        addWords(snap.frontMatter.summary);
      }
    });
  }

  // Add date components from modified date
  if (frontMatter.modified) {
    try {
      const date = new Date(frontMatter.modified);
      if (!isNaN(date.getTime())) {
        words.add(date.getFullYear().toString());
        words.add(date.toLocaleString("en-US", { month: "long" }).toLowerCase());
        words.add(date.toLocaleString("en-US", { month: "short" }).toLowerCase());
      }
    } catch {
      // Ignore date parsing errors
    }
  }

  // Filter out common stop words
  const stopWords = new Set(["the", "and", "for", "with", "this", "that", "from", "are", "was", "were", "been", "have", "has", "had", "not", "but", "what", "all", "when", "who", "which", "their", "there", "would", "could", "should"]);

  return Array.from(words).filter((w) => !stopWords.has(w));
}
