/**
 * SSCE Desktop Default Configuration
 *
 * This file contains all default settings for tools, colours, and presets.
 * Values here are used when no localStorage override exists.
 *
 * To customize: Edit values here or use the UI (saves to localStorage).
 * localStorage values take precedence over these defaults.
 */

export default {
  // ============================================================
  // TOOL DEFAULTS
  // Default settings for each drawing tool
  // ============================================================
  tools: {
    // Arrow tool - for pointing at things
    arrow: {
      colour: "#FF0000", // Default colour (red)
      lineStyle: "solid", // solid, dashed, or dotted
      lineWidth: 2, // Width in pixels
      lineWidthPreset: "sm", // Preset name (xs, sm, md, lg, xl)
      arrowheadStyle: "standard", // standard, wide, or narrow
      arrowheadSize: 1.0, // Size multiplier (1.0 = normal)
      doubleEnded: false, // Arrowheads on both ends
    },

    // Line tool - straight lines without arrowheads
    line: {
      colour: "#FF0000",
      lineStyle: "solid",
      lineWidth: 2,
      lineWidthPreset: "sm",
    },

    // Text tool - add text annotations
    text: {
      colour: "#FF0000",
      size: "md", // xs (12px), sm (16px), md (20px), lg (28px)
    },

    // Shape tool - rectangles and circles
    shape: {
      borderColour: "#FF0000",
      fillColour: "transparent", // Use "transparent" for no fill
      borderWidthPreset: "md",
      cornerStyle: "square", // square or rounded
    },

    // Steps tool - numbered circles for tutorials
    steps: {
      colour: "#FF0000",
      size: "md",
    },

    // Symbols tool - checkmarks, X marks, icons
    symbols: {
      size: "md",
      // Note: Available symbols are in top-level 'symbols' array
    },

    // Highlight tool - semi-transparent rectangles
    highlight: {
      colour: "#FFFF00", // Yellow
      opacity: 0.4, // 40% opacity
    },

    // Borders tool - add borders around images
    borders: {
      width: 4, // Default border width in pixels (1-50)
      colour: "#333333", // Default border colour (hex format)
      radius: 0, // Default corner radius in pixels (0-50, 0 = square)
    },
  },

  // ============================================================
  // COLOUR PALETTE
  // Default colours shown in the colour picker
  // ============================================================
  palette: {
    // Six base colours displayed as swatches
    colours: [
      "#FFFFFF", // White
      "#000000", // Black
      "#FF0000", // Red
      "#00FF00", // Green
      "#0000FF", // Blue
      "#FFFF00", // Yellow
    ],
  },

  // ============================================================
  // CANVAS DEFAULTS
  // Visual settings for the canvas area
  // ============================================================
  canvas: {
    background: "#CCCCCC", // Background colour when canvas is larger than image
    transparentGrid: "#E0E0E0", // Colour for transparency checkerboard pattern
  },

  // ============================================================
  // LINE WIDTH PRESETS
  // Named presets for line/border widths (in pixels)
  // ============================================================
  lineWidthPresets: {
    xs: 1, // Extra small - fine detail work
    sm: 2, // Small - default for most annotations
    md: 4, // Medium - moderate emphasis
    lg: 8, // Large - high emphasis
    xl: 11, // Extra large - maximum visibility
  },

  // ============================================================
  // DASH GAP MULTIPLIERS
  // Controls spacing between dashes/dots at different line widths
  // Larger widths need proportionally smaller gaps to look balanced
  // 1.0 = full gap, lower values = tighter spacing
  // ============================================================
  dashGapMultipliers: {
    xs: 1.0, // Full gap at 1px
    sm: 1.0, // Full gap at 2px
    md: 0.8, // 20% smaller gaps at 4px
    lg: 0.6, // 40% smaller gaps at 8px
    xl: 0.4, // 60% smaller gaps at 11px
  },

  // ============================================================
  // TEXT SIZE PRESETS
  // Font sizes and weights for text, steps, and symbols
  // Larger sizes use heavier weights to avoid looking "wispy"
  // ============================================================
  textSizes: {
    xs: { fontSize: 12, fontWeight: 400 }, // Extra small - fine labels
    sm: { fontSize: 16, fontWeight: 500 }, // Small - compact text
    md: { fontSize: 20, fontWeight: 600 }, // Medium - default readable size
    lg: { fontSize: 28, fontWeight: 700 }, // Large - emphasis/headings
  },

  // Line height multiplier for multi-line text (1.2 = 120% of font size)
  textLineHeight: 1.2,

  // ============================================================
  // ARROWHEAD STYLES
  // Different arrowhead shapes with angle and size settings
  // angle: spread angle in degrees (smaller = sharper point)
  // lengthRatio: head length as fraction of arrow length
  // ============================================================
  arrowheadStyles: {
    standard: {
      name: "Standard",
      angle: 22.5, // Balanced, professional look
      lengthRatio: 0.15,
    },
    wide: {
      name: "Wide",
      angle: 35, // Broader, more prominent
      lengthRatio: 0.12,
    },
    narrow: {
      name: "Narrow",
      angle: 15, // Sharp, sleek appearance
      lengthRatio: 0.18,
    },
  },

  // ============================================================
  // SYMBOLS TOOL - Available Symbols
  // Emoji/Unicode characters for the Symbols annotation tool
  // Max 6 per row in property card, max 20 total
  // ============================================================
  symbols: [
    "\u26D4", // No entry
    "\uD83D\uDEAB", // Prohibited
    "\uD83D\uDD11", // Key
    "\uD83D\uDD12", // Locked
    "\uD83D\uDD13", // Unlocked
    "\u274C", // X mark
    "\u2714", // Checkmark
    "\uD83D\uDFE2", // Green circle
    "\u26AB", // Black circle
    "\uD83C\uDDE6\uD83C\uDDFD", // Flag AX
    "\uD83C\uDDEC\uD83C\uDDE7", // Flag GB
    "\uD83D\uDE42", // Smiley
    "\uD83D\uDEB9", // Mens room
    "\uD83D\uDEBA", // Womens room
    "\uD83D\uDEBB", // Restroom
  ],

  // ============================================================
  // STEPS TOOL - Step Number Symbols
  // Circled digits for numbered step annotations (1-9)
  // ============================================================
  steps: ["\u2460", "\u2461", "\u2462", "\u2463", "\u2464", "\u2465", "\u2466", "\u2467", "\u2468"],

  // ============================================================
  // CANVAS RESIZE LIMITS
  // Maximum canvas dimensions (in pixels) for resize operations
  // ============================================================
  resizeLimits: {
    warning: 1920, // Warning shown if either dimension exceeds this (Full HD)
    error: 3840, // Hard error if either dimension exceeds this (4K)
  },

  // ============================================================
  // AUTO-SAVE SETTINGS
  // Configuration for auto-save feature
  // ============================================================
  autosave: {
    enabled: true, // Enable auto-save feature
    inactivitySeconds: 30, // Seconds of inactivity before auto-save triggers
    tempDirectory: ".ssce-temp", // Directory for temporary auto-save files
  },

  // ============================================================
  // USER DEFAULTS
  // Default user information for front matter
  // ============================================================
  user: {
    initials: "", // Default initials for snapshots and file info
  },
};
