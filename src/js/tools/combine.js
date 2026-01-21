/**
 * SSCE - Combine Tool
 *
 * Handles combining multiple screenshots into one image.
 * Allows positioning second image relative to first (above, below, left, right)
 * and fine-tuning with arrow keys.
 */

import { showToast } from "../utils/toast.js";

export class CombineTool {
  /**
   * Create a new CombineTool
   * @param {CanvasManager} canvasManager
   * @param {LayerManager} layerManager
   */
  constructor(canvasManager, layerManager) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;

    // Second image being combined
    this.secondImage = null;
    this.secondImageLayer = null;

    // Position adjustment state
    this.isAdjusting = false;

    // State snapshot for cancel/restore
    this.originalState = null;

    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Activate the combine tool
   */
  activate() {
    // Show instruction or prompt user to paste/drop image
    console.log("Combine tool active - paste or drop an image to combine");
  }

  /**
   * Deactivate the combine tool
   */
  deactivate() {
    if (this.isAdjusting) {
      this.cancelAdjustment();
    }
    this.secondImage = null;
    this.originalState = null;
  }

  /**
   * Load a second image for combining
   * @param {File} file - Image file
   */
  loadSecondImage(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.secondImage = img;
        this.showPositionDialog();
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  /**
   * Load second image from data URL
   * @param {string} dataUrl
   */
  loadSecondImageFromDataUrl(dataUrl) {
    const img = new Image();
    img.onload = () => {
      this.secondImage = img;
      this.showPositionDialog();
    };
    img.src = dataUrl;
  }

  /**
   * Show the position selection dialog
   */
  showPositionDialog() {
    // Import and call the dialog function from app.js
    import("../app.js").then((app) => {
      if (app.showCombineDialog) {
        app.showCombineDialog();
      }
    });
  }

  /**
   * Save current state before making changes (for cancel/restore)
   */
  saveOriginalState() {
    const size = this.canvasManager.getSize();
    const layers = this.layerManager.getLayers();

    // Deep copy layer positions for restoration
    const layerPositions = layers.map((layer) => {
      if (layer.type === "image" && layer.data) {
        return { x: layer.data.x || 0, y: layer.data.y || 0 };
      }
      return null;
    });

    this.originalState = {
      width: size.width,
      height: size.height,
      layerCount: layers.length,
      layerPositions: layerPositions,
    };
  }

  /**
   * Position the second image relative to the first
   * @param {string} position - 'above', 'below', 'left', 'right'
   */
  positionSecondImage(position) {
    if (!this.secondImage) {
      console.error("No second image loaded");
      return;
    }

    // Save state before making changes
    this.saveOriginalState();

    // Expand canvas and get position for new image
    const pos = this.layerManager.expandCanvasForCombine(this.secondImage, position);

    // Add the image layer
    this.layerManager.addImageLayer(this.secondImage, pos.x, pos.y);

    // Start adjustment mode
    this.startAdjustment();

    // Notify app of layer change
    import("../app.js").then((app) => {
      if (app.notifyLayerChange) {
        app.notifyLayerChange();
      }
    });

    // Update zoom button after combining images
    import("../utils/zoom.js").then((zoom) => {
      zoom.updateZoomButton();
    });
  }

  /**
   * Start adjustment mode for fine-tuning position
   */
  startAdjustment() {
    this.isAdjusting = true;
    document.addEventListener("keydown", this.handleKeyDown);

    showToast("Arrow keys to adjust, Shift for 10px. Enter to confirm, Escape to cancel.", "info", 4000);
  }

  /**
   * Handle keyboard input for position adjustment
   * @param {KeyboardEvent} e
   */
  handleKeyDown(e) {
    if (!this.isAdjusting) return;

    // Check for arrow keys
    const isArrow = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);

    if (isArrow) {
      e.preventDefault();

      // Determine step size
      const step = e.shiftKey ? 10 : 1;

      // Calculate offset
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case "ArrowUp":
          dy = -step;
          break;
        case "ArrowDown":
          dy = step;
          break;
        case "ArrowLeft":
          dx = -step;
          break;
        case "ArrowRight":
          dx = step;
          break;
      }

      // Move the last layer (the combined image)
      this.moveLastLayer(dx, dy);
    }

    // Enter confirms, Escape cancels
    if (e.key === "Enter") {
      e.preventDefault();
      this.confirmAdjustment();
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.cancelAdjustment();
    }
  }

  /**
   * Move the last added layer by an offset
   * @param {number} dx
   * @param {number} dy
   */
  moveLastLayer(dx, dy) {
    const layers = this.layerManager.getLayers();
    if (layers.length === 0) return;

    const lastLayer = layers[layers.length - 1];

    if (lastLayer.type === "image") {
      lastLayer.data.x += dx;
      lastLayer.data.y += dy;
      this.canvasManager.render();
    }
  }

  /**
   * Confirm the combine operation (Enter key)
   */
  confirmAdjustment() {
    this.isAdjusting = false;
    document.removeEventListener("keydown", this.handleKeyDown);
    this.secondImage = null;
    this.originalState = null;

    showToast("Images combined", "success");

    // Notify app of confirmed change
    import("../app.js").then((app) => {
      if (app.notifyLayerChange) {
        app.notifyLayerChange();
      }
    });
  }

  /**
   * Cancel the combine operation (Escape key)
   * Restores canvas to original state before combine was initiated
   */
  cancelAdjustment() {
    this.isAdjusting = false;
    document.removeEventListener("keydown", this.handleKeyDown);

    if (this.originalState) {
      const layers = this.layerManager.getLayers();

      // Remove the added image layer (last layer)
      if (layers.length > this.originalState.layerCount) {
        layers.pop();
      }

      // Restore original layer positions (handles offset from "above"/"left")
      for (let i = 0; i < this.originalState.layerPositions.length; i++) {
        const savedPos = this.originalState.layerPositions[i];
        if (savedPos && layers[i] && layers[i].type === "image" && layers[i].data) {
          layers[i].data.x = savedPos.x;
          layers[i].data.y = savedPos.y;
        }
      }

      // Restore original canvas size
      this.canvasManager.setSize(this.originalState.width, this.originalState.height);

      // Re-render
      this.canvasManager.render();

      // Update zoom button
      import("../utils/zoom.js").then((zoom) => {
        zoom.updateZoomButton();
      });

      // Notify app
      import("../app.js").then((app) => {
        if (app.notifyLayerChange) {
          app.notifyLayerChange();
        }
      });
    }

    this.secondImage = null;
    this.originalState = null;

    showToast("Combine cancelled", "info");
  }
}
