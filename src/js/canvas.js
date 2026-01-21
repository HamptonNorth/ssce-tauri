/**
 * SSCE - Canvas Manager
 *
 * Handles the main canvas element, rendering, and coordinate transformations.
 * The canvas displays all layers composited together.
 */

import { getDashGapMultiplier, getTextSize, getTextLineHeight } from "./utils/config.js";

export class CanvasManager {
  /**
   * Create a new CanvasManager
   * @param {HTMLCanvasElement} canvas - The main canvas element
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // Default canvas size (will be updated when image loads)
    this.width = 800;
    this.height = 600;

    // Layer manager will be set after initialization
    this.layerManager = null;

    // Initialize canvas
    this.setSize(this.width, this.height);
  }

  /**
   * Set the layer manager reference
   * Called by app.js after both are initialized
   * @param {LayerManager} layerManager
   */
  setLayerManager(layerManager) {
    this.layerManager = layerManager;
  }

  /**
   * Set canvas size
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    // Update the wrapper size to match
    const wrapper = document.getElementById("canvas-wrapper");
    if (wrapper) {
      wrapper.style.width = `${width}px`;
      wrapper.style.height = `${height}px`;

      // Force wrapper to be inline-block to prevent flex stretching
      wrapper.style.display = "inline-block";
    }

    // Recalculate zoom when canvas size changes
    import("./utils/zoom.js").then((zoom) => {
      zoom.recalculateZoom();
    });
  }

  /**
   * Get current canvas size
   * @returns {{width: number, height: number}}
   */
  getSize() {
    return {
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Resize the canvas with an anchor point
   * @param {number} newWidth
   * @param {number} newHeight
   * @param {string} anchor - Position anchor: tl, tc, tr, ml, mc, mr, bl, bc, br
   */
  resize(newWidth, newHeight, anchor = "mc") {
    // Calculate offset based on anchor
    const dw = newWidth - this.width;
    const dh = newHeight - this.height;

    let offsetX = 0;
    let offsetY = 0;

    // Horizontal anchor
    if (anchor.includes("l")) offsetX = 0;
    else if (anchor.includes("r")) offsetX = dw;
    else offsetX = Math.floor(dw / 2); // center

    // Vertical anchor
    if (anchor.startsWith("t")) offsetY = 0;
    else if (anchor.startsWith("b")) offsetY = dh;
    else offsetY = Math.floor(dh / 2); // middle

    // Create a temporary canvas with current content
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(this.canvas, 0, 0);

    // Resize main canvas
    this.setSize(newWidth, newHeight);

    // Clear and redraw with offset
    this.clear();
    this.ctx.drawImage(tempCanvas, offsetX, offsetY);

    // If layer manager exists, update layer positions
    if (this.layerManager) {
      this.layerManager.offsetAllLayers(offsetX, offsetY);
    }
  }

  /**
   * Clear the canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Render all layers to the canvas
   * Called by layer manager when layers change
   */
  render() {
    this.clear();

    if (this.layerManager) {
      const layers = this.layerManager.getLayers();

      for (const layer of layers) {
        this.renderLayer(layer);
      }
    }

    // Update dimensions display
    const dimensionsEl = document.getElementById("dimensions");
    if (dimensionsEl) {
      dimensionsEl.textContent = `${this.width} × ${this.height}`;
    }
  }

  /**
   * Render a single layer
   * @param {Object} layer - Layer object with type and data
   */
  renderLayer(layer) {
    switch (layer.type) {
      case "image":
        this.renderImageLayer(layer);
        break;
      case "arrow":
        this.renderArrowLayer(layer);
        break;
      case "line":
        this.renderLineLayer(layer);
        break;
      case "text":
        this.renderTextLayer(layer);
        break;
      case "step":
        this.renderStepLayer(layer);
        break;
      case "symbol":
        this.renderSymbolLayer(layer);
        break;
      case "shape":
        this.renderShapeLayer(layer);
        break;
      case "highlight":
        this.renderHighlightLayer(layer);
        break;
      default:
        console.warn("Unknown layer type:", layer.type);
    }
  }

  /**
   * Render a single layer to a specific canvas context
   * Used for flattening selected layers
   * @param {CanvasRenderingContext2D} ctx - Target canvas context
   * @param {Object} layer - Layer object with type and data
   */
  renderLayerToContext(ctx, layer) {
    const savedCtx = this.ctx;
    this.ctx = ctx;
    this.renderLayer(layer);
    this.ctx = savedCtx;
  }

  /**
   * Render an image layer
   * @param {Object} layer
   */
  renderImageLayer(layer) {
    const { image, x = 0, y = 0, width, height } = layer.data;

    if (width && height) {
      this.ctx.drawImage(image, x, y, width, height);
    } else {
      this.ctx.drawImage(image, x, y);
    }
  }

  /**
   * Render an arrow layer
   * @param {Object} layer
   */
  renderArrowLayer(layer) {
    const { startX, startY, endX, endY, colour, lineWidth = 3, lineStyle = "solid" } = layer.data;

    this.ctx.save();
    this.ctx.strokeStyle = colour;
    this.ctx.fillStyle = colour;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineJoin = "miter";

    // Set line dash pattern and cap based on style (scales with line width)
    const gapMult = getDashGapMultiplier(lineWidth);
    if (lineStyle === "dashed") {
      // Butt caps for clean rectangular dashes
      this.ctx.lineCap = "butt";
      this.ctx.setLineDash([lineWidth * 4, lineWidth * 2 * gapMult]);
    } else if (lineStyle === "dotted") {
      // Round caps create circular dots from tiny dash
      this.ctx.lineCap = "round";
      this.ctx.setLineDash([0.1, lineWidth * 2.5 * gapMult]);
    } else {
      // Solid: butt cap for clean join with arrowhead
      this.ctx.lineCap = "butt";
    }

    // Calculate arrow geometry
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx); // Line angle in radians
    const length = Math.sqrt(dx * dx + dy * dy);

    // Arrowhead size scales with both line length AND line width
    // Base calculation: 20% of line length, clamped between 10-20px
    // MD (4px) is the reference size (scale = 1.0)
    // XS (1px) = 0.6x, SM (2px) = 0.8x, MD (4px) = 1.0x, LG (8px) = 1.3x, XL (10px) = 1.5x
    const baseHeadLength = Math.min(20, Math.max(10, length * 0.2));
    const scaleFactor = 0.6 + (lineWidth - 1) * (0.9 / 9); // 0.6 at 1px, 1.5 at 10px
    const headLength = baseHeadLength * scaleFactor;

    // Arrowhead spread angle: π/8 = 22.5° provides sharp, professional look
    const headAngle = Math.PI / 8;

    // Draw line extending slightly into the arrowhead to prevent gaps
    // The overlap ensures clean join at all line widths
    const overlap = lineWidth * 0.5; // Half line width overlap
    const lineEndX = endX - (headLength - overlap) * Math.cos(angle);
    const lineEndY = endY - (headLength - overlap) * Math.sin(angle);

    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(lineEndX, lineEndY);
    this.ctx.stroke();

    // Draw filled arrowhead triangle (always solid for clarity)
    this.ctx.setLineDash([]); // Clear dashes for solid arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY); // Arrow tip
    this.ctx.lineTo(endX - headLength * Math.cos(angle - headAngle), endY - headLength * Math.sin(angle - headAngle));
    this.ctx.lineTo(endX - headLength * Math.cos(angle + headAngle), endY - headLength * Math.sin(angle + headAngle));
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * Render a line layer (line without arrowhead)
   * @param {Object} layer
   */
  renderLineLayer(layer) {
    const { startX, startY, endX, endY, colour, lineWidth = 3, lineStyle = "solid" } = layer.data;

    this.ctx.save();
    this.ctx.strokeStyle = colour;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineJoin = "round";

    // Set line dash pattern and cap based on style (scales with line width)
    const gapMult = getDashGapMultiplier(lineWidth);
    if (lineStyle === "dashed") {
      this.ctx.lineCap = "butt";
      this.ctx.setLineDash([lineWidth * 4, lineWidth * 2 * gapMult]);
    } else if (lineStyle === "dotted") {
      this.ctx.lineCap = "round";
      this.ctx.setLineDash([0.1, lineWidth * 2.5 * gapMult]);
    } else {
      // Solid: butt cap for clean flat ends
      this.ctx.lineCap = "butt";
    }

    // Draw the line
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Render a text layer
   * @param {Object} layer
   */
  renderTextLayer(layer) {
    const { text, x, y, colour, size } = layer.data;

    // Get size config from centralized defaults
    const sizeConfig = getTextSize(size);
    const lineHeightMult = getTextLineHeight();

    this.ctx.save();
    this.ctx.fillStyle = colour;
    this.ctx.font = `${sizeConfig.fontWeight} ${sizeConfig.fontSize}px system-ui, -apple-system, sans-serif`;
    this.ctx.textBaseline = "top";

    // Handle multi-line text by splitting on newlines
    const lines = text.split("\n");
    const lineHeight = sizeConfig.fontSize * lineHeightMult;

    lines.forEach((line, index) => {
      this.ctx.fillText(line, x, y + index * lineHeight);
    });

    this.ctx.restore();
  }

  /**
   * Render a step layer (circled number)
   * @param {Object} layer
   */
  renderStepLayer(layer) {
    const { symbol, x, y, colour, size } = layer.data;

    // Get size config from centralized defaults
    const sizeConfig = getTextSize(size);

    this.ctx.save();
    this.ctx.fillStyle = colour;
    this.ctx.font = `${sizeConfig.fontWeight} ${sizeConfig.fontSize}px system-ui, -apple-system, sans-serif`;
    this.ctx.textBaseline = "top";

    // Render the circled digit symbol
    this.ctx.fillText(symbol, x, y);

    this.ctx.restore();
  }

  /**
   * Render a symbol layer
   * @param {Object} layer
   */
  renderSymbolLayer(layer) {
    const { symbol, x, y, size } = layer.data;

    // Get size config from centralized defaults
    const sizeConfig = getTextSize(size);

    // Calculate scale factor relative to base size (md = 20px)
    // Emoji often ignore font-size, so we use canvas scaling instead
    const baseSize = 20;
    const scale = sizeConfig.fontSize / baseSize;

    this.ctx.save();
    // No fillStyle - symbols render with their native colours
    this.ctx.font = `${sizeConfig.fontWeight} ${baseSize}px system-ui, -apple-system, sans-serif`;
    this.ctx.textBaseline = "top";

    // Scale the context to achieve the desired size
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);

    // Render the symbol at origin (0,0) since we've translated
    this.ctx.fillText(symbol, 0, 0);

    this.ctx.restore();
  }

  /**
   * Render a shape layer (rectangle)
   * @param {Object} layer
   */
  renderShapeLayer(layer) {
    const { x, y, width, height, borderColour, fillColour, borderWidth, lineStyle, cornerStyle } = layer.data;

    this.ctx.save();

    // Set line style
    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeStyle = borderColour;

    // Set line dash pattern and cap based on style (scales with border width)
    // For larger widths, reduce both dash length and gap to avoid overly long dashes
    const gapMult = getDashGapMultiplier(borderWidth);
    // Dash length multiplier: XS/SM=4, MD=3.5, LG=2.55 (-15%), XL=1.75 (-30%)
    const dashLengthMult = borderWidth <= 2 ? 4 : borderWidth <= 4 ? 3.5 : borderWidth <= 8 ? 2.55 : 1.75;
    // Dot gap multiplier: XS=3.16 (+26.5%), SM/MD=2.5, LG=2.125 (-15%), XL=3.0
    const dotGapMult = borderWidth <= 1 ? 3.16 : borderWidth <= 4 ? 2.5 : borderWidth <= 8 ? 2.125 : 3.0;
    if (lineStyle === "dashed") {
      this.ctx.lineCap = "butt";
      this.ctx.setLineDash([borderWidth * dashLengthMult, borderWidth * 2 * gapMult]);
    } else if (lineStyle === "dotted") {
      this.ctx.lineCap = "round";
      this.ctx.setLineDash([0.1, borderWidth * dotGapMult * gapMult]);
    } else {
      this.ctx.setLineDash([]);
    }

    // Calculate corner radius based on corner style and border width
    const cornerRadius = cornerStyle === "rounded" ? borderWidth * 2 : 0;

    // Draw fill if not transparent
    if (fillColour !== "transparent") {
      this.ctx.fillStyle = fillColour;
      if (cornerRadius > 0) {
        this.drawRoundedRect(x, y, width, height, cornerRadius, true, false);
      } else {
        this.ctx.fillRect(x, y, width, height);
      }
    }

    // Draw border
    if (cornerRadius > 0) {
      this.drawRoundedRect(x, y, width, height, cornerRadius, false, true);
    } else {
      this.ctx.strokeRect(x, y, width, height);
    }

    this.ctx.restore();
  }

  /**
   * Render a highlight layer
   * @param {Object} layer
   */
  renderHighlightLayer(layer) {
    const { x, y, width, height, colour } = layer.data;

    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    this.ctx.fillStyle = colour;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.restore();
  }

  /**
   * Draw a rounded rectangle helper
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} radius
   * @param {boolean} fill - Whether to fill
   * @param {boolean} stroke - Whether to stroke
   */
  drawRoundedRect(x, y, width, height, radius, fill, stroke) {
    // Ensure radius doesn't exceed half the smallest dimension
    radius = Math.min(radius, width / 2, height / 2);

    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();

    if (fill) this.ctx.fill();
    if (stroke) this.ctx.stroke();
  }

  /**
   * Get mouse coordinates relative to canvas
   * Accounts for CSS scaling (zoom) by converting from display coords to canvas coords
   * @param {MouseEvent} e
   * @returns {{x: number, y: number}}
   */
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    // Calculate scale factor: CSS display size vs actual canvas size
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  /**
   * Export canvas as data URL
   * @param {number|null} targetWidth - Optional target width for resize
   * @param {number|null} targetHeight - Optional target height for resize
   * @returns {string} PNG data URL
   */
  toDataURL(targetWidth = null, targetHeight = null) {
    // If no resize needed, return canvas directly
    if (!targetWidth && !targetHeight) {
      return this.canvas.toDataURL("image/png");
    }

    // Calculate dimensions maintaining aspect ratio
    const aspectRatio = this.width / this.height;
    let newWidth, newHeight;

    if (targetWidth && !targetHeight) {
      newWidth = targetWidth;
      newHeight = Math.round(targetWidth / aspectRatio);
    } else if (targetHeight && !targetWidth) {
      newHeight = targetHeight;
      newWidth = Math.round(targetHeight * aspectRatio);
    } else {
      // Both specified - use width (could also error here)
      newWidth = targetWidth;
      newHeight = Math.round(targetWidth / aspectRatio);
    }

    // Create temporary canvas for resize
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext("2d");

    // Use high-quality scaling
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = "high";

    // Draw scaled image
    tempCtx.drawImage(this.canvas, 0, 0, newWidth, newHeight);

    return tempCanvas.toDataURL("image/png");
  }

  /**
   * Get the canvas element (for print/preview)
   * @returns {HTMLCanvasElement}
   */
  getCanvas() {
    return this.canvas;
  }
}
