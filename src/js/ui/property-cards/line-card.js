/**
 * Line Tool Property Card
 *
 * Properties:
 * - Colour (palette + custom + eyedropper)
 * - Line Style (solid/dashed/dotted)
 * - Line Width (XS/SM/MD/LG/XL presets)
 */

import { BasePropertyCard } from "./base-card.js";
import { createColourPicker } from "../components/colour-picker.js";
import { createLineStyleGroup, createLineWidthPresetGroup } from "../components/button-group.js";
import { state, persistState } from "../../state.js";
import { getToolConfig, setToolConfig, getLineWidthForPreset } from "../../utils/config.js";
import { getPaletteColours } from "../../utils/colours.js";

export class LineCard extends BasePropertyCard {
  constructor() {
    super("line", "Line");

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
    const currentPreset = getToolConfig("line", "lineWidthPreset") || "sm";

    // === Colour Section ===
    const colourSection = document.createElement("div");
    const paletteColours = getPaletteColours();
    this.colourPicker = createColourPicker({
      palette: paletteColours,
      allowTransparent: false,
      allowCustom: true,
      allowEyedropper: true,
      value: currentColour,
      storageKey: "ssce_lastCustomColour",
      onChange: (colour) => this.handleColourChange(colour),
      onHeightChange: () => this.handleHeightChange(),
    });
    colourSection.appendChild(this.colourPicker.element);
    this.registerComponent(this.colourPicker);
    content.appendChild(colourSection);

    // === Line Style Section ===
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
    setToolConfig("line", "colour", colour);
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
    setToolConfig("line", "lineStyle", style);
  }

  /**
   * Handle line width preset change
   * @param {string} preset
   */
  handleLineWidthPresetChange(preset) {
    const width = getLineWidthForPreset(preset);

    // Save to config (both preset name and pixel value)
    setToolConfig("line", "lineWidth", width);
    setToolConfig("line", "lineWidthPreset", preset);
  }

  /**
   * Handle height change (e.g., custom colour panel toggled)
   */
  handleHeightChange() {
    setTimeout(() => {
      import("../../utils/zoom.js").then((zoom) => zoom.recalculateZoom(true));
    }, 50);
  }
}
