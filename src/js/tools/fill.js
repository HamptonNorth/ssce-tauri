/**
 * SSCE - Fill Tool
 *
 * Fills the largest contiguous transparent rectangle at the click point
 * with the current colour. Uses a preview-then-confirm workflow:
 * - Click to detect and preview the rectangle
 * - Ctrl+click or Enter to confirm the fill
 * - Escape or click elsewhere to cancel preview
 */

import { findTransparentRect } from "../utils/rect-detect.js";
import { showToast } from "../utils/toast.js";

export class FillTool {
  /**
   * @param {import('../canvas.js').CanvasManager} canvasManager
   * @param {import('../layers.js').LayerManager} layerManager
   * @param {Function} getColour - Returns current colour
   * @param {Function} onLayerChange - Called after fill is applied
   */
  constructor(canvasManager, layerManager, getColour, onLayerChange) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;
    this.getColour = getColour;
    this.onLayerChange = onLayerChange;
    this.isActive = false;

    // Preview state
    this.previewRect = null; // { x, y, width, height }

    // Bind handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  activate() {
    this.isActive = true;
    this.previewRect = null;
    const canvas = this.canvasManager.canvas;
    canvas.addEventListener("mousedown", this.handleMouseDown);
    document.addEventListener("keydown", this.handleKeyDown);
  }

  deactivate() {
    this.isActive = false;
    this.previewRect = null;
    const canvas = this.canvasManager.canvas;
    canvas.removeEventListener("mousedown", this.handleMouseDown);
    document.removeEventListener("keydown", this.handleKeyDown);
    this.canvasManager.render();
  }

  handleMouseDown(e) {
    if (!this.isActive) return;
    if (e.button !== 0) return; // Left click only

    const pos = this.canvasManager.getMousePos(e);
    const x = Math.floor(pos.x);
    const y = Math.floor(pos.y);

    // Ctrl+click: if preview is showing, confirm the fill
    if ((e.ctrlKey || e.metaKey) && this.previewRect) {
      this.confirmFill();
      return;
    }

    // Detect transparent rectangle at click point
    const canvas = this.canvasManager.canvas;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const rect = findTransparentRect(imageData, x, y);

    if (!rect) {
      showToast("Click on a transparent area", "info");
      this.previewRect = null;
      this.canvasManager.render();
      return;
    }

    // Show preview
    this.previewRect = rect;
    this.renderPreview();
  }

  handleKeyDown(e) {
    if (!this.isActive) return;

    if (e.key === "Enter" && this.previewRect) {
      e.preventDefault();
      this.confirmFill();
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.previewRect = null;
      this.canvasManager.render();
    }
  }

  /**
   * Confirm the fill: create a shape layer at the preview rectangle
   */
  confirmFill() {
    if (!this.previewRect) return;

    const colour = this.getColour();
    const rect = this.previewRect;

    // Add a filled shape layer (no border, solid fill)
    this.layerManager.addLayer({
      type: "shape",
      data: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        borderColour: colour,
        fillColour: colour,
        borderWidth: 0,
        lineStyle: "solid",
        cornerStyle: "square",
      },
    });

    this.previewRect = null;
    this.canvasManager.render();

    if (this.onLayerChange) {
      this.onLayerChange();
    }
  }

  /**
   * Render the preview overlay showing the detected rectangle
   */
  renderPreview() {
    if (!this.previewRect) return;

    // Re-render canvas first to clear previous preview
    this.canvasManager.render();

    const ctx = this.canvasManager.ctx;
    const rect = this.previewRect;
    const colour = this.getColour();

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = colour;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.globalAlpha = 1.0;

    // Draw outline
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }
}
