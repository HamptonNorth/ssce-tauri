/**
 * Highlight Tool
 * Draws semi-transparent rectangles for highlighting areas
 * Click and drag to create a highlight at 30% opacity
 */

import { state } from "../state.js";

export class HighlightTool {
  /**
   * Create a new HighlightTool
   * @param {CanvasManager} canvasManager
   * @param {LayerManager} layerManager
   */
  constructor(canvasManager, layerManager) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;

    // Drawing state
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;

    // Bind event handlers to preserve 'this' context
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  /**
   * Activate the highlight tool
   * Sets up event listeners on the canvas
   */
  activate() {
    const canvas = this.canvasManager.getCanvas();
    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mouseup", this.handleMouseUp);
    canvas.addEventListener("mouseleave", this.handleMouseUp);
  }

  /**
   * Deactivate the highlight tool
   * Removes event listeners
   */
  deactivate() {
    const canvas = this.canvasManager.getCanvas();
    canvas.removeEventListener("mousedown", this.handleMouseDown);
    canvas.removeEventListener("mousemove", this.handleMouseMove);
    canvas.removeEventListener("mouseup", this.handleMouseUp);
    canvas.removeEventListener("mouseleave", this.handleMouseUp);

    this.isDrawing = false;
  }

  /**
   * Handle mouse down - start drawing
   * @param {MouseEvent} e
   */
  handleMouseDown(e) {
    if (e.button !== 0) return; // Only left click

    const pos = this.canvasManager.getMousePos(e);
    this.isDrawing = true;
    this.startX = pos.x;
    this.startY = pos.y;
  }

  /**
   * Handle mouse move - show preview
   * @param {MouseEvent} e
   */
  handleMouseMove(e) {
    if (!this.isDrawing) return;

    const pos = this.canvasManager.getMousePos(e);

    // Re-render existing layers
    this.canvasManager.render();

    // Draw preview highlight
    this.drawPreview(this.startX, this.startY, pos.x, pos.y);
  }

  /**
   * Handle mouse up - finish drawing
   * @param {MouseEvent} e
   */
  handleMouseUp(e) {
    if (!this.isDrawing) return;

    const pos = this.canvasManager.getMousePos(e);

    // Only create highlight if there's some size
    const width = Math.abs(pos.x - this.startX);
    const height = Math.abs(pos.y - this.startY);
    if (width > 2 && height > 2) {
      this.layerManager.addHighlightLayer(
        Math.min(this.startX, pos.x),
        Math.min(this.startY, pos.y),
        width,
        height,
        state.currentColour
      );

      // Notify app for undo/redo state
      import("../app.js").then((app) => {
        if (app.notifyLayerChange) {
          app.notifyLayerChange();
        }
      });
    }

    this.isDrawing = false;
    this.canvasManager.render();
  }

  /**
   * Draw a preview highlight on the canvas
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   */
  drawPreview(x1, y1, x2, y2) {
    const ctx = this.canvasManager.ctx;
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = state.currentColour;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }
}
