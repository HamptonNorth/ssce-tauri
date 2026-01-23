/**
 * Clipboard Operations
 * Handles paste from clipboard, copy to clipboard, and flatten layers
 *
 * Uses native Tauri clipboard when available, falls back to browser Clipboard API.
 */

import { state, modules } from "./state.js";
import { showToast } from "./utils/toast.js";
import { getTextSize } from "./utils/config.js";
import * as tauriBridge from "./tauri-bridge.js";

// ============================================================================
// Clipboard Operations
// ============================================================================

/**
 * Handle paste from clipboard via menu or keyboard shortcut
 * Uses Tauri native clipboard in desktop app, browser API otherwise.
 * @param {Function} loadImageFile - Callback to load an image file
 * @param {Function} showPastePositionDialog - Callback to show paste position dialog
 */
export async function handlePasteFromClipboard(loadImageFile, showPastePositionDialog) {
  try {
    // Try Tauri native clipboard first
    if (tauriBridge.isTauri()) {
      const imageDataUrl = await tauriBridge.readImageFromClipboard();

      if (imageDataUrl) {
        await handlePastedImageDataUrl(imageDataUrl, loadImageFile, showPastePositionDialog);
        return;
      }

      // No image in native clipboard
      showToast("No image found in clipboard", "error");
      return;
    }

    // Fallback to browser Clipboard API
    const clipboardItems = await navigator.clipboard.read();

    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (type.startsWith("image/")) {
          const blob = await item.getType(type);
          const file = new File([blob], "pasted-image.png", { type });

          if (!modules.layerManager.hasLayers()) {
            // No image loaded - treat clipboard as the loaded image
            loadImageFile(file);
          } else {
            // Already have an image - prompt for position
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                state.pendingPasteImage = img;
                showPastePositionDialog();
              };
              img.src = e.target.result;
            };
            reader.readAsDataURL(file);
          }
          return;
        }
      }
    }

    showToast("No image found in clipboard", "error");
  } catch (err) {
    console.error("Paste error:", err);
    showToast("Failed to paste: " + err.message, "error");
  }
}

/**
 * Handle a pasted image from data URL
 * @param {string} dataUrl - Image data URL
 * @param {Function} loadImageFile - Callback to load an image file
 * @param {Function} showPastePositionDialog - Callback to show paste position dialog
 */
async function handlePastedImageDataUrl(dataUrl, loadImageFile, showPastePositionDialog) {
  const img = new Image();

  img.onload = () => {
    if (!modules.layerManager.hasLayers()) {
      // No image loaded - convert to file and load
      fetch(dataUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], "pasted-image.png", { type: "image/png" });
          loadImageFile(file);
        });
    } else {
      // Already have an image - prompt for position
      state.pendingPasteImage = img;
      showPastePositionDialog();
    }
  };

  img.onerror = () => {
    showToast("Failed to load pasted image", "error");
  };

  img.src = dataUrl;
}

/**
 * Handle copy to clipboard via menu or keyboard shortcut
 * Uses Tauri native clipboard in desktop app, browser API otherwise.
 */
export async function handleCopyToClipboard() {
  if (!modules.layerManager.hasLayers()) {
    showToast("Nothing to copy", "error");
    return;
  }

  try {
    const imageData = modules.canvasManager.toDataURL();

    // Try Tauri native clipboard first
    if (tauriBridge.isTauri()) {
      const success = await tauriBridge.writeImageToClipboard(imageData);

      if (success) {
        showToast("Image copied to clipboard", "success");
      } else {
        // Fall back to browser API
        await copyToClipboardBrowser(imageData);
      }
      return;
    }

    // Use browser Clipboard API
    await copyToClipboardBrowser(imageData);
  } catch (err) {
    console.error("Copy error:", err);
    showToast("Failed to copy: " + err.message, "error");
  }
}

/**
 * Copy image to clipboard using browser Clipboard API
 * @param {string} imageData - Image data URL
 */
async function copyToClipboardBrowser(imageData) {
  // Convert data URL to blob
  const response = await fetch(imageData);
  const blob = await response.blob();

  // Copy to clipboard
  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);

  showToast("Image copied to clipboard", "success");
}

/**
 * Handle flatten layers - merge all layers into a single base image
 * @param {Function} updateStatusBar - Callback to update status bar
 * @param {Function} updateUndoRedoButtons - Callback to update undo/redo buttons
 */
export async function handleFlatten(updateStatusBar, updateUndoRedoButtons) {
  if (!modules.layerManager.hasLayers()) {
    showToast("Nothing to flatten", "error");
    return;
  }

  const layers = modules.layerManager.getLayers();

  // If only one layer (base image), nothing to flatten
  if (layers.length <= 1) {
    showToast("Only one layer - nothing to flatten", "error");
    return;
  }

  // Get current canvas as data URL
  const flattenedDataURL = modules.canvasManager.toDataURL();

  // Create new image from flattened canvas
  const img = new Image();
  img.onload = () => {
    // Clear all layers and replace with single flattened image
    modules.layerManager.clear();
    modules.layerManager.addImageLayer(img);

    // Mark as having unsaved changes
    state.hasUnsavedChanges = true;
    updateStatusBar();
    updateUndoRedoButtons();

    // Render
    modules.canvasManager.render();

    // Update zoom button after flattening
    import("./utils/zoom.js").then((zoom) => {
      zoom.updateZoomButton();
    });

    showToast("Layers flattened successfully", "success");
  };
  img.src = flattenedDataURL;
}

/**
 * Helper: Get text font size from size name
 */
function getTextFontSize(size) {
  return getTextSize(size).fontSize;
}

/**
 * Helper: Get step font size from size name
 */
function getStepFontSize(size) {
  return getTextSize(size).fontSize;
}

/**
 * Helper: Get symbol font size from size name
 */
function getSymbolFontSize(size) {
  return getTextSize(size).fontSize;
}

/**
 * Handle flatten selected layers - merge selected layers into a single image layer
 * @param {Function} updateStatusBar - Callback to update status bar
 * @param {Function} updateUndoRedoButtons - Callback to update undo/redo buttons
 */
export async function handleFlattenSelected(updateStatusBar, updateUndoRedoButtons) {
  // Check if select tool is active and has selection
  if (state.currentTool !== "select" || !modules.selectTool.hasSelection()) {
    showToast("No layers selected. Switch to Select tool and select layers first.", "warning");
    return;
  }

  const selectedIndices = modules.selectTool.selectedLayerIndices;

  // Need at least 2 layers to flatten
  if (selectedIndices.length < 2) {
    showToast("Select at least 2 layers to flatten", "warning");
    return;
  }

  const layers = modules.layerManager.getLayers();
  const canvasSize = modules.canvasManager.getSize();

  // Calculate bounding box of selected layers first
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  selectedIndices.forEach((idx) => {
    const layer = layers[idx];

    // Update bounding box based on layer type
    if (layer.type === "arrow" || layer.type === "line") {
      minX = Math.min(minX, layer.data.startX, layer.data.endX);
      minY = Math.min(minY, layer.data.startY, layer.data.endY);
      maxX = Math.max(maxX, layer.data.startX, layer.data.endX);
      maxY = Math.max(maxY, layer.data.startY, layer.data.endY);
    } else if (layer.type === "image") {
      const imgX = layer.data.x || 0;
      const imgY = layer.data.y || 0;
      minX = Math.min(minX, imgX);
      minY = Math.min(minY, imgY);
      maxX = Math.max(maxX, imgX + layer.data.width);
      maxY = Math.max(maxY, imgY + layer.data.height);
    } else if (layer.type === "shape") {
      minX = Math.min(minX, layer.data.x);
      minY = Math.min(minY, layer.data.y);
      maxX = Math.max(maxX, layer.data.x + layer.data.width);
      maxY = Math.max(maxY, layer.data.y + layer.data.height);
    } else if (layer.type === "text") {
      // Calculate actual text bounds using canvas measureText
      const ctx = modules.canvasManager.ctx;
      const fontSize = getTextFontSize(layer.data.size);
      ctx.font = `${fontSize}px sans-serif`;

      const lines = layer.data.text.split("\n");
      const lineHeight = fontSize * 1.2;
      let maxWidth = 0;

      for (const line of lines) {
        const metrics = ctx.measureText(line);
        if (metrics.width > maxWidth) {
          maxWidth = metrics.width;
        }
      }

      minX = Math.min(minX, layer.data.x);
      minY = Math.min(minY, layer.data.y);
      maxX = Math.max(maxX, layer.data.x + maxWidth);
      maxY = Math.max(maxY, layer.data.y + lines.length * lineHeight);
    } else if (layer.type === "step" || layer.type === "symbol") {
      // For step/symbol, measure the single character
      const ctx = modules.canvasManager.ctx;
      const fontSize = layer.type === "step" ? getStepFontSize(layer.data.size) : getSymbolFontSize(layer.data.size);
      ctx.font = `${fontSize}px sans-serif`;
      const metrics = ctx.measureText(layer.data.symbol);

      minX = Math.min(minX, layer.data.x);
      minY = Math.min(minY, layer.data.y);
      maxX = Math.max(maxX, layer.data.x + metrics.width);
      maxY = Math.max(maxY, layer.data.y + fontSize);
    }
  });

  // Add padding to bounding box
  const padding = 5;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(canvasSize.width, maxX + padding);
  maxY = Math.min(canvasSize.height, maxY + padding);

  const boundWidth = Math.ceil(maxX - minX);
  const boundHeight = Math.ceil(maxY - minY);

  // Create temporary canvas sized to bounding box
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = boundWidth;
  tempCanvas.height = boundHeight;
  const tempCtx = tempCanvas.getContext("2d");

  // Translate context to account for offset, then render layers
  tempCtx.save();
  tempCtx.translate(-minX, -minY);

  // Render layers in z-order (lowest index first = bottom, highest index last = top)
  const sortedIndices = [...selectedIndices].sort((a, b) => a - b);
  sortedIndices.forEach((idx) => {
    const layer = layers[idx];
    modules.canvasManager.renderLayerToContext(tempCtx, layer);
  });

  tempCtx.restore();

  // Get flattened image as data URL
  const flattenedDataURL = tempCanvas.toDataURL();

  // Create new image from flattened selected layers
  const img = new Image();
  img.onload = () => {
    // Remove selected layers (in reverse order to maintain indices)
    const sortedIndices = [...selectedIndices].sort((a, b) => b - a);
    sortedIndices.forEach((idx) => {
      layers.splice(idx, 1);
    });

    // Add flattened image as new layer at position of lowest selected index
    const insertPosition = Math.min(...selectedIndices);
    const flattenedLayer = {
      type: "image",
      id: modules.layerManager.generateId(),
      data: {
        image: img,
        x: minX,
        y: minY,
        width: img.width,
        height: img.height,
      },
    };

    // Insert at the position of the first selected layer
    layers.splice(insertPosition, 0, flattenedLayer);

    // Clear selection
    modules.selectTool.selectedLayerIndices = [];

    // Mark as having unsaved changes
    state.hasUnsavedChanges = true;
    updateStatusBar();
    updateUndoRedoButtons();

    // Render
    modules.canvasManager.render();

    showToast(`${selectedIndices.length} layers flattened successfully`, "success");
  };
  img.src = flattenedDataURL;
}
