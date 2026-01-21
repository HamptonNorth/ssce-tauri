/**
 * Colour Palette UI
 * Handles colour swatch rendering and selection
 */

import { state, persistState } from "../state.js";
import { getPaletteColours } from "../utils/colours.js";

// ============================================================================
// Colour Palette
// ============================================================================

/**
 * Initialize the colour palette UI with swatches from config
 * @param {Function} showColourPickerDialog - Callback to show colour picker dialog
 * @deprecated Toolbar colour palette removed - colours now in property cards
 */
export function initColourPalette(showColourPickerDialog) {
  const palette = document.getElementById("colour-palette");

  // Palette element removed from toolbar - colours now in property cards
  if (!palette) {
    // Just update line style previews with current color
    updateLineStylePreviews(state.currentColour);
    return;
  }

  const colours = getPaletteColours();
  const colourNames = ["White", "Black", "Red", "Green", "Blue", "Yellow"];
  palette.innerHTML = "";

  colours.forEach((hex, index) => {
    const name = colourNames[index] || `Colour ${index + 1}`;
    const swatch = document.createElement("button");
    swatch.className = "colour-swatch";
    swatch.style.backgroundColor = hex;
    swatch.dataset.colour = hex;
    swatch.title = name;

    // Mark red as active by default
    if (hex === state.currentColour) {
      swatch.classList.add("active");
    }

    swatch.addEventListener("click", () => selectColour(hex));
    palette.appendChild(swatch);
  });

  // Add last custom color as 7th option (if exists)
  if (state.lastCustomColour) {
    const customSwatch = document.createElement("button");
    customSwatch.className = "colour-swatch";
    customSwatch.style.backgroundColor = state.lastCustomColour;
    customSwatch.dataset.colour = state.lastCustomColour;
    customSwatch.title = "Last Custom Colour";
    customSwatch.id = "last-custom-swatch";

    if (state.lastCustomColour === state.currentColour) {
      customSwatch.classList.add("active");
    }

    customSwatch.addEventListener("click", () => selectColour(state.lastCustomColour));
    palette.appendChild(customSwatch);
  }

  // Add color picker button as 8th option
  const pickerBtn = document.createElement("button");
  pickerBtn.className = "colour-swatch colour-picker-btn";
  pickerBtn.title = "Custom Colour Picker";
  pickerBtn.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  `;
  pickerBtn.addEventListener("click", showColourPickerDialog);
  palette.appendChild(pickerBtn);

  // Initialize line style preview colors with current color
  updateLineStylePreviews(state.currentColour);
}

/**
 * Update line style preview colors
 * @param {string} hex - Hex color code
 */
function updateLineStylePreviews(hex) {
  const solidPreview = document.querySelector(".line-style-preview-solid");
  if (solidPreview) {
    solidPreview.style.backgroundColor = hex;
  }

  const dashedPreview = document.querySelector(".line-style-preview-dashed line");
  if (dashedPreview) {
    dashedPreview.setAttribute("stroke", hex);
  }

  const dottedPreview = document.querySelector(".line-style-preview-dotted line");
  if (dottedPreview) {
    dottedPreview.setAttribute("stroke", hex);
  }
}

/**
 * Select a colour from the palette
 * @param {string} hex - Hex color code
 */
export function selectColour(hex) {
  state.currentColour = hex;
  persistState("currentColour", hex);

  // Update color indicator in toolbar
  const indicator = document.getElementById("current-colour-indicator");
  if (indicator) {
    indicator.style.backgroundColor = hex;
  }

  // Check if this is a preset color or custom color
  let isPresetColor = false;

  // Update UI
  document.querySelectorAll(".colour-swatch").forEach((swatch) => {
    const isActive = swatch.dataset.colour === hex;
    swatch.classList.toggle("active", isActive);
    if (isActive && swatch.dataset.colour) {
      isPresetColor = true;
    }
  });

  // If custom color, highlight the picker button and show the color
  const pickerBtn = document.querySelector(".colour-picker-btn");
  if (pickerBtn) {
    if (!isPresetColor) {
      pickerBtn.classList.add("active");
      // Show custom color as background
      pickerBtn.style.background = hex;
    } else {
      // Reset to rainbow gradient
      pickerBtn.style.background = "";
    }
  }

  // Update line style previews with current color
  updateLineStylePreviews(hex);

  // Close color menu
  const colourMenu = document.getElementById("colour-menu");
  if (colourMenu) {
    colourMenu.classList.add("hidden");
  }
}
