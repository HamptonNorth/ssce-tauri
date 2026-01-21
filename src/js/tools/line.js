/**
 * SSCE - Line Tool
 *
 * Handles drawing lines on the canvas.
 * Click and drag to create a line from start to end point.
 */

import { getDashGapMultiplier } from "../utils/config.js";

export class LineTool {
  /**
   * Create a new LineTool
   * @param {CanvasManager} canvasManager
   * @param {LayerManager} layerManager
   * @param {Function} getColour - Function that returns current colour
   * @param {Function} getLineStyle - Function that returns current line style
   * @param {Function} getLineWidth - Function that returns current line width
   */
  constructor(canvasManager, layerManager, getColour, getLineStyle, getLineWidth = () => 3) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;
    this.getColour = getColour;
    this.getLineStyle = getLineStyle;
    this.getLineWidth = getLineWidth;

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
   * Activate the line tool
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
   * Deactivate the line tool
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

    let pos = this.canvasManager.getMousePos(e);

    // Snap to horizontal or vertical if Shift is held
    if (e.shiftKey) {
      pos = this.snapToAxis(this.startX, this.startY, pos.x, pos.y);
    }

    // Re-render existing layers
    this.canvasManager.render();

    // Draw preview line
    this.drawPreviewLine(this.startX, this.startY, pos.x, pos.y);
  }

  /**
   * Handle mouse up - finish drawing
   * @param {MouseEvent} e
   */
  handleMouseUp(e) {
    if (!this.isDrawing) return;

    let pos = this.canvasManager.getMousePos(e);
    this.isDrawing = false;

    // Snap to horizontal or vertical if Shift is held
    if (e.shiftKey) {
      pos = this.snapToAxis(this.startX, this.startY, pos.x, pos.y);
    }

    // Calculate line length
    const dx = pos.x - this.startX;
    const dy = pos.y - this.startY;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Only add line if it has some length
    if (length > 10) {
      this.layerManager.addLineLayer(this.startX, this.startY, pos.x, pos.y, this.getColour(), this.getLineStyle(), this.getLineWidth());

      // Notify app of layer change (for undo/redo buttons)
      import("../app.js").then((app) => {
        if (app.notifyLayerChange) {
          app.notifyLayerChange();
        }
      });
    } else {
      // Just re-render to clear preview
      this.canvasManager.render();
    }
  }

  /**
   * Snap end position to horizontal or vertical axis
   * @param {number} startX
   * @param {number} startY
   * @param {number} endX
   * @param {number} endY
   * @returns {{x: number, y: number}} Snapped position
   */
  snapToAxis(startX, startY, endX, endY) {
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);

    // Snap to axis with larger delta (more movement)
    if (dx > dy) {
      // Horizontal - keep X, snap Y to start
      return { x: endX, y: startY };
    } else {
      // Vertical - keep Y, snap X to start
      return { x: startX, y: endY };
    }
  }

  /**
   * Draw a preview line (not added to layers yet)
   * @param {number} startX
   * @param {number} startY
   * @param {number} endX
   * @param {number} endY
   */
  drawPreviewLine(startX, startY, endX, endY) {
    const ctx = this.canvasManager.getCanvas().getContext("2d");
    const colour = this.getColour();
    const lineWidth = this.getLineWidth();
    const lineStyle = this.getLineStyle();

    ctx.save();
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";

    // Set line dash pattern and cap based on style (scales with line width)
    const gapMult = getDashGapMultiplier(lineWidth);
    if (lineStyle === "dashed") {
      ctx.lineCap = "butt";
      ctx.setLineDash([lineWidth * 4, lineWidth * 2 * gapMult]);
    } else if (lineStyle === "dotted") {
      ctx.lineCap = "round";
      ctx.setLineDash([0.1, lineWidth * 2.5 * gapMult]);
    } else {
      // Solid: butt cap for clean flat ends
      ctx.lineCap = "butt";
    }

    // Make preview slightly transparent
    ctx.globalAlpha = 0.7;

    // Draw the line (no arrowhead)
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.restore();
  }
}
