/**
 * Image Operations Utility
 * Shared functions for image manipulation operations.
 * Used by: crop tool, cut tool, edges tool
 */

/**
 * Flatten all canvas layers to a single ImageData
 * @param {CanvasManager} canvasManager - The canvas manager instance
 * @param {LayerManager} layerManager - The layer manager instance
 * @returns {ImageData} Flattened image data
 */
export function flattenToImageData(canvasManager, layerManager) {
  const canvas = canvasManager.getCanvas();
  const ctx = canvas.getContext("2d");

  // Render all layers to get current state
  canvasManager.render();

  // Get the full canvas as ImageData
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Flatten all canvas layers to a new Image element
 * @param {CanvasManager} canvasManager - The canvas manager instance
 * @param {LayerManager} layerManager - The layer manager instance
 * @returns {Promise<HTMLImageElement>} Promise resolving to flattened image
 */
export function flattenToImage(canvasManager, layerManager) {
  return new Promise((resolve, reject) => {
    const canvas = canvasManager.getCanvas();

    // Render all layers to get current state
    canvasManager.render();

    // Convert canvas to image
    const dataURL = canvas.toDataURL("image/png");
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

/**
 * Extract a region from ImageData
 * @param {ImageData} imageData - Source image data
 * @param {number} x - Left edge of region
 * @param {number} y - Top edge of region
 * @param {number} width - Width of region
 * @param {number} height - Height of region
 * @returns {ImageData} Extracted region
 */
export function extractRegion(imageData, x, y, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");

  // Put the source image data
  ctx.putImageData(imageData, 0, 0);

  // Extract the region
  return ctx.getImageData(x, y, width, height);
}

/**
 * Convert ImageData to an Image element
 * @param {ImageData} imageData - The image data to convert
 * @returns {Promise<HTMLImageElement>} Promise resolving to image element
 */
export function imageDataToImage(imageData) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(imageData, 0, 0);

    const dataURL = canvas.toDataURL("image/png");
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

/**
 * Calculate fade distance based on image size
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} proportion - Fade proportion (0.0 to 1.0, e.g., 0.05 = 5%)
 * @returns {number} Fade distance in pixels
 */
export function calculateFadeDistance(width, height, proportion = 0.05) {
  const minDimension = Math.min(width, height);
  return Math.round(minDimension * proportion);
}

/**
 * Apply a fade (alpha gradient) to an edge of ImageData
 * @param {ImageData} imageData - The image data to modify (mutated in place)
 * @param {string} edge - Edge to fade: 'top', 'bottom', 'left', 'right'
 * @param {number} fadeDistance - Distance of fade in pixels
 * @returns {ImageData} The modified image data (same reference)
 */
export function applyEdgeFade(imageData, edge, fadeDistance) {
  const { width, height, data } = imageData;

  if (fadeDistance <= 0) return imageData;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let alpha = 1.0;

      switch (edge) {
        case "top":
          if (y < fadeDistance) {
            alpha = y / fadeDistance;
          }
          break;
        case "bottom":
          if (y >= height - fadeDistance) {
            alpha = (height - 1 - y) / fadeDistance;
          }
          break;
        case "left":
          if (x < fadeDistance) {
            alpha = x / fadeDistance;
          }
          break;
        case "right":
          if (x >= width - fadeDistance) {
            alpha = (width - 1 - x) / fadeDistance;
          }
          break;
      }

      if (alpha < 1.0) {
        const idx = (y * width + x) * 4;
        // Multiply existing alpha by fade alpha
        data[idx + 3] = Math.round(data[idx + 3] * alpha);
      }
    }
  }

  return imageData;
}

/**
 * Apply corner fade (two adjacent edges) to ImageData
 * @param {ImageData} imageData - The image data to modify (mutated in place)
 * @param {string} corner - Corner to fade: 'tl', 'tr', 'bl', 'br'
 * @param {number} fadeDistance - Distance of fade in pixels
 * @returns {ImageData} The modified image data (same reference)
 */
export function applyCornerFade(imageData, corner, fadeDistance) {
  const { width, height, data } = imageData;

  if (fadeDistance <= 0) return imageData;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let alphaX = 1.0;
      let alphaY = 1.0;

      switch (corner) {
        case "tl": // top-left
          if (x < fadeDistance) alphaX = x / fadeDistance;
          if (y < fadeDistance) alphaY = y / fadeDistance;
          break;
        case "tr": // top-right
          if (x >= width - fadeDistance) alphaX = (width - 1 - x) / fadeDistance;
          if (y < fadeDistance) alphaY = y / fadeDistance;
          break;
        case "bl": // bottom-left
          if (x < fadeDistance) alphaX = x / fadeDistance;
          if (y >= height - fadeDistance) alphaY = (height - 1 - y) / fadeDistance;
          break;
        case "br": // bottom-right
          if (x >= width - fadeDistance) alphaX = (width - 1 - x) / fadeDistance;
          if (y >= height - fadeDistance) alphaY = (height - 1 - y) / fadeDistance;
          break;
      }

      // Combine both fade factors
      const alpha = Math.min(alphaX, alphaY);

      if (alpha < 1.0) {
        const idx = (y * width + x) * 4;
        data[idx + 3] = Math.round(data[idx + 3] * alpha);
      }
    }
  }

  return imageData;
}

/**
 * Create a canvas with a border frame
 * @param {number} contentWidth - Width of content area
 * @param {number} contentHeight - Height of content area
 * @param {number} borderWidth - Border width in pixels
 * @param {string} borderColour - Border colour (CSS colour string)
 * @param {string} borderStyle - Border style: 'solid', 'dashed', 'dotted'
 * @returns {Object} { canvas, ctx, contentX, contentY } - Canvas with border and content position
 */
export function createBorderFrame(contentWidth, contentHeight, borderWidth, borderColour, borderStyle = "solid") {
  const totalWidth = contentWidth + borderWidth * 2;
  const totalHeight = contentHeight + borderWidth * 2;

  const canvas = document.createElement("canvas");
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d");

  // Fill border area
  ctx.fillStyle = borderColour;

  if (borderStyle === "solid") {
    // Draw solid border as filled rectangles around edges
    // Top border
    ctx.fillRect(0, 0, totalWidth, borderWidth);
    // Bottom border
    ctx.fillRect(0, totalHeight - borderWidth, totalWidth, borderWidth);
    // Left border
    ctx.fillRect(0, borderWidth, borderWidth, contentHeight);
    // Right border
    ctx.fillRect(totalWidth - borderWidth, borderWidth, borderWidth, contentHeight);
  } else {
    // For dashed/dotted, draw lines
    ctx.strokeStyle = borderColour;
    ctx.lineWidth = borderWidth;

    if (borderStyle === "dashed") {
      ctx.setLineDash([10, 5]);
    } else if (borderStyle === "dotted") {
      ctx.setLineDash([2, 3]);
    }

    const offset = borderWidth / 2;
    ctx.strokeRect(offset, offset, totalWidth - borderWidth, totalHeight - borderWidth);
  }

  return {
    canvas,
    ctx,
    contentX: borderWidth,
    contentY: borderWidth,
    totalWidth,
    totalHeight,
  };
}

/**
 * Join two image sections after a cut operation
 * @param {ImageData} section1 - First section
 * @param {ImageData} section2 - Second section
 * @param {string} orientation - 'horizontal' or 'vertical'
 * @param {boolean} fade - Whether to apply fade blend at join
 * @param {number} fadeDistance - Fade distance if fade is true
 * @returns {ImageData} Joined image data
 */
export function joinSections(section1, section2, orientation, fade = false, fadeDistance = 0) {
  let newWidth, newHeight;

  if (orientation === "horizontal") {
    // Sections are stacked vertically (cut was horizontal)
    newWidth = Math.max(section1.width, section2.width);
    newHeight = section1.height + section2.height;
  } else {
    // Sections are side by side (cut was vertical)
    newWidth = section1.width + section2.width;
    newHeight = Math.max(section1.height, section2.height);
  }

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext("2d");

  // Create temporary canvases for each section
  const canvas1 = document.createElement("canvas");
  canvas1.width = section1.width;
  canvas1.height = section1.height;
  const ctx1 = canvas1.getContext("2d");
  ctx1.putImageData(section1, 0, 0);

  const canvas2 = document.createElement("canvas");
  canvas2.width = section2.width;
  canvas2.height = section2.height;
  const ctx2 = canvas2.getContext("2d");
  ctx2.putImageData(section2, 0, 0);

  if (orientation === "horizontal") {
    // Stack vertically
    if (fade && fadeDistance > 0) {
      // Apply fade to bottom of section1 and top of section2
      const section1Data = ctx1.getImageData(0, 0, section1.width, section1.height);
      applyEdgeFade(section1Data, "bottom", fadeDistance);
      ctx1.putImageData(section1Data, 0, 0);

      const section2Data = ctx2.getImageData(0, 0, section2.width, section2.height);
      applyEdgeFade(section2Data, "top", fadeDistance);
      ctx2.putImageData(section2Data, 0, 0);
    }

    ctx.drawImage(canvas1, 0, 0);
    ctx.drawImage(canvas2, 0, section1.height);
  } else {
    // Place side by side
    if (fade && fadeDistance > 0) {
      // Apply fade to right of section1 and left of section2
      const section1Data = ctx1.getImageData(0, 0, section1.width, section1.height);
      applyEdgeFade(section1Data, "right", fadeDistance);
      ctx1.putImageData(section1Data, 0, 0);

      const section2Data = ctx2.getImageData(0, 0, section2.width, section2.height);
      applyEdgeFade(section2Data, "left", fadeDistance);
      ctx2.putImageData(section2Data, 0, 0);
    }

    ctx.drawImage(canvas1, 0, 0);
    ctx.drawImage(canvas2, section1.width, 0);
  }

  return ctx.getImageData(0, 0, newWidth, newHeight);
}

/**
 * Replace all layers with a single image layer
 * This is used after destructive operations (crop, cut, edges)
 * @param {LayerManager} layerManager - The layer manager instance
 * @param {CanvasManager} canvasManager - The canvas manager instance
 * @param {HTMLImageElement} newImage - The new base image
 */
export function replaceWithImage(layerManager, canvasManager, newImage) {
  // Clear all layers and set new base image
  layerManager.layers = [
    {
      type: "image",
      id: 0,
      data: {
        image: newImage,
        x: 0,
        y: 0,
        width: newImage.width,
        height: newImage.height,
      },
    },
  ];

  // Resize canvas to match new image
  canvasManager.setSize(newImage.width, newImage.height);

  // Render the new state
  canvasManager.render();
}
