/**
 * Application State Management
 * Centralized state object and localStorage persistence
 */

// ============================================================================
// Application State
// ============================================================================

export const state = {
  config: null, // Configuration loaded from server
  currentTool: "select", // Active tool: select, arrow, line, text, combine
  currentColour: "#FF0000", // Active colour (default red)
  lastCustomColour: null, // Last custom colour picked (persisted)
  lineStyle: "solid", // Line style: solid, dashed, dotted
  textSize: "md", // Text size: xs, sm, md, lg (also used for shape border width)
  filename: null, // Current filename
  hasUnsavedChanges: false, // Track if changes need saving
  eyedropperActive: false, // Track if eyedropper mode is active
  saveToDefault: false, // Save to default directory instead of original location
  customSaveDirectory: null, // Custom save directory (overrides .env default)
  pendingPasteImage: null, // Image waiting to be positioned and pasted
  pasteMethod: "manual", // Current paste method: manual, relative, click
  pasteClickPosition: null, // Position selected via right-click
  pasteClickListenerActive: false, // Track if waiting for click position
  zoomMode: "100%", // Zoom mode: "100%" or "fit"
  zoomScale: 1.0, // Current zoom scale (1.0 = 100%)
  canZoom: false, // Whether zoom toggle is available (image larger than viewport)
  shapeFillColour: "transparent", // Shape fill colour (default transparent)
  shapeCornerStyle: "square", // Shape corner style: square, rounded
  shapeBorderWidth: 4, // Shape border width in pixels (default md = 4)

  // .ssce file format state
  frontMatter: null, // Current file metadata (title, summary, initials, dates)
  snapshots: [], // Array of snapshot objects for current session
  sourceFormat: "image", // Source format: "image" (PNG/JPG) or "ssce"
  currentSnapshotIndex: -1, // Index of currently restored snapshot (-1 = not at a snapshot)
  savedLoadedState: null, // Saved state of canvas when first undoing to snapshots (for redo back)
};

// ============================================================================
// Module Instances (shared references)
// ============================================================================

export const modules = {
  canvasManager: null,
  layerManager: null,
  selectTool: null,
  arrowTool: null,
  lineTool: null,
  textTool: null,
  combineTool: null,
  stepsTool: null,
  symbolsTool: null,
  shapeTool: null,
  highlightTool: null,
};

// ============================================================================
// LocalStorage Persistence
// ============================================================================

/**
 * Load persisted state from localStorage
 */
export function loadPersistedState() {
  // Load last custom colour
  const savedCustomColour = localStorage.getItem("ssce_lastCustomColour");
  if (savedCustomColour) {
    state.lastCustomColour = savedCustomColour;
  }

  // Load current colour
  const savedCurrentColour = localStorage.getItem("ssce_currentColour");
  if (savedCurrentColour && /^#[0-9A-Fa-f]{6}$/.test(savedCurrentColour)) {
    state.currentColour = savedCurrentColour;
  }

  // Don't restore last tool - always start with "select" (no property card)
  // Tool preferences (colour, line style, etc.) are still restored

  // Load text size
  const savedTextSize = localStorage.getItem("ssce_textSize");
  const validSizes = ["xs", "sm", "md", "lg"];
  if (savedTextSize && validSizes.includes(savedTextSize)) {
    state.textSize = savedTextSize;
  }

  // Load line style
  const savedLineStyle = localStorage.getItem("ssce_lineStyle");
  const validStyles = ["solid", "dashed", "dotted"];
  if (savedLineStyle && validStyles.includes(savedLineStyle)) {
    state.lineStyle = savedLineStyle;
  }

  // Load shape fill colour
  const savedShapeFillColour = localStorage.getItem("ssce_shapeFillColour");
  if (savedShapeFillColour) {
    // Validate: must be "transparent" or valid hex color
    if (savedShapeFillColour === "transparent" || /^#[0-9A-Fa-f]{6}$/.test(savedShapeFillColour)) {
      state.shapeFillColour = savedShapeFillColour;
    }
  }

  // Load shape corner style
  const savedShapeCornerStyle = localStorage.getItem("ssce_shapeCornerStyle");
  const validCornerStyles = ["square", "rounded"];
  if (savedShapeCornerStyle && validCornerStyles.includes(savedShapeCornerStyle)) {
    state.shapeCornerStyle = savedShapeCornerStyle;
  }

  // Load shape border width
  const savedShapeBorderWidth = localStorage.getItem("ssce_shapeBorderWidth");
  if (savedShapeBorderWidth) {
    const width = parseInt(savedShapeBorderWidth, 10);
    if (!isNaN(width) && width >= 1 && width <= 20) {
      state.shapeBorderWidth = width;
    }
  }

  // Load save to default preference
  const savedSaveToDefault = localStorage.getItem("ssce_saveToDefault");
  if (savedSaveToDefault === "true") {
    state.saveToDefault = true;
  }

  // Load custom save directory
  const savedCustomSaveDir = localStorage.getItem("ssce_customSaveDirectory");
  if (savedCustomSaveDir) {
    state.customSaveDirectory = savedCustomSaveDir;
  }
}

/**
 * Save a state value to localStorage
 * @param {string} key - LocalStorage key (without ssce_ prefix)
 * @param {*} value - Value to save
 */
export function persistState(key, value) {
  localStorage.setItem(`ssce_${key}`, value);
}
