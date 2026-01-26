/**
 * SSCE - Colour Utilities
 *
 * Handles loading and managing the colour palette from configuration.
 * Palette colours are defined in config/defaults.json and loaded via config.js.
 */

import { getPaletteColours as getConfigPaletteColours, getDefaults } from "./config.js";

/**
 * Load colour and path configuration
 * All settings now come from defaults.json
 * @returns {Promise<Object>} Configuration object
 */
export async function loadColours() {
  // Get defaults (all settings from defaults.json)
  const defaults = getDefaults();

  // Build config object matching expected structure
  return {
    // Paths from defaults.json (~ expanded by Rust backend)
    defaultPathImageLoad: defaults?.paths?.defaultImageLoad || null,
    defaultPathImageSave: defaults?.paths?.defaultImageSave || null,

    // Colours from defaults
    colours: defaults?.palette?.colours || {
      white: "#FFFFFF",
      black: "#000000",
      red: "#FF0000",
      green: "#00FF00",
      blue: "#0000FF",
      yellow: "#FFFF00",
    },

    // Resize limits from defaults
    resizeWarningTrigger: defaults?.resizeLimits?.warning || 1920,
    resizeErrorTrigger: defaults?.resizeLimits?.error || 3840,

    // Border defaults
    borderWidth: defaults?.tools?.borders?.width || 4,
    borderColour: defaults?.tools?.borders?.colour || "#333333",
    borderRadius: defaults?.tools?.borders?.radius || 0,
  };
}

/**
 * Get palette colours array for UI rendering
 * Delegates to config.js which loads from config/defaults.js
 * @returns {Array<string>} Array of hex colour strings
 */
export function getPaletteColours() {
  return getConfigPaletteColours();
}

/**
 * Validate a hex colour string
 * @param {string} hex
 * @returns {boolean}
 */
export function isValidHex(hex) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

/**
 * Get a contrasting colour (for text on coloured backgrounds)
 * @param {string} hex - Background colour
 * @returns {string} '#000000' or '#FFFFFF'
 */
export function getContrastColour(hex) {
  // Remove # if present
  const colour = hex.replace("#", "");

  // Parse RGB
  let r, g, b;
  if (colour.length === 3) {
    r = parseInt(colour[0] + colour[0], 16);
    g = parseInt(colour[1] + colour[1], 16);
    b = parseInt(colour[2] + colour[2], 16);
  } else {
    r = parseInt(colour.substring(0, 2), 16);
    g = parseInt(colour.substring(2, 4), 16);
    b = parseInt(colour.substring(4, 6), 16);
  }

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
