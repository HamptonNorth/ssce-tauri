/**
 * Borders Tool
 * Add configurable borders around images, expanding the canvas.
 *
 * Usage:
 * 1. Activate Borders tool
 * 2. Adjust width sliders (H/V synced by default, or independent)
 * 3. Pick border colour (or transparent)
 * 4. Adjust corner radius slider (limited to min border width)
 * 5. Click Apply or press Ctrl+Enter to apply, Escape to cancel
 *
 * Note: Only solid borders supported.
 */

import { state, modules, persistState } from "../state.js";
import { flattenToImage, replaceWithImage } from "../utils/image-ops.js";
import { getCurrentCard } from "../ui/property-cards/index.js";

export class BordersTool {
  constructor(canvasManager, layerManager, notifyChange) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;
    this.notifyChange = notifyChange;

    // Border settings
    this.borderWidthH = 4; // Horizontal (left/right)
    this.borderWidthV = 4; // Vertical (top/bottom)
    this.syncWidths = true; // Sync H and V by default
    this.borderColour = "#333333";
    this.borderRadius = 0;

    // Store original image size for restore on cancel
    this.originalSize = null;

    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  activate() {
    // Store original size for cancel/restore
    const baseLayer = this.layerManager.layers[0];
    this.originalSize = {
      width: baseLayer.data.width,
      height: baseLayer.data.height,
    };

    // Load defaults from config, but prefer last used colour from localStorage
    if (state.config) {
      this.borderWidthH = state.config.borderWidth || 4;
      this.borderWidthV = state.config.borderWidth || 4;
      this.borderColour = state.config.borderColour || "#333333";
      this.borderRadius = state.config.borderRadius || 0;
    }

    // Load last used border colour from localStorage (overrides config default)
    const savedBorderColour = localStorage.getItem("ssce_lastBorderColour");
    if (savedBorderColour) {
      this.borderColour = savedBorderColour;
    }

    this.syncWidths = true;

    // Add event listeners
    document.addEventListener("keydown", this.handleKeyDown);

    // Wait a tick for the property card to be shown by toolbar.js
    setTimeout(() => {
      this.setupPropertyCard();
    }, 50);

    // Initial render with preview
    this.render();
  }

  deactivate() {
    document.removeEventListener("keydown", this.handleKeyDown);
    // Restore original canvas size
    if (this.originalSize) {
      this.canvasManager.setSize(this.originalSize.width, this.originalSize.height);
    }
    this.canvasManager.render();
  }

  /**
   * Setup the property card with initial values and callbacks
   */
  setupPropertyCard() {
    const card = getCurrentCard();
    if (!card || card.toolName !== "borders") return;

    // Set initial values
    card.setInitialValues({
      borderWidthH: this.borderWidthH,
      borderWidthV: this.borderWidthV,
      syncWidths: this.syncWidths,
      borderColour: this.borderColour,
      borderRadius: this.borderRadius,
      originalSize: this.originalSize,
    });

    // Set callbacks
    card.onSettingsChange = (settings) => {
      this.borderWidthH = settings.borderWidthH;
      this.borderWidthV = settings.borderWidthV;
      this.borderColour = settings.borderColour;
      this.borderRadius = settings.borderRadius;
      this.syncWidths = settings.syncWidths;
      this.render();
    };

    card.onApply = () => {
      this.applyBorder();
    };

    card.onCancel = () => {
      this.cancel();
    };

    // Re-render the card with updated values
    if (card.element) {
      const content = card.renderContent();
      card.contentElement.innerHTML = "";
      card.contentElement.appendChild(content);
      card.setupEventListeners();
    }
  }

  getMaxRadius() {
    return Math.min(this.borderWidthH, this.borderWidthV);
  }

  handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.cancel();
    } else if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      this.applyBorder();
    }
  }

  /**
   * Cancel the operation and switch to select tool
   */
  cancel() {
    // Restore original canvas size and render
    if (this.originalSize) {
      this.canvasManager.setSize(this.originalSize.width, this.originalSize.height);
    }
    this.canvasManager.render();

    // Switch to select tool
    import("../ui/toolbar.js").then((toolbar) => {
      toolbar.setActiveTool("select");
    });
  }

  render() {
    if (!this.originalSize) return;

    const canvas = this.canvasManager.getCanvas();
    const ctx = canvas.getContext("2d");
    const size = this.originalSize;
    const borderH = this.borderWidthH;
    const borderV = this.borderWidthV;
    const radius = Math.min(this.borderRadius, this.getMaxRadius());
    const newWidth = size.width + borderH * 2;
    const newHeight = size.height + borderV * 2;
    const isTransparent = this.borderColour === "transparent";

    // Restore to original size first, then render layers
    this.canvasManager.setSize(size.width, size.height);
    this.canvasManager.render();

    // Store original canvas as data URL (preserves transparency, unlike getImageData)
    const originalDataURL = canvas.toDataURL("image/png");

    // Expand canvas for preview
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Load and draw original content as image to preserve transparency
    const originalImage = new Image();
    originalImage.onload = () => {
      if (isTransparent) {
        // Transparent border - just draw checkerboard pattern, then image
        this.drawCheckerboard(ctx, newWidth, newHeight);
        ctx.drawImage(originalImage, borderH, borderV);
      } else if (radius === 0) {
        // Square corners - fill with border colour
        ctx.fillStyle = this.borderColour;
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.drawImage(originalImage, borderH, borderV);
      } else {
        // Rounded corners - show checkerboard in corners, border colour elsewhere
        // First draw checkerboard for corners
        this.drawCheckerboard(ctx, newWidth, newHeight);

        // Draw border frame on top using evenodd fill
        ctx.beginPath();
        ctx.roundRect(0, 0, newWidth, newHeight, radius);
        ctx.moveTo(borderH, borderV);
        ctx.lineTo(borderH, borderV + size.height);
        ctx.lineTo(borderH + size.width, borderV + size.height);
        ctx.lineTo(borderH + size.width, borderV);
        ctx.closePath();
        ctx.fillStyle = this.borderColour;
        ctx.fill("evenodd");

        // Draw original content centered
        ctx.drawImage(originalImage, borderH, borderV);
      }

      // Recalculate zoom for the preview size (auto-fit if needed)
      import("../utils/zoom.js").then((zoom) => {
        zoom.recalculateZoom(true);
      });
    };
    originalImage.src = originalDataURL;
  }

  drawCheckerboard(ctx, width, height) {
    const checkSize = 8;
    const color1 = "#CCCCCC";
    const color2 = "#999999";

    for (let y = 0; y < height; y += checkSize) {
      for (let x = 0; x < width; x += checkSize) {
        const isEven = (x / checkSize + y / checkSize) % 2 === 0;
        ctx.fillStyle = isEven ? color1 : color2;
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }
  }

  async applyBorder() {
    if (!this.originalSize) return;

    const size = this.originalSize;
    const borderH = this.borderWidthH;
    const borderV = this.borderWidthV;
    const radius = Math.min(this.borderRadius, this.getMaxRadius());
    const newWidth = size.width + borderH * 2;
    const newHeight = size.height + borderV * 2;
    const isTransparent = this.borderColour === "transparent";

    try {
      // Restore canvas to original size before flattening
      this.canvasManager.setSize(size.width, size.height);
      this.canvasManager.render();

      // Flatten all layers to single image
      const flatImage = await flattenToImage(this.canvasManager, this.layerManager);

      // Create new canvas with expanded dimensions
      const newCanvas = document.createElement("canvas");
      newCanvas.width = newWidth;
      newCanvas.height = newHeight;
      const ctx = newCanvas.getContext("2d");

      if (isTransparent) {
        // Transparent border - just draw image centered on transparent canvas
        ctx.drawImage(flatImage, borderH, borderV);
      } else if (radius === 0) {
        // Square corners
        ctx.fillStyle = this.borderColour;
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.drawImage(flatImage, borderH, borderV);
      } else {
        // Rounded corners - corners must be transparent
        // First draw the image
        ctx.drawImage(flatImage, borderH, borderV);

        // Draw border frame on top using evenodd fill
        ctx.beginPath();
        // Outer rounded rect (clockwise)
        ctx.roundRect(0, 0, newWidth, newHeight, radius);
        // Inner rect (counter-clockwise to create hole)
        ctx.moveTo(borderH, borderV);
        ctx.lineTo(borderH, borderV + size.height);
        ctx.lineTo(borderH + size.width, borderV + size.height);
        ctx.lineTo(borderH + size.width, borderV);
        ctx.closePath();

        ctx.fillStyle = this.borderColour;
        ctx.fill("evenodd");
      }

      // Convert to image
      const resultImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = newCanvas.toDataURL("image/png");
      });

      // Update originalSize so deactivate doesn't revert
      this.originalSize = { width: newWidth, height: newHeight };

      // Save last used colour to localStorage (for next time)
      if (!isTransparent) {
        persistState("lastBorderColour", this.borderColour);
      }

      // Replace canvas with result
      replaceWithImage(this.layerManager, this.canvasManager, resultImage);

      // Recalculate zoom after canvas resize
      import("../utils/zoom.js").then((zoom) => {
        zoom.recalculateZoom();
      });

      if (this.notifyChange) {
        this.notifyChange();
      }

      import("../utils/toast.js").then((t) => t.showToast(`Border added: ${newWidth}×${newHeight}`, "success"));

      // Switch to select tool after applying
      import("../ui/toolbar.js").then((toolbar) => {
        toolbar.setActiveTool("select");
      });
    } catch (error) {
      console.error("Border failed:", error);
      import("../utils/toast.js").then((t) => t.showToast("Border failed", "error"));
    }
  }
}
