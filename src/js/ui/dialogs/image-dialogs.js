/**
 * Image Operation Dialogs
 *
 * Dialogs for image manipulation: Resize, Print, Paste Position, and Combine.
 *
 * Exports:
 * - initImageDialogs(callbacks) - Initialize image dialog event handlers
 * - showResizeDialog() - Show the canvas resize dialog
 * - showPrintDialog() - Show the print options dialog
 * - showPastePositionDialog() - Show paste position dialog
 * - showCombineDialog() - Show image combine position dialog
 */

import { state, modules } from "../../state.js";
import { printImage } from "../../utils/export.js";
import { showToast } from "../../utils/toast.js";
import { showConfirmModal } from "./alert-confirm.js";

// Callback storage for image dialogs
let callbacks = {
  updateStatusBar: null,
  updateUndoRedoButtons: null,
};

// Track which dimension was last edited for aspect ratio calculations
let resizeLastEdited = null;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize image dialog event handlers
 *
 * @param {Object} options - Callback functions
 * @param {Function} options.updateStatusBar - Update the status bar display
 * @param {Function} options.updateUndoRedoButtons - Update undo/redo button states
 */
export function initImageDialogs(options) {
  callbacks = { ...callbacks, ...options };

  // Resize dialog
  const resizeDialog = document.getElementById("dialog-resize");
  document.getElementById("resize-cancel").addEventListener("click", () => resizeDialog.close());
  resizeDialog.addEventListener("submit", handleResizeSubmit);
  // ESC key to close resize dialog
  resizeDialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      resizeDialog.close();
    }
  });
  initResizeAddMode();

  // Anchor buttons for resize
  document.querySelectorAll(".anchor-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".anchor-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Print dialog
  const printDialog = document.getElementById("dialog-print");
  document.getElementById("print-cancel").addEventListener("click", () => printDialog.close());
  document.getElementById("print-preview").addEventListener("click", () => {
    printDialog.close();
    window.print();
  });
  printDialog.addEventListener("submit", handlePrintSubmit);

  // Combine dialog
  const combineDialog = document.getElementById("dialog-combine");
  document.getElementById("combine-cancel").addEventListener("click", () => combineDialog.close());
  document.querySelectorAll(".position-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      combineDialog.close();
      modules.combineTool.positionSecondImage(btn.dataset.position);
    });
  });

  // Paste Position dialog
  const pastePositionDialog = document.getElementById("dialog-paste-position");
  document.getElementById("paste-cancel").addEventListener("click", () => {
    pastePositionDialog.close();
    state.pendingPasteImage = null;
    cleanupPasteClickListener();
  });
  pastePositionDialog.addEventListener("submit", handlePastePositionSubmit);

  // Paste method tabs
  document.querySelectorAll(".paste-method-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const method = tab.dataset.method;
      switchPasteMethod(method);
    });
  });

  // Paste edge selection change
  document.getElementById("paste-edge").addEventListener("change", updatePasteAlignmentOptions);

  // Initialize alignment options
  updatePasteAlignmentOptions();
}

// ============================================================================
// Resize Dialog
// ============================================================================

/**
 * Show the canvas resize dialog
 * Pre-populates with current canvas dimensions
 */
export function showResizeDialog() {
  const dialog = document.getElementById("dialog-resize");
  const size = modules.canvasManager.getSize();
  const addModeCheckbox = document.getElementById("resize-add-mode");
  const keepRatioCheckbox = document.getElementById("resize-keep-ratio");
  const widthInput = document.getElementById("resize-width");
  const heightInput = document.getElementById("resize-height");

  // Reset last edited tracker
  resizeLastEdited = null;

  // Set initial values based on add mode
  if (addModeCheckbox.checked) {
    widthInput.value = 0;
    heightInput.value = 0;
  } else {
    widthInput.value = size.width;
    heightInput.value = size.height;
  }

  // Disable keep ratio if add mode is active (doesn't make sense together)
  keepRatioCheckbox.disabled = addModeCheckbox.checked;
  if (addModeCheckbox.checked) {
    keepRatioCheckbox.checked = false;
  }

  dialog.showModal();
}

/**
 * Initialize resize dialog checkbox behaviors and input listeners
 * Sets up the "add mode" and "keep ratio" checkbox interactions
 */
function initResizeAddMode() {
  const addModeCheckbox = document.getElementById("resize-add-mode");
  const keepRatioCheckbox = document.getElementById("resize-keep-ratio");
  const widthInput = document.getElementById("resize-width");
  const heightInput = document.getElementById("resize-height");

  // Helper to set/remove min attribute based on add mode
  const updateInputConstraints = (isAddMode) => {
    if (isAddMode) {
      widthInput.min = "0";
      heightInput.min = "0";
    } else {
      widthInput.removeAttribute("min");
      heightInput.removeAttribute("min");
    }
  };

  // Set initial constraints based on current add mode state
  updateInputConstraints(addModeCheckbox.checked);

  // Add mode checkbox change
  addModeCheckbox.addEventListener("change", () => {
    const size = modules.canvasManager.getSize();
    if (addModeCheckbox.checked) {
      // Switch to add mode: zero out fields, disable keep ratio, enforce min=0
      widthInput.value = 0;
      heightInput.value = 0;
      keepRatioCheckbox.disabled = true;
      keepRatioCheckbox.checked = false;
      updateInputConstraints(true);
    } else {
      // Switch to absolute mode: show current dimensions, enable keep ratio, remove min
      widthInput.value = size.width;
      heightInput.value = size.height;
      keepRatioCheckbox.disabled = false;
      updateInputConstraints(false);
    }
    resizeLastEdited = null;
  });

  // Width input change - update height if keep ratio is checked
  widthInput.addEventListener("input", () => {
    resizeLastEdited = "width";
    if (keepRatioCheckbox.checked && !addModeCheckbox.checked) {
      const size = modules.canvasManager.getSize();
      const aspectRatio = size.width / size.height;
      const newWidth = parseInt(widthInput.value) || 0;
      if (newWidth > 0) {
        heightInput.value = Math.round(newWidth / aspectRatio);
      }
    }
  });

  // Height input change - update width if keep ratio is checked
  heightInput.addEventListener("input", () => {
    resizeLastEdited = "height";
    if (keepRatioCheckbox.checked && !addModeCheckbox.checked) {
      const size = modules.canvasManager.getSize();
      const aspectRatio = size.width / size.height;
      const newHeight = parseInt(heightInput.value) || 0;
      if (newHeight > 0) {
        widthInput.value = Math.round(newHeight * aspectRatio);
      }
    }
  });

  // Keep ratio checkbox change - recalculate based on last edited field
  keepRatioCheckbox.addEventListener("change", () => {
    if (keepRatioCheckbox.checked && !addModeCheckbox.checked) {
      const size = modules.canvasManager.getSize();
      const aspectRatio = size.width / size.height;

      if (resizeLastEdited === "width") {
        const newWidth = parseInt(widthInput.value) || 0;
        if (newWidth > 0) {
          heightInput.value = Math.round(newWidth / aspectRatio);
        }
      } else if (resizeLastEdited === "height") {
        const newHeight = parseInt(heightInput.value) || 0;
        if (newHeight > 0) {
          widthInput.value = Math.round(newHeight * aspectRatio);
        }
      }
      // If neither was edited, leave both as-is
    }
  });
}

/**
 * Handle resize dialog form submission
 * Validates dimensions, warns about scaling down, and performs resize
 */
async function handleResizeSubmit(e) {
  e.preventDefault();

  const addMode = document.getElementById("resize-add-mode").checked;
  let width = parseInt(document.getElementById("resize-width").value) || 0;
  let height = parseInt(document.getElementById("resize-height").value) || 0;

  // In add mode, clamp negative values to 0 and add to current dimensions
  if (addMode) {
    width = Math.max(0, width);
    height = Math.max(0, height);
    const currentSize = modules.canvasManager.getSize();
    width = currentSize.width + width;
    height = currentSize.height + height;
  }

  if (width > 0 && height > 0) {
    // Get resize limits from config
    const warningLimit = state.config?.resizeWarningTrigger || 1920;
    const errorLimit = state.config?.resizeErrorTrigger || 3840;

    // Hard error if exceeds 4K
    if (width > errorLimit || height > errorLimit) {
      showToast(`Canvas size cannot exceed ${errorLimit}px in either dimension`, "error");
      return;
    }

    // Warning if exceeds Full HD
    if (width > warningLimit || height > warningLimit) {
      const proceed = await showConfirmModal("Large Canvas Warning", `Canvas size exceeds ${warningLimit}px which may affect performance.\n\nAre you sure you want to continue?`, { confirmText: "Continue Anyway", cancelText: "Cancel", type: "warning" });
      if (!proceed) return;
    }

    // Warn about scaling down (loses detail)
    const currentSize = modules.canvasManager.getSize();
    if (width < currentSize.width || height < currentSize.height) {
      const proceed = await showConfirmModal("Scale Down", `This will scale the image from ${currentSize.width}×${currentSize.height} to ${width}×${height}.\n\nScaling down will reduce image detail.`, { confirmText: "Resize", cancelText: "Cancel", type: "warning" });
      if (!proceed) return;
    }

    // Flatten and scale image
    const { flattenToImage, replaceWithImage } = await import("../../utils/image-ops.js");

    // Flatten all layers to single image
    const flatImage = await flattenToImage(modules.canvasManager, modules.layerManager);

    // Create scaled canvas
    const scaledCanvas = document.createElement("canvas");
    scaledCanvas.width = width;
    scaledCanvas.height = height;
    const scaledCtx = scaledCanvas.getContext("2d");

    // Draw scaled image
    scaledCtx.drawImage(flatImage, 0, 0, width, height);

    // Convert to image
    const scaledImage = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = scaledCanvas.toDataURL("image/png");
    });

    // Replace all layers with scaled image
    replaceWithImage(modules.layerManager, modules.canvasManager, scaledImage);

    state.hasUnsavedChanges = true;
    callbacks.updateStatusBar();

    // Recalculate zoom after canvas resize (zoom to fit new size)
    import("../../utils/zoom.js").then((zoom) => {
      zoom.recalculateZoom();
    });

    showToast(`Resized to ${width} × ${height}`, "success");
  }

  document.getElementById("dialog-resize").close();
}

// ============================================================================
// Print Dialog
// ============================================================================

/**
 * Show the print options dialog
 */
export function showPrintDialog() {
  document.getElementById("dialog-print").showModal();
}

/**
 * Handle print dialog form submission
 */
function handlePrintSubmit(e) {
  e.preventDefault();
  const orientation = document.querySelector('input[name="orientation"]:checked').value;
  printImage(modules.canvasManager, orientation);
  document.getElementById("dialog-print").close();
}

// ============================================================================
// Combine Dialog
// ============================================================================

/**
 * Show the image combine position dialog
 * Used when combining two images to choose relative positioning
 */
export function showCombineDialog() {
  document.getElementById("dialog-combine").showModal();
}

// ============================================================================
// Paste Position Dialog
// ============================================================================

/**
 * Show paste position dialog
 * Allows user to specify where to paste an image from clipboard
 */
export function showPastePositionDialog() {
  const dialog = document.getElementById("dialog-paste-position");
  document.getElementById("paste-x").value = 0;
  document.getElementById("paste-y").value = 0;

  // Reset to manual method
  state.pasteMethod = "manual";
  state.pasteClickPosition = null;
  switchPasteMethod("manual");

  dialog.showModal();
}

/**
 * Switch between paste positioning methods (manual, click, relative)
 * @param {string} method - The method to switch to
 */
function switchPasteMethod(method) {
  state.pasteMethod = method;

  // Update tab UI
  document.querySelectorAll(".paste-method-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.method === method);
  });

  // Show/hide panels
  document.querySelectorAll(".paste-panel").forEach((panel) => {
    panel.classList.add("hidden");
  });
  document.getElementById(`paste-panel-${method}`).classList.remove("hidden");

  // Handle click method activation
  if (method === "click") {
    activatePasteClickMode();
  } else {
    cleanupPasteClickListener();
  }
}

/**
 * Update alignment options based on selected edge
 * Changes options between left/middle/right or top/middle/bottom
 */
function updatePasteAlignmentOptions() {
  const edge = document.getElementById("paste-edge").value;
  const alignmentSelect = document.getElementById("paste-alignment");

  let options = [];

  if (edge === "top" || edge === "bottom") {
    // Horizontal alignment for top/bottom edges
    options = [
      { value: "left", label: "Left" },
      { value: "middle", label: "Middle" },
      { value: "right", label: "Right" },
    ];
  } else {
    // Vertical alignment for left/right edges
    options = [
      { value: "top", label: "Top" },
      { value: "middle", label: "Middle" },
      { value: "bottom", label: "Bottom" },
    ];
  }

  // Populate options
  alignmentSelect.innerHTML = options.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join("");
}

/**
 * Activate click mode for paste positioning
 * Temporarily closes dialog and waits for canvas right-click
 */
function activatePasteClickMode() {
  if (state.pasteClickListenerActive) return;

  state.pasteClickListenerActive = true;

  // Hide the dialog temporarily
  const dialog = document.getElementById("dialog-paste-position");
  dialog.close();

  // Add right-click listener to canvas
  const canvas = document.getElementById("main-canvas");
  canvas.addEventListener("contextmenu", handlePasteRightClick);

  // Show instruction
  showToast("Right-click on canvas to set paste position", "success", 3000);
}

/**
 * Handle right-click on canvas for paste positioning
 * @param {MouseEvent} e - The context menu event
 */
function handlePasteRightClick(e) {
  e.preventDefault();

  const pos = modules.canvasManager.getMousePos(e);
  state.pasteClickPosition = { x: Math.floor(pos.x), y: Math.floor(pos.y) };

  // Update display
  document.getElementById("click-position-display").textContent = `X: ${state.pasteClickPosition.x}, Y: ${state.pasteClickPosition.y}`;

  // Cleanup listener first
  cleanupPasteClickListener();

  // Reopen dialog
  const dialog = document.getElementById("dialog-paste-position");
  dialog.showModal();

  showToast(`Position set: (${state.pasteClickPosition.x}, ${state.pasteClickPosition.y})`, "success", 2000);
}

/**
 * Remove paste click listener from canvas
 */
function cleanupPasteClickListener() {
  if (!state.pasteClickListenerActive) return;

  state.pasteClickListenerActive = false;

  const canvas = document.getElementById("main-canvas");
  canvas.removeEventListener("contextmenu", handlePasteRightClick);
}

/**
 * Handle paste position dialog form submission
 * Calculates position and adds image layer at specified location
 */
function handlePastePositionSubmit(e) {
  e.preventDefault();

  if (!state.pendingPasteImage) {
    console.error("No pending paste image");
    return;
  }

  // Calculate position based on selected method
  let x, y;

  switch (state.pasteMethod) {
    case "manual":
      x = parseInt(document.getElementById("paste-x").value) || 0;
      y = parseInt(document.getElementById("paste-y").value) || 0;
      break;

    case "click":
      if (!state.pasteClickPosition) {
        showToast("Please right-click on canvas to set position", "error");
        return;
      }
      x = state.pasteClickPosition.x;
      y = state.pasteClickPosition.y;
      break;

    case "relative":
      const relativePos = calculateRelativePosition();
      x = relativePos.x;
      y = relativePos.y;
      break;

    default:
      x = 0;
      y = 0;
  }

  // Get the image to paste
  const img = state.pendingPasteImage;
  const imgWidth = img.width;
  const imgHeight = img.height;

  // Get current canvas size
  const currentSize = modules.canvasManager.getSize();

  // Calculate if we need to expand the canvas
  const requiredWidth = Math.max(currentSize.width, x + imgWidth);
  const requiredHeight = Math.max(currentSize.height, y + imgHeight);

  // Save undo state BEFORE expanding canvas (so undo restores original size)
  modules.layerManager.saveUndoState();

  // Expand canvas if needed
  if (requiredWidth > currentSize.width || requiredHeight > currentSize.height) {
    modules.canvasManager.setSize(requiredWidth, requiredHeight);
  }

  // Add the image layer at the specified position (skipUndo since we already saved)
  modules.layerManager.addLayerDirect(img, x, y);

  // Mark as having unsaved changes
  state.hasUnsavedChanges = true;
  callbacks.updateStatusBar();
  callbacks.updateUndoRedoButtons();

  // Clear pending image and cleanup
  state.pendingPasteImage = null;
  state.pasteClickPosition = null;
  cleanupPasteClickListener();

  // Close dialog
  document.getElementById("dialog-paste-position").close();

  // Render the canvas
  modules.canvasManager.render();
}

/**
 * Calculate position based on relative positioning (edge + alignment)
 * @returns {{x: number, y: number}} The calculated position
 */
function calculateRelativePosition() {
  const edge = document.getElementById("paste-edge").value;
  const alignment = document.getElementById("paste-alignment").value;

  const img = state.pendingPasteImage;
  const imgWidth = img.width;
  const imgHeight = img.height;

  const currentSize = modules.canvasManager.getSize();
  const canvasWidth = currentSize.width;
  const canvasHeight = currentSize.height;

  let x = 0;
  let y = 0;

  switch (edge) {
    case "top":
      y = 0;
      // Horizontal alignment
      if (alignment === "left") x = 0;
      else if (alignment === "middle") x = Math.floor((canvasWidth - imgWidth) / 2);
      else if (alignment === "right") x = canvasWidth - imgWidth;
      break;

    case "bottom":
      y = canvasHeight;
      // Horizontal alignment
      if (alignment === "left") x = 0;
      else if (alignment === "middle") x = Math.floor((canvasWidth - imgWidth) / 2);
      else if (alignment === "right") x = canvasWidth - imgWidth;
      break;

    case "left":
      x = 0;
      // Vertical alignment
      if (alignment === "top") y = 0;
      else if (alignment === "middle") y = Math.floor((canvasHeight - imgHeight) / 2);
      else if (alignment === "bottom") y = canvasHeight - imgHeight;
      break;

    case "right":
      x = canvasWidth;
      // Vertical alignment
      if (alignment === "top") y = 0;
      else if (alignment === "middle") y = Math.floor((canvasHeight - imgHeight) / 2);
      else if (alignment === "bottom") y = canvasHeight - imgHeight;
      break;
  }

  return { x, y };
}
