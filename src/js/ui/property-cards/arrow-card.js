/**
 * Arrow Tool Property Card
 *
 * Properties:
 * - Colour (palette + custom + eyedropper)
 * - Line Style (solid/dashed/dotted)
 * - Line Width (XS/SM/MD/LG/XL presets)
 *
 * Future extensibility:
 * - Arrowhead style (standard/wide/narrow)
 * - Arrowhead size
 * - Double-ended arrows
 */

import { BasePropertyCard } from "./base-card.js";
import { createColourPicker } from "../components/colour-picker.js";
import { createButtonGroup, createLineStyleGroup, createLineWidthPresetGroup } from "../components/button-group.js";
import { state, persistState } from "../../state.js";
import { getToolConfig, setToolConfig, getLineWidthForPreset, getPresetForLineWidth } from "../../utils/config.js";
import { getPaletteColours } from "../../utils/colours.js";

export class ArrowCard extends BasePropertyCard {
  constructor() {
    super("arrow", "Arrow");

    // Component references
    this.colourPicker = null;
    this.lineStyleGroup = null;
    this.lineWidthPresetGroup = null;
  }

  /**
   * Render the card content
   * @returns {HTMLElement}
   */
  renderContent() {
    const content = document.createElement("div");
    content.className = "flex flex-wrap gap-10 items-end";

    // Get current values from state (toolbar-synced) or config (localStorage)
    const currentColour = state.currentColour;
    const currentLineStyle = state.lineStyle;
    const currentPreset = getToolConfig("arrow", "lineWidthPreset") || "sm";

    // === Colour Section (no title - swatches are self-explanatory) ===
    const colourSection = document.createElement("div");
    // Get palette colours from config/defaults.js
    const paletteColours = getPaletteColours();
    this.colourPicker = createColourPicker({
      palette: paletteColours,
      allowTransparent: false,
      allowCustom: true,
      allowEyedropper: true,
      value: currentColour,
      storageKey: "ssce_lastCustomColour",
      onChange: (colour) => this.handleColourChange(colour),
      onEyedropperStart: (callback) => this.startEyedropper(callback),
      onEyedropperEnd: () => this.endEyedropper(),
      onHeightChange: () => this.handleHeightChange(),
    });
    colourSection.appendChild(this.colourPicker.element);
    this.registerComponent(this.colourPicker);
    content.appendChild(colourSection);

    // === Line Style Section (no separate title - button group has its own label) ===
    const styleSection = document.createElement("div");
    this.lineStyleGroup = createLineStyleGroup({
      value: currentLineStyle,
      onChange: (style) => this.handleLineStyleChange(style),
    });
    styleSection.appendChild(this.lineStyleGroup.element);
    this.registerComponent(this.lineStyleGroup);
    content.appendChild(styleSection);

    // === Line Width Section ===
    const widthSection = document.createElement("div");
    this.lineWidthPresetGroup = createLineWidthPresetGroup({
      value: currentPreset,
      onChange: (preset) => this.handleLineWidthPresetChange(preset),
    });
    widthSection.appendChild(this.lineWidthPresetGroup.element);
    this.registerComponent(this.lineWidthPresetGroup);
    content.appendChild(widthSection);

    return content;
  }

  /**
   * Handle colour change
   * @param {string} colour
   */
  handleColourChange(colour) {
    // Update global state (syncs with toolbar)
    state.currentColour = colour;
    persistState("currentColour", colour);

    // Update toolbar colour indicator
    const indicator = document.getElementById("current-colour-indicator");
    if (indicator) {
      indicator.style.backgroundColor = colour;
    }

    // Save to tool-specific config
    setToolConfig("arrow", "colour", colour);
  }

  /**
   * Handle line style change
   * @param {string} style
   */
  handleLineStyleChange(style) {
    // Update global state (syncs with toolbar)
    state.lineStyle = style;
    persistState("lineStyle", style);

    // Update toolbar line style display
    const display = document.getElementById("current-line-style");
    if (display) {
      display.textContent = style.charAt(0).toUpperCase() + style.slice(1);
    }

    // Save to tool-specific config
    setToolConfig("arrow", "lineStyle", style);
  }

  /**
   * Handle line width preset change
   * @param {string} preset
   */
  handleLineWidthPresetChange(preset) {
    const width = getLineWidthForPreset(preset);

    // Save to config (both preset name and pixel value)
    setToolConfig("arrow", "lineWidth", width);
    setToolConfig("arrow", "lineWidthPreset", preset);
  }

  /**
   * Handle height change (e.g., custom colour panel toggled)
   * Triggers zoom recalculation to adjust for new viewport space
   */
  handleHeightChange() {
    // Small delay to let DOM update
    setTimeout(() => {
      import("../../utils/zoom.js").then((zoom) => zoom.recalculateZoom(true));
    }, 50);
  }

  /**
   * Start eyedropper mode
   * @param {Function} callback - Call with picked colour
   */
  startEyedropper(callback) {
    state.eyedropperActive = true;
    this.eyedropperCallback = callback;

    // Change cursor
    const canvas = document.getElementById("main-canvas");
    if (canvas) {
      canvas.style.cursor = "crosshair";
      canvas.addEventListener("click", this.handleEyedropperClick);
    }
  }

  /**
   * End eyedropper mode
   */
  endEyedropper() {
    state.eyedropperActive = false;
    this.eyedropperCallback = null;

    // Restore cursor
    const canvas = document.getElementById("main-canvas");
    if (canvas) {
      canvas.style.cursor = "";
      canvas.removeEventListener("click", this.handleEyedropperClick);
    }
  }

  /**
   * Handle eyedropper click on canvas
   * @param {MouseEvent} e
   */
  handleEyedropperClick = (e) => {
    if (!this.eyedropperCallback) return;

    const canvas = document.getElementById("main-canvas");
    const ctx = canvas.getContext("2d");

    // Get click position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Get pixel colour
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const colour = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1].toString(16).padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`.toUpperCase();

    // Call callback with colour
    this.eyedropperCallback(colour);

    // Prevent canvas click from hiding the card
    e.stopPropagation();
  };

  /**
   * Setup additional event listeners
   */
  setupEventListeners() {
    // Bind eyedropper click handler
    this.handleEyedropperClick = this.handleEyedropperClick.bind(this);
  }

  /**
   * Cleanup event listeners
   */
  cleanupEventListeners() {
    // Ensure eyedropper is cleaned up
    this.endEyedropper();
  }
}
