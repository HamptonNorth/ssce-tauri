/**
 * Fill Tool Property Card
 *
 * Properties:
 * - Colour (palette + custom + eyedropper)
 */

import { BasePropertyCard } from "./base-card.js";
import { createColourPicker } from "../components/colour-picker.js";
import { state, persistState } from "../../state.js";
import { setToolConfig } from "../../utils/config.js";
import { getPaletteColours } from "../../utils/colours.js";

export class FillCard extends BasePropertyCard {
  constructor() {
    super("fill", "Fill");

    // Component references
    this.colourPicker = null;
  }

  /**
   * Render the card content
   * @returns {HTMLElement}
   */
  renderContent() {
    const content = document.createElement("div");
    content.className = "flex flex-wrap gap-10 items-end";

    // Get current colour from state
    const currentColour = state.currentColour;

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
    setToolConfig("fill", "colour", colour);
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
