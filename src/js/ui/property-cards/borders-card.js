/**
 * Borders Tool Property Card
 *
 * Properties:
 * - Horizontal width slider (left/right border)
 * - Vertical width slider (top/bottom border)
 * - Sync H/V checkbox
 * - Colour picker (with transparent option)
 * - Corner radius slider
 * - Apply/Cancel buttons
 *
 * Note: This is a "modal operation" card - requires explicit apply/cancel.
 */

import { BasePropertyCard } from "./base-card.js";
import { createColourPicker } from "../components/colour-picker.js";
import { getPaletteColours } from "../../utils/colours.js";
import { state, persistState } from "../../state.js";

export class BordersCard extends BasePropertyCard {
  constructor() {
    super("borders", "Borders");

    // Component references
    this.colourPicker = null;

    // Settings - will be populated from tool
    this.borderWidthH = 4;
    this.borderWidthV = 4;
    this.syncWidths = true;
    this.borderColour = "#333333";
    this.borderRadius = 0;
    this.originalSize = null;

    // Callback to notify tool of changes
    this.onSettingsChange = null;
    this.onApply = null;
    this.onCancel = null;
  }

  /**
   * Set initial values from the tool
   */
  setInitialValues(values) {
    this.borderWidthH = values.borderWidthH || 4;
    this.borderWidthV = values.borderWidthV || 4;
    this.syncWidths = values.syncWidths !== false;
    this.borderColour = values.borderColour || "#333333";
    this.borderRadius = values.borderRadius || 0;
    this.originalSize = values.originalSize || null;
  }

  /**
   * Render the card content
   * @returns {HTMLElement}
   */
  renderContent() {
    const content = document.createElement("div");
    content.className = "flex flex-wrap gap-6 items-end";

    const paletteColours = getPaletteColours();

    // === Width Sliders Section ===
    const widthSection = document.createElement("div");
    widthSection.className = "flex flex-col gap-2";
    widthSection.innerHTML = `
      <div class="text-xs text-gray-400">Border Width</div>
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400 w-6">H</span>
          <input type="range" id="borders-width-h" min="1" max="50" value="${this.borderWidthH}"
                 class="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer">
          <span id="borders-width-h-value" class="text-xs text-gray-300 w-8">${this.borderWidthH}px</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400 w-6">V</span>
          <input type="range" id="borders-width-v" min="1" max="50" value="${this.borderWidthV}"
                 class="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer">
          <span id="borders-width-v-value" class="text-xs text-gray-300 w-8">${this.borderWidthV}px</span>
        </div>
        <label class="flex items-center gap-2 text-xs text-gray-400 cursor-pointer mt-1">
          <input type="checkbox" id="borders-sync" ${this.syncWidths ? "checked" : ""}
                 class="rounded border-gray-600 bg-gray-700 text-blue-500 w-3 h-3">
          <span>Sync</span>
        </label>
      </div>
    `;
    content.appendChild(widthSection);

    // === Colour Section ===
    const colourSection = document.createElement("div");
    this.colourPicker = createColourPicker({
      label: "Colour",
      palette: paletteColours,
      allowTransparent: true,
      allowCustom: true,
      allowEyedropper: true,
      value: this.borderColour,
      storageKey: "ssce_lastBorderColour",
      onChange: (colour) => this.handleColourChange(colour),
      onHeightChange: () => this.handleHeightChange(),
    });
    colourSection.appendChild(this.colourPicker.element);
    this.registerComponent(this.colourPicker);
    content.appendChild(colourSection);

    // === Corner Radius Section ===
    const maxRadius = Math.min(this.borderWidthH, this.borderWidthV);
    const radiusSection = document.createElement("div");
    radiusSection.className = "flex flex-col gap-1";
    radiusSection.innerHTML = `
      <div class="text-xs text-gray-400">Radius <span id="borders-radius-max" class="text-gray-500">(max ${maxRadius})</span></div>
      <div class="flex items-center gap-2">
        <input type="range" id="borders-radius" min="0" max="${maxRadius}" value="${Math.min(this.borderRadius, maxRadius)}"
               class="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer">
        <span id="borders-radius-value" class="text-xs text-gray-300 w-8">${Math.min(this.borderRadius, maxRadius)}px</span>
      </div>
      <div id="borders-radius-hint" class="text-xs text-yellow-500 ${this.borderRadius > 0 ? "" : "hidden"}">
        Corners transparent
      </div>
    `;
    content.appendChild(radiusSection);

    // === Dimensions Preview Section ===
    const dimsSection = document.createElement("div");
    dimsSection.className = "flex flex-col gap-1";
    dimsSection.innerHTML = `
      <div class="text-xs text-gray-400">Result</div>
      <div id="borders-dimensions" class="text-xs text-gray-300 py-1 px-2 bg-gray-600 rounded">
        <!-- Updated dynamically -->
      </div>
    `;
    content.appendChild(dimsSection);

    // === Apply/Cancel Buttons ===
    const buttonsSection = document.createElement("div");
    buttonsSection.className = "flex gap-2";
    buttonsSection.innerHTML = `
      <button id="borders-apply" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium">
        Apply
      </button>
      <button id="borders-cancel" class="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm">
        Cancel
      </button>
    `;
    content.appendChild(buttonsSection);

    return content;
  }

  /**
   * Setup event listeners after render
   */
  setupEventListeners() {
    // Width sliders
    const hSlider = this.element.querySelector("#borders-width-h");
    const hValue = this.element.querySelector("#borders-width-h-value");
    const vSlider = this.element.querySelector("#borders-width-v");
    const vValue = this.element.querySelector("#borders-width-v-value");
    const syncCheckbox = this.element.querySelector("#borders-sync");

    if (hSlider) {
      hSlider.oninput = () => {
        this.borderWidthH = parseInt(hSlider.value);
        hValue.textContent = `${this.borderWidthH}px`;
        if (this.syncWidths) {
          this.borderWidthV = this.borderWidthH;
          vSlider.value = this.borderWidthV;
          vValue.textContent = `${this.borderWidthV}px`;
        }
        this.updateRadiusMax();
        this.updateDimensions();
      };
      hSlider.onchange = () => this.notifyChange();
    }

    if (vSlider) {
      vSlider.oninput = () => {
        this.borderWidthV = parseInt(vSlider.value);
        vValue.textContent = `${this.borderWidthV}px`;
        if (this.syncWidths) {
          this.borderWidthH = this.borderWidthV;
          hSlider.value = this.borderWidthH;
          hValue.textContent = `${this.borderWidthH}px`;
        }
        this.updateRadiusMax();
        this.updateDimensions();
      };
      vSlider.onchange = () => this.notifyChange();
    }

    if (syncCheckbox) {
      syncCheckbox.onchange = () => {
        this.syncWidths = syncCheckbox.checked;
        if (this.syncWidths) {
          this.borderWidthV = this.borderWidthH;
          vSlider.value = this.borderWidthV;
          vValue.textContent = `${this.borderWidthV}px`;
          this.updateRadiusMax();
          this.updateDimensions();
          this.notifyChange();
        }
      };
    }

    // Radius slider
    const radiusSlider = this.element.querySelector("#borders-radius");
    const radiusValue = this.element.querySelector("#borders-radius-value");
    const radiusHint = this.element.querySelector("#borders-radius-hint");

    if (radiusSlider) {
      radiusSlider.oninput = () => {
        this.borderRadius = parseInt(radiusSlider.value);
        radiusValue.textContent = `${this.borderRadius}px`;
        radiusHint.classList.toggle("hidden", this.borderRadius === 0);
      };
      radiusSlider.onchange = () => this.notifyChange();
    }

    // Apply/Cancel buttons
    const applyBtn = this.element.querySelector("#borders-apply");
    const cancelBtn = this.element.querySelector("#borders-cancel");

    if (applyBtn) {
      applyBtn.onclick = () => {
        if (this.onApply) this.onApply();
      };
    }

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        if (this.onCancel) this.onCancel();
      };
    }

    // Initial update
    this.updateDimensions();
  }

  /**
   * Handle colour change
   */
  handleColourChange(colour) {
    this.borderColour = colour;
    this.notifyChange();
  }

  /**
   * Handle height change (custom colour panel toggled)
   */
  handleHeightChange() {
    setTimeout(() => {
      import("../../utils/zoom.js").then((zoom) => zoom.recalculateZoom(true));
    }, 50);
  }

  /**
   * Update radius slider max value based on H/V widths
   */
  updateRadiusMax() {
    const maxRadius = Math.min(this.borderWidthH, this.borderWidthV);
    const radiusSlider = this.element.querySelector("#borders-radius");
    const radiusMax = this.element.querySelector("#borders-radius-max");
    const radiusValue = this.element.querySelector("#borders-radius-value");

    if (radiusSlider) {
      radiusSlider.max = maxRadius;
      if (this.borderRadius > maxRadius) {
        this.borderRadius = maxRadius;
        radiusSlider.value = maxRadius;
        if (radiusValue) radiusValue.textContent = `${maxRadius}px`;
      }
    }
    if (radiusMax) {
      radiusMax.textContent = `(max ${maxRadius})`;
    }
  }

  /**
   * Update dimensions display
   */
  updateDimensions() {
    const dimsEl = this.element.querySelector("#borders-dimensions");
    if (dimsEl && this.originalSize) {
      const newWidth = this.originalSize.width + this.borderWidthH * 2;
      const newHeight = this.originalSize.height + this.borderWidthV * 2;
      dimsEl.textContent = `${this.originalSize.width}×${this.originalSize.height} → ${newWidth}×${newHeight}`;
    }
  }

  /**
   * Notify tool of settings change for preview
   */
  notifyChange() {
    if (this.onSettingsChange) {
      this.onSettingsChange({
        borderWidthH: this.borderWidthH,
        borderWidthV: this.borderWidthV,
        borderColour: this.borderColour,
        borderRadius: this.borderRadius,
        syncWidths: this.syncWidths,
      });
    }
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      borderWidthH: this.borderWidthH,
      borderWidthV: this.borderWidthV,
      borderColour: this.borderColour,
      borderRadius: this.borderRadius,
      syncWidths: this.syncWidths,
    };
  }
}
