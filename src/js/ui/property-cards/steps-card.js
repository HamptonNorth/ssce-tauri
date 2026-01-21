/**
 * Steps Tool Property Card
 *
 * Properties:
 * - Colour (palette + custom + eyedropper)
 * - Size (XS/SM/MD/LG presets) - shares textSize with Text tool
 */

import { BasePropertyCard } from "./base-card.js";
import { createColourPicker } from "../components/colour-picker.js";
import { createButtonGroup } from "../components/button-group.js";
import { state, persistState } from "../../state.js";
import { getToolConfig, setToolConfig, getTextSize } from "../../utils/config.js";
import { getPaletteColours } from "../../utils/colours.js";

export class StepsCard extends BasePropertyCard {
  constructor() {
    super("steps", "Steps");

    // Component references
    this.colourPicker = null;
    this.sizeGroup = null;
  }

  /**
   * Render the card content
   * @returns {HTMLElement}
   */
  renderContent() {
    const content = document.createElement("div");
    content.className = "flex flex-wrap gap-10 items-end";

    // Get current values from state or config
    const currentColour = state.currentColour;
    const currentSize = state.textSize || getToolConfig("steps", "size") || "md";

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

    // === Size Section ===
    const sizeSection = document.createElement("div");
    this.sizeGroup = createStepSizeGroup({
      value: currentSize,
      onChange: (size) => this.handleSizeChange(size),
    });
    sizeSection.appendChild(this.sizeGroup.element);
    this.registerComponent(this.sizeGroup);
    content.appendChild(sizeSection);

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
    setToolConfig("steps", "colour", colour);
  }

  /**
   * Handle size change
   * @param {string} size
   */
  handleSizeChange(size) {
    // Update global state (textSize is shared by text, steps, symbols tools)
    state.textSize = size;
    persistState("textSize", size);

    // Update toolbar text size display if it exists
    const display = document.getElementById("current-text-size");
    if (display) {
      display.textContent = size.toUpperCase();
    }

    // Save to tool-specific config
    setToolConfig("steps", "size", size);
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
 * Create a step size button group
 * @param {Object} options
 * @param {string} options.value - Current size (xs, sm, md, lg)
 * @param {Function} options.onChange - Callback
 * @returns {Object} Button group component
 */
function createStepSizeGroup(options = {}) {
  const { value = "md", onChange = () => {} } = options;

  // Get text sizes from centralized config (steps use same sizes as text)
  const presets = ["xs", "sm", "md", "lg"];
  const buttons = presets.map((size) => ({
    value: size,
    label: size.toUpperCase(),
    title: `${getTextSize(size).fontSize}px`,
  }));

  return createButtonGroup({
    label: "Step Size",
    buttons,
    value,
    onChange,
  });
}
