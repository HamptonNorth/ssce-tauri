/**
 * Shape Tool Property Card
 *
 * Properties:
 * - Border Colour (palette + custom + eyedropper)
 * - Fill Colour (palette + custom + transparent option)
 * - Line Style (solid/dashed/dotted)
 * - Border Width (XS/SM/MD/LG/XL presets)
 * - Corner Style (square/rounded)
 */

import { BasePropertyCard } from "./base-card.js";
import { createColourPicker } from "../components/colour-picker.js";
import { createLineStyleGroup, createLineWidthPresetGroup, createButtonGroup } from "../components/button-group.js";
import { state, persistState } from "../../state.js";
import { getToolConfig, setToolConfig, getLineWidthForPreset } from "../../utils/config.js";
import { getPaletteColours } from "../../utils/colours.js";

export class ShapeCard extends BasePropertyCard {
  constructor() {
    super("shape", "Rectangle");

    // Component references
    this.borderColourPicker = null;
    this.fillColourPicker = null;
    this.lineStyleGroup = null;
    this.borderWidthPresetGroup = null;
    this.cornerStyleGroup = null;
  }

  /**
   * Render the card content
   * @returns {HTMLElement}
   */
  renderContent() {
    const content = document.createElement("div");
    content.className = "flex flex-wrap gap-10 items-end";

    // Get current values from state
    const currentBorderColour = state.currentColour;
    const currentFillColour = state.shapeFillColour || "transparent";
    const currentLineStyle = state.lineStyle;
    const currentPreset = getToolConfig("shape", "borderWidthPreset") || "md";
    const currentCornerStyle = state.shapeCornerStyle || "square";

    const paletteColours = getPaletteColours();

    // === Border Colour Section ===
    const borderColourSection = document.createElement("div");
    this.borderColourPicker = createColourPicker({
      label: "Border",
      palette: paletteColours,
      allowTransparent: false,
      allowCustom: true,
      allowEyedropper: true,
      value: currentBorderColour,
      storageKey: "ssce_lastCustomColour",
      onChange: (colour) => this.handleBorderColourChange(colour),
      onHeightChange: () => this.handleHeightChange(),
    });
    borderColourSection.appendChild(this.borderColourPicker.element);
    this.registerComponent(this.borderColourPicker);
    content.appendChild(borderColourSection);

    // === Fill Colour Section ===
    const fillColourSection = document.createElement("div");
    this.fillColourPicker = createColourPicker({
      label: "Fill",
      palette: paletteColours,
      allowTransparent: true,
      allowCustom: true,
      allowEyedropper: true,
      value: currentFillColour,
      storageKey: "ssce_lastCustomFillColour",
      onChange: (colour) => this.handleFillColourChange(colour),
      onHeightChange: () => this.handleHeightChange(),
    });
    fillColourSection.appendChild(this.fillColourPicker.element);
    this.registerComponent(this.fillColourPicker);
    content.appendChild(fillColourSection);

    // === Line Style Section ===
    const styleSection = document.createElement("div");
    this.lineStyleGroup = createLineStyleGroup({
      value: currentLineStyle,
      onChange: (style) => this.handleLineStyleChange(style),
    });
    styleSection.appendChild(this.lineStyleGroup.element);
    this.registerComponent(this.lineStyleGroup);
    content.appendChild(styleSection);

    // === Border Width Section ===
    const widthSection = document.createElement("div");
    this.borderWidthPresetGroup = createLineWidthPresetGroup({
      label: "Border Width",
      value: currentPreset,
      onChange: (preset) => this.handleBorderWidthPresetChange(preset),
    });
    widthSection.appendChild(this.borderWidthPresetGroup.element);
    this.registerComponent(this.borderWidthPresetGroup);
    content.appendChild(widthSection);

    // === Corner Style Section ===
    const cornerSection = document.createElement("div");
    this.cornerStyleGroup = createCornerStyleGroup({
      value: currentCornerStyle,
      onChange: (style) => this.handleCornerStyleChange(style),
    });
    cornerSection.appendChild(this.cornerStyleGroup.element);
    this.registerComponent(this.cornerStyleGroup);
    content.appendChild(cornerSection);

    return content;
  }

  /**
   * Handle border colour change
   * @param {string} colour
   */
  handleBorderColourChange(colour) {
    // Update global state (syncs with toolbar)
    state.currentColour = colour;
    persistState("currentColour", colour);

    // Update toolbar colour indicator
    const indicator = document.getElementById("current-colour-indicator");
    if (indicator) {
      indicator.style.backgroundColor = colour;
    }

    // Save to tool-specific config
    setToolConfig("shape", "borderColour", colour);
  }

  /**
   * Handle fill colour change
   * @param {string} colour
   */
  handleFillColourChange(colour) {
    // Update shape-specific state
    state.shapeFillColour = colour;
    persistState("shapeFillColour", colour);

    // Update toolbar fill indicator
    const indicator = document.getElementById("shape-fill-indicator");
    if (indicator) {
      if (colour === "transparent") {
        indicator.style.background = "repeating-conic-gradient(#808080 0% 25%, #c0c0c0 0% 50%) 50% / 8px 8px";
      } else {
        indicator.style.background = colour;
      }
    }

    // Save to tool-specific config
    setToolConfig("shape", "fillColour", colour);
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
    setToolConfig("shape", "lineStyle", style);
  }

  /**
   * Handle border width preset change
   * @param {string} preset
   */
  handleBorderWidthPresetChange(preset) {
    const width = getLineWidthForPreset(preset);

    // Update state (used by shape tool)
    state.shapeBorderWidth = width;
    persistState("shapeBorderWidth", width);

    // Save to config (both preset name and pixel value)
    setToolConfig("shape", "borderWidth", width);
    setToolConfig("shape", "borderWidthPreset", preset);
  }

  /**
   * Handle corner style change
   * @param {string} style
   */
  handleCornerStyleChange(style) {
    // Update state
    state.shapeCornerStyle = style;
    persistState("shapeCornerStyle", style);

    // Update toolbar corner style display
    const display = document.getElementById("shape-corner-style");
    if (display) {
      display.textContent = style.charAt(0).toUpperCase() + style.slice(1);
    }

    // Save to tool-specific config
    setToolConfig("shape", "cornerStyle", style);
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

/**
 * Create a corner style button group
 * @param {Object} options
 * @param {string} options.value - Current corner style (square, rounded)
 * @param {Function} options.onChange - Callback
 * @returns {Object} Button group component
 */
function createCornerStyleGroup(options = {}) {
  const { value = "square", onChange = () => {} } = options;

  // Use distinct SVG icons for square vs rounded
  const squareIcon = `<svg viewBox="0 0 16 16" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="12" height="12"/></svg>`;
  const roundedIcon = `<svg viewBox="0 0 16 16" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="12" height="12" rx="3" ry="3"/></svg>`;

  const buttons = [
    { value: "square", label: squareIcon, title: "Square corners", isHtml: true },
    { value: "rounded", label: roundedIcon, title: "Rounded corners", isHtml: true },
  ];

  return createButtonGroup({
    label: "Corners",
    buttons,
    value,
    onChange,
  });
}
