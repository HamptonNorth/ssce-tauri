/**
 * SSCE - Colour Utilities
 *
 * Handles loading and managing the colour palette from configuration.
 * Palette colours are defined in config/defaults.js and loaded via config.js.
 */

import { getPaletteColours as getConfigPaletteColours } from "./config.js";

/**
 * Load colour configuration from server (.env settings)
 * @returns {Promise<Object>} Configuration object
 */
export async function loadColours() {
  const response = await fetch("/api/config");

  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status}`);
  }

  return await response.json();
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
