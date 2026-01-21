/**
 * Colour Picker Dialogs
 *
 * Dialogs for colour selection: main colour picker and shape fill colour picker.
 * Both include palette swatches, custom hex input, and eyedropper functionality.
 *
 * Exports:
 * - initColourDialogs() - Initialize colour dialog event handlers
 * - showColourPickerDialog() - Show the main colour picker dialog
 * - showShapeFillPickerDialog() - Show the shape fill colour picker dialog
 */

import { state, modules, persistState } from "../../state.js";
import { showToast } from "../../utils/toast.js";
import { initColourPalette, selectColour } from "../colour-palette.js";
import { getPaletteColours } from "../../utils/colours.js";

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize colour dialog event handlers
 */
export function initColourDialogs() {
  // Main Colour Picker dialog
  const colourPickerDialog = document.getElementById("dialog-colour-picker");
  const colourPickerInput = document.getElementById("colour-picker-input");
  const colourHexInput = document.getElementById("colour-hex-input");

  document.getElementById("colour-picker-cancel").addEventListener("click", () => colourPickerDialog.close());

  // Sync color picker and hex input
  colourPickerInput.addEventListener("input", (e) => {
    colourHexInput.value = e.target.value.toUpperCase();
  });

  colourHexInput.addEventListener("input", (e) => {
    const hex = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      colourPickerInput.value = hex;
    }
  });

  // Eyedropper button
  document.getElementById("eyedropper-btn").addEventListener("click", activateEyedropper);

  colourPickerDialog.addEventListener("submit", handleColourPickerSubmit);

  // Shape Fill Colour Picker dialog
  const shapeFillPickerDialog = document.getElementById("dialog-shape-fill-picker");
  const shapeFillPickerInput = document.getElementById("shape-fill-picker-input");
  const shapeFillHexInput = document.getElementById("shape-fill-hex-input");

  document.getElementById("shape-fill-picker-cancel").addEventListener("click", () => shapeFillPickerDialog.close());

  // Sync color picker and hex input
  shapeFillPickerInput.addEventListener("input", (e) => {
    shapeFillHexInput.value = e.target.value.toUpperCase();
  });

  shapeFillHexInput.addEventListener("input", (e) => {
    const value = e.target.value.toLowerCase();
    if (value === "transparent") {
      // Allow "transparent" text
      return;
    }
    const hex = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      shapeFillPickerInput.value = hex;
    }
  });

  // Eyedropper button for shape fill
  document.getElementById("shape-fill-eyedropper-btn").addEventListener("click", () => {
    activateShapeFillEyedropper();
  });

  shapeFillPickerDialog.addEventListener("submit", handleShapeFillPickerSubmit);
}

// ============================================================================
// Main Colour Picker Dialog
// ============================================================================

/**
 * Show the main colour picker dialog
 * Used for selecting annotation colours (arrows, text, etc.)
 */
export function showColourPickerDialog() {
  const dialog = document.getElementById("dialog-colour-picker");
  const colourPickerInput = document.getElementById("colour-picker-input");
  const colourHexInput = document.getElementById("colour-hex-input");

  // Set to current colour
  colourPickerInput.value = state.currentColour;
  colourHexInput.value = state.currentColour.toUpperCase();

  dialog.showModal();
}

/**
 * Handle main colour picker dialog form submission
 */
function handleColourPickerSubmit(e) {
  e.preventDefault();
  const colourHexInput = document.getElementById("colour-hex-input");
  const hex = colourHexInput.value.toUpperCase();

  // Validate hex colour
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    // Save as last custom colour and persist to localStorage
    state.lastCustomColour = hex;
    persistState("lastCustomColour", hex);

    // Refresh palette to show the new custom color
    initColourPalette(showColourPickerDialog);

    // Select the color
    selectColour(hex);
  }

  document.getElementById("dialog-colour-picker").close();
}

// ============================================================================
// Shape Fill Colour Picker Dialog
// ============================================================================

/**
 * Show the shape fill colour picker dialog
 * Includes palette swatches, custom picker, and transparent option
 */
export function showShapeFillPickerDialog() {
  const dialog = document.getElementById("dialog-shape-fill-picker");
  const shapeFillPickerInput = document.getElementById("shape-fill-picker-input");
  const shapeFillHexInput = document.getElementById("shape-fill-hex-input");
  const palette = document.getElementById("shape-fill-palette");

  // Populate colour palette (6 base colours + last custom + transparent)
  palette.innerHTML = "";

  // Get base colours from config/defaults.js
  const colours = getPaletteColours();
  const colourNames = ["White", "Black", "Red", "Green", "Blue", "Yellow"];

  // Add 6 base colour swatches
  colours.forEach((hex, index) => {
    const name = colourNames[index] || `Colour ${index + 1}`;
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "w-12 h-12 rounded border-2 border-gray-600 hover:border-blue-400 transition-colors";
    swatch.style.backgroundColor = hex;
    swatch.title = name;
    swatch.addEventListener("click", () => {
      selectShapeFillColour(hex);
    });
    palette.appendChild(swatch);
  });

  // Add last custom colour swatch (if exists)
  if (state.lastCustomColour) {
    const customSwatch = document.createElement("button");
    customSwatch.type = "button";
    customSwatch.className = "w-12 h-12 rounded border-2 border-gray-600 hover:border-blue-400 transition-colors";
    customSwatch.style.backgroundColor = state.lastCustomColour;
    customSwatch.title = "Last Custom Colour";
    customSwatch.addEventListener("click", () => {
      selectShapeFillColour(state.lastCustomColour);
    });
    palette.appendChild(customSwatch);
  }

  // Add transparent swatch (checkerboard pattern)
  const transparentSwatch = document.createElement("button");
  transparentSwatch.type = "button";
  transparentSwatch.className = "w-12 h-12 rounded border-2 border-gray-600 hover:border-blue-400 transition-colors";
  transparentSwatch.style.background = "transparent";
  transparentSwatch.style.backgroundImage = "linear-gradient(45deg, #555 25%, transparent 25%), linear-gradient(-45deg, #555 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #555 75%), linear-gradient(-45deg, transparent 75%, #555 75%)";
  transparentSwatch.style.backgroundSize = "8px 8px";
  transparentSwatch.style.backgroundPosition = "0 0, 0 4px, 4px -4px, -4px 0px";
  transparentSwatch.title = "Transparent (No Fill)";
  transparentSwatch.addEventListener("click", () => {
    selectShapeFillColour("transparent");
  });
  palette.appendChild(transparentSwatch);

  // Set to current fill colour in custom picker
  if (state.shapeFillColour === "transparent") {
    shapeFillHexInput.value = "";
    shapeFillPickerInput.value = "#FFFFFF"; // Default color picker value
  } else {
    shapeFillPickerInput.value = state.shapeFillColour;
    shapeFillHexInput.value = state.shapeFillColour.toUpperCase();
  }

  dialog.showModal();
}

/**
 * Select a shape fill colour and close the dialog
 * @param {string} colour - Hex colour or "transparent"
 */
function selectShapeFillColour(colour) {
  state.shapeFillColour = colour;
  persistState("shapeFillColour", colour);
  updateShapeFillIndicator(colour);

  // Close dialog
  document.getElementById("dialog-shape-fill-picker").close();

  // Show toast
  if (colour === "transparent") {
    showToast("Fill set to transparent", "success");
  } else {
    showToast(`Fill colour set to ${colour}`, "success");
  }
}

/**
 * Handle shape fill picker dialog form submission
 */
function handleShapeFillPickerSubmit(e) {
  e.preventDefault();
  const shapeFillHexInput = document.getElementById("shape-fill-hex-input");
  const value = shapeFillHexInput.value.trim();

  // Only process if user entered something
  if (value) {
    const hex = value.toUpperCase();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      state.shapeFillColour = hex;
      persistState("shapeFillColour", hex);
      updateShapeFillIndicator(hex);

      // Save as last custom colour
      state.lastCustomColour = hex;
      persistState("lastCustomColour", hex);

      showToast(`Fill colour set to ${hex}`, "success");
    } else {
      showToast("Invalid hex colour format", "error");
      return;
    }
  }

  document.getElementById("dialog-shape-fill-picker").close();
}

/**
 * Update the shape fill indicator in the UI
 * Shows solid colour or checkerboard pattern for transparent
 * @param {string} colour - Hex colour or "transparent"
 */
function updateShapeFillIndicator(colour) {
  const indicator = document.getElementById("shape-fill-indicator");
  if (!indicator) return;

  if (colour === "transparent") {
    // Show checkerboard pattern for transparent
    indicator.style.background = "transparent";
    indicator.style.backgroundImage = "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)";
    indicator.style.backgroundSize = "8px 8px";
    indicator.style.backgroundPosition = "0 0, 0 4px, 4px -4px, -4px 0px";
  } else {
    // Show solid color
    indicator.style.background = colour;
    indicator.style.backgroundImage = "none";
  }
}

// ============================================================================
// Eyedropper Functionality
// ============================================================================

/**
 * Activate eyedropper mode for main colour picker
 * Allows user to sample a colour from the canvas
 */
function activateEyedropper() {
  // Close the color picker dialog
  document.getElementById("dialog-colour-picker").close();

  // Set eyedropper mode
  state.eyedropperActive = true;

  // Change canvas cursor to crosshair
  const canvas = document.getElementById("main-canvas");
  canvas.style.cursor = "crosshair";

  // Add one-time click event listener
  canvas.addEventListener("click", handleEyedropperClick, { once: true });

  // Add escape key to cancel
  const escapeHandler = (e) => {
    if (e.key === "Escape") {
      deactivateEyedropper();
      document.removeEventListener("keydown", escapeHandler);
    }
  };
  document.addEventListener("keydown", escapeHandler);
}

/**
 * Deactivate eyedropper mode and restore cursor
 */
function deactivateEyedropper() {
  state.eyedropperActive = false;
  const canvas = document.getElementById("main-canvas");
  canvas.style.cursor = "";
}

/**
 * Handle eyedropper click on canvas for main colour picker
 * @param {MouseEvent} e - The click event
 */
function handleEyedropperClick(e) {
  const pos = modules.canvasManager.getMousePos(e);

  // Get pixel color from canvas
  const ctx = modules.canvasManager.getCanvas().getContext("2d");
  const imageData = ctx.getImageData(pos.x, pos.y, 1, 1);
  const pixel = imageData.data;

  // Convert RGB to hex
  const r = pixel[0];
  const g = pixel[1];
  const b = pixel[2];
  const hex =
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

  // Save as last custom colour and persist to localStorage
  state.lastCustomColour = hex;
  persistState("lastCustomColour", hex);

  // Refresh palette to show the new custom color
  initColourPalette(showColourPickerDialog);

  // Set the color
  selectColour(hex);

  // Deactivate eyedropper
  deactivateEyedropper();

  // Reopen color picker dialog with the picked color
  showColourPickerDialog();
}

/**
 * Activate eyedropper mode for shape fill colour picker
 */
function activateShapeFillEyedropper() {
  // Close the shape fill picker dialog
  document.getElementById("dialog-shape-fill-picker").close();

  // Set eyedropper mode
  state.eyedropperActive = true;

  // Change canvas cursor to crosshair
  const canvas = document.getElementById("main-canvas");
  canvas.style.cursor = "crosshair";

  // Add one-time click event listener
  canvas.addEventListener("click", handleShapeFillEyedropperClick, { once: true });

  // Add escape key to cancel
  const escapeHandler = (e) => {
    if (e.key === "Escape") {
      deactivateEyedropper();
      document.removeEventListener("keydown", escapeHandler);
    }
  };
  document.addEventListener("keydown", escapeHandler);
}

/**
 * Handle eyedropper click on canvas for shape fill colour
 * @param {MouseEvent} e - The click event
 */
function handleShapeFillEyedropperClick(e) {
  const pos = modules.canvasManager.getMousePos(e);

  // Get pixel color from canvas
  const ctx = modules.canvasManager.getCanvas().getContext("2d");
  const imageData = ctx.getImageData(pos.x, pos.y, 1, 1);
  const data = imageData.data;

  // Convert RGB to hex
  const r = data[0].toString(16).padStart(2, "0");
  const g = data[1].toString(16).padStart(2, "0");
  const b = data[2].toString(16).padStart(2, "0");
  const hex = `#${r}${g}${b}`.toUpperCase();

  // Set the shape fill color
  state.shapeFillColour = hex;
  persistState("shapeFillColour", hex);
  updateShapeFillIndicator(hex);

  // Save as last custom colour
  state.lastCustomColour = hex;
  persistState("lastCustomColour", hex);

  // Deactivate eyedropper
  deactivateEyedropper();

  // Show toast
  showToast(`Fill colour picked: ${hex}`, "success");

  // Reopen shape fill picker dialog
  showShapeFillPickerDialog();
}
