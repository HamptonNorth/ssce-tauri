/**
 * SSCE - Shape Tool
 *
 * Handles drawing rectangles on the canvas.
 * Click and drag to create a rectangle from start to end point.
 */

export class ShapeTool {
  /**
   * Create a new ShapeTool
   * @param {CanvasManager} canvasManager
   * @param {LayerManager} layerManager
   * @param {Function} getColour - Function that returns current border colour
   * @param {Function} getLineStyle - Function that returns current line style
   * @param {Function} getBorderWidth - Function that returns current border width (from textSize)
   * @param {Function} getFillColour - Function that returns current fill colour
   * @param {Function} getCornerStyle - Function that returns current corner style
   */
  constructor(canvasManager, layerManager, getColour, getLineStyle, getBorderWidth, getFillColour, getCornerStyle) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;
    this.getColour = getColour;
    this.getLineStyle = getLineStyle;
    this.getBorderWidth = getBorderWidth;
    this.getFillColour = getFillColour;
    this.getCornerStyle = getCornerStyle;

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
   * Activate the shape tool
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
   * Deactivate the shape tool
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

    // Draw preview rectangle
    this.drawPreviewRectangle(this.startX, this.startY, pos.x, pos.y);
  }

  /**
   * Handle mouse up - finish drawing
   * @param {MouseEvent} e
   */
  handleMouseUp(e) {
    if (!this.isDrawing) return;

    const pos = this.canvasManager.getMousePos(e);

    // Only create rectangle if there's some size
    const width = Math.abs(pos.x - this.startX);
    const height = Math.abs(pos.y - this.startY);
    if (width > 2 && height > 2) {
      this.layerManager.addShapeLayer(Math.min(this.startX, pos.x), Math.min(this.startY, pos.y), width, height, this.getColour(), this.getFillColour(), this.getBorderWidth(), this.getLineStyle(), this.getCornerStyle());

      // Notify app of layer change (for undo/redo buttons and unsaved indicator)
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
   * Draw a preview rectangle on the canvas
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   */
  drawPreviewRectangle(x1, y1, x2, y2) {
    const ctx = this.canvasManager.ctx;
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    const borderWidth = this.getBorderWidth();
    const borderColour = this.getColour();
    const fillColour = this.getFillColour();
    const lineStyle = this.getLineStyle();
    const cornerStyle = this.getCornerStyle();

    ctx.save();

    // Set line style
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColour;

    // Dash length multiplier: XS/SM=4, MD=3.5, LG=2.55 (-15%), XL=1.75 (-30%)
    const dashLengthMult = borderWidth <= 2 ? 4 : borderWidth <= 4 ? 3.5 : borderWidth <= 8 ? 2.55 : 1.75;
    // Gap multiplier: reduces for larger widths
    const gapMult = borderWidth <= 2 ? 1.0 : borderWidth <= 4 ? 0.8 : borderWidth <= 8 ? 0.6 : 0.4;
    // Dot gap multiplier: XS=3.16 (+26.5%), SM/MD=2.5, LG=2.125 (-15%), XL=3.0
    const dotGapMult = borderWidth <= 1 ? 3.16 : borderWidth <= 4 ? 2.5 : borderWidth <= 8 ? 2.125 : 3.0;

    if (lineStyle === "dashed") {
      ctx.lineCap = "butt";
      ctx.setLineDash([borderWidth * dashLengthMult, borderWidth * 2 * gapMult]);
    } else if (lineStyle === "dotted") {
      ctx.lineCap = "round";
      ctx.setLineDash([0.1, borderWidth * dotGapMult * gapMult]);
    } else {
      ctx.setLineDash([]);
    }

    // Calculate corner radius based on corner style and border width
    const cornerRadius = cornerStyle === "rounded" ? borderWidth * 2 : 0;

    // Draw fill if not transparent
    if (fillColour !== "transparent") {
      ctx.fillStyle = fillColour;
      if (cornerRadius > 0) {
        this.drawRoundedRect(ctx, x, y, width, height, cornerRadius, true, false);
      } else {
        ctx.fillRect(x, y, width, height);
      }
    }

    // Draw border
    if (cornerRadius > 0) {
      this.drawRoundedRect(ctx, x, y, width, height, cornerRadius, false, true);
    } else {
      ctx.strokeRect(x, y, width, height);
    }

    ctx.restore();
  }

  /**
   * Draw a rounded rectangle
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} radius
   * @param {boolean} fill - Whether to fill
   * @param {boolean} stroke - Whether to stroke
   */
  drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    // Ensure radius doesn't exceed half the smallest dimension
    radius = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}
