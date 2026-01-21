/**
 * Configuration Management
 *
 * Loads defaults from config/defaults.js and merges with localStorage overrides.
 * All tool options are defined in defaults.js; property cards expose user-editable subset.
 *
 * Future enhancements (arrowhead styles, double-ended arrows, etc.) should:
 * 1. Add defaults to config/defaults.js (with documentation comments)
 * 2. Add getter/setter here if needed
 * 3. Add UI controls to relevant property card
 */

const STORAGE_PREFIX = "ssce_tool_";

let defaults = null;
let loaded = false;

/**
 * Load defaults from server (config/defaults.js)
 * Call this once during app initialization
 * @returns {Promise<Object>} The loaded config
 */
export async function loadConfig() {
  if (loaded) return defaults;

  try {
    const response = await fetch("/api/defaults");
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    defaults = await response.json();
    loaded = true;
    return defaults;
  } catch (error) {
    console.error("Failed to load defaults.js, using fallback:", error);
    defaults = getFallbackDefaults();
    loaded = true;
    return defaults;
  }
}

/**
 * Get a tool configuration value
 * Checks localStorage first, falls back to defaults.js
 * @param {string} tool - Tool name (arrow, line, text, etc.)
 * @param {string} property - Property name
 * @returns {*} The config value
 */
export function getToolConfig(tool, property) {
  const storageKey = `${STORAGE_PREFIX}${tool}_${property}`;
  const stored = localStorage.getItem(storageKey);

  if (stored !== null) {
    try {
      return JSON.parse(stored);
    } catch {
      // If JSON parse fails, return raw string (for simple values)
      return stored;
    }
  }

  // Fall back to defaults
  return defaults?.tools?.[tool]?.[property] ?? null;
}

/**
 * Set a tool configuration value
 * Saves to localStorage (overrides defaults.js)
 * @param {string} tool - Tool name
 * @param {string} property - Property name
 * @param {*} value - Value to store
 */
export function setToolConfig(tool, property, value) {
  const storageKey = `${STORAGE_PREFIX}${tool}_${property}`;
  localStorage.setItem(storageKey, JSON.stringify(value));
}

/**
 * Reset a tool property to default (removes localStorage override)
 * @param {string} tool - Tool name
 * @param {string} property - Property name (optional, if omitted resets all for tool)
 */
export function resetToolConfig(tool, property = null) {
  if (property) {
    const storageKey = `${STORAGE_PREFIX}${tool}_${property}`;
    localStorage.removeItem(storageKey);
  } else {
    // Reset all properties for this tool
    const toolDefaults = defaults?.tools?.[tool];
    if (toolDefaults) {
      Object.keys(toolDefaults).forEach((key) => {
        localStorage.removeItem(`${STORAGE_PREFIX}${tool}_${key}`);
      });
    }
  }
}

/**
 * Get the full defaults object
 * Useful for accessing non-tool config (palette, presets, etc.)
 * @returns {Object} The full defaults object
 */
export function getDefaults() {
  return defaults;
}

/**
 * Get palette colours from config
 * @returns {string[]} Array of hex colour strings
 */
export function getPaletteColours() {
  return defaults?.palette?.colours ?? ["#FF0000", "#00FF00", "#0000FF"];
}

/**
 * Get line width for a preset
 * @param {string} preset - xs, sm, md, or lg
 * @returns {number} Width in pixels
 */
export function getLineWidthForPreset(preset) {
  return defaults?.lineWidthPresets?.[preset] ?? 2;
}

/**
 * Get preset name for a line width (finds closest match)
 * @param {number} width - Width in pixels
 * @returns {string} Preset name (xs, sm, md, lg) or null if no close match
 */
export function getPresetForLineWidth(width) {
  const presets = defaults?.lineWidthPresets;
  if (!presets) return null;

  for (const [name, value] of Object.entries(presets)) {
    if (value === width) return name;
  }
  return null;
}

/**
 * Get gap multiplier for dash/dot patterns based on line width
 * Larger line widths get proportionally smaller gaps for visual balance
 * @param {number} lineWidth - Line width in pixels
 * @returns {number} Gap multiplier (1.0 = full gap, lower = smaller gap)
 */
export function getDashGapMultiplier(lineWidth) {
  const presets = defaults?.lineWidthPresets;
  const multipliers = defaults?.dashGapMultipliers;
  if (!presets || !multipliers) return 1.0;

  // Find which preset this width matches or is closest to
  if (lineWidth <= presets.xs) return multipliers.xs ?? 1.0;
  if (lineWidth <= presets.sm) return multipliers.sm ?? 1.0;
  if (lineWidth <= presets.md) return multipliers.md ?? 0.8;
  if (lineWidth <= presets.lg) return multipliers.lg ?? 0.6;
  return multipliers.xl ?? 0.4;
}

/**
 * Get text size configuration for a preset
 * @param {string} size - Size preset (xs, sm, md, lg)
 * @returns {Object} Size config {fontSize, fontWeight}
 */
export function getTextSize(size) {
  const fallback = { fontSize: 20, fontWeight: 600 }; // md default
  return defaults?.textSizes?.[size] ?? fallback;
}

/**
 * Get text line height multiplier
 * @returns {number} Line height multiplier (e.g., 1.2 = 120%)
 */
export function getTextLineHeight() {
  return defaults?.textLineHeight ?? 1.2;
}

/**
 * Get arrowhead style configuration
 * @param {string} styleName - Style name (standard, wide, narrow)
 * @returns {Object} Style config {name, angle, lengthRatio}
 */
export function getArrowheadStyle(styleName) {
  return defaults?.arrowheadStyles?.[styleName] ?? defaults?.arrowheadStyles?.standard;
}

/**
 * Get all available arrowhead styles
 * @returns {Object} Map of style name to config
 */
export function getArrowheadStyles() {
  return defaults?.arrowheadStyles ?? {};
}

/**
 * Get available symbols for the Symbols tool
 * @returns {string[]} Array of symbol characters (max 20)
 */
export function getSymbols() {
  const symbols = defaults?.symbols ?? ["✔", "❌", "⚫"];
  return symbols.slice(0, 20);
}

/**
 * Get step symbols for the Steps tool
 * @returns {string[]} Array of step number characters (①②③...)
 */
export function getSteps() {
  return defaults?.steps ?? ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];
}

/**
 * Get default user initials from config
 * @returns {string} Default initials (e.g., "RNC") or empty string if not set
 */
export function getDefaultInitials() {
  return defaults?.user?.initials ?? "";
}

/**
 * Fallback defaults if server request fails
 * Matches structure of defaults.js
 */
function getFallbackDefaults() {
  return {
    tools: {
      arrow: {
        colour: "#FF0000",
        lineStyle: "solid",
        lineWidth: 2,
        lineWidthPreset: "sm",
        arrowheadStyle: "standard",
        arrowheadSize: 1.0,
        doubleEnded: false,
      },
      line: {
        colour: "#FF0000",
        lineStyle: "solid",
        lineWidth: 2,
        lineWidthPreset: "sm",
      },
      text: {
        colour: "#FF0000",
        size: "md",
      },
      shape: {
        borderColour: "#FF0000",
        fillColour: "transparent",
        borderWidthPreset: "md",
        cornerStyle: "square",
      },
      steps: {
        colour: "#FF0000",
        size: "md",
      },
      symbols: {
        size: "md",
      },
      highlight: {
        colour: "#FFFF00",
        opacity: 0.4,
      },
    },
    palette: {
      colours: ["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00"],
    },
    lineWidthPresets: {
      xs: 1,
      sm: 2,
      md: 4,
      lg: 8,
      xl: 11,
    },
    dashGapMultipliers: {
      xs: 1.0,
      sm: 1.0,
      md: 0.8,
      lg: 0.6,
      xl: 0.4,
    },
    textSizes: {
      xs: { fontSize: 12, fontWeight: 400 },
      sm: { fontSize: 16, fontWeight: 500 },
      md: { fontSize: 20, fontWeight: 600 },
      lg: { fontSize: 28, fontWeight: 700 },
    },
    textLineHeight: 1.2,
    arrowheadStyles: {
      standard: { name: "Standard", angle: 22.5, lengthRatio: 0.15 },
      wide: { name: "Wide", angle: 35, lengthRatio: 0.12 },
      narrow: { name: "Narrow", angle: 15, lengthRatio: 0.18 },
    },
    symbols: ["⛔", "🚫", "🔑", "🔒", "🔓", "❌", "✔", "🟢", "⚫"],
    steps: ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"],
    user: {
      initials: "",
    },
  };
}
