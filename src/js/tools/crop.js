/**
 * SSCE - Crop Tool
 *
 * Allows cropping the canvas to a selected region.
 * - Drag handles at corners and edges to adjust crop region
 * - Drag inside region to move it
 * - Ctrl+Enter to apply, Escape to cancel
 * - Works on flattened canvas (destructive operation)
 */

import { DragHandleSet, HandleType } from "../utils/drag-handles.js";
import { flattenToImage, replaceWithImage } from "../utils/image-ops.js";
import { state } from "../state.js";
import { showSpinner, hideSpinner } from "../utils/spinner.js";

export class CropTool {
  constructor(canvasManager, layerManager, notifyChange) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;
    this.notifyChange = notifyChange;
    this.isActive = false;

    // Crop region (in canvas coordinates)
    this.cropRegion = { x: 0, y: 0, width: 0, height: 0 };

    // Drag handles for crop region
    this.handles = new DragHandleSet({
      type: HandleType.ALL,
      size: 10,
      hitArea: 12,
      shape: "square",
      fill: "#FFFFFF",
      stroke: "#000000",
    });

    // Dragging state
    this.isDragging = false;
    this.activeHandle = null; // Handle being dragged, or null for region move
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.regionStartX = 0;
    this.regionStartY = 0;
    this.regionStartWidth = 0;
    this.regionStartHeight = 0;

    // Minimum crop size
    this.minSize = 10;

    // Base sizes for UI elements (at 100% zoom)
    this.baseHandleSize = 10;
    this.baseHitArea = 12;
    this.baseFontSize = 12;
    this.baseLineWidth = 1;

    // Bind event handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Activate the crop tool
   */
  activate() {
    this.isActive = true;

    // Initialize crop region to full canvas
    const size = this.canvasManager.getSize();
    this.cropRegion = {
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
    };

    // Add event listeners
    const canvas = this.canvasManager.getCanvas();
    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mouseup", this.handleMouseUp);
    canvas.addEventListener("mouseleave", this.handleMouseUp);
    document.addEventListener("keydown", this.handleKeyDown);

    // Render initial state
    this.render();
  }

  /**
   * Deactivate the crop tool
   */
  deactivate() {
    this.isActive = false;
    this.isDragging = false;
    this.activeHandle = null;

    // Remove event listeners
    const canvas = this.canvasManager.getCanvas();
    canvas.removeEventListener("mousedown", this.handleMouseDown);
    canvas.removeEventListener("mousemove", this.handleMouseMove);
    canvas.removeEventListener("mouseup", this.handleMouseUp);
    canvas.removeEventListener("mouseleave", this.handleMouseUp);
    document.removeEventListener("keydown", this.handleKeyDown);

    // Reset cursor
    canvas.style.cursor = "";

    // Re-render without crop overlay
    this.canvasManager.render();
  }

  /**
   * Get current zoom scale (1.0 = 100%, 0.5 = 50%, etc.)
   */
  getZoomScale() {
    return state.zoomScale || 1.0;
  }

  /**
   * Convert screen coordinates to canvas coordinates
   * Accounts for CSS zoom scaling
   */
  screenToCanvas(screenX, screenY) {
    const scale = this.getZoomScale();
    return {
      x: screenX / scale,
      y: screenY / scale,
    };
  }

  /**
   * Get scaled size for UI elements (larger when zoomed out)
   */
  getScaledSize(baseSize) {
    const scale = this.getZoomScale();
    return baseSize / scale;
  }

  /**
   * Handle mouse down - start dragging handle or region
   */
  handleMouseDown(e) {
    if (!this.isActive || e.button !== 0) return;

    // getMousePos already converts screen coords to canvas coords (accounting for zoom)
    const pos = this.canvasManager.getMousePos(e);
    const x = pos.x;
    const y = pos.y;

    // Update handle positions and check for hit
    this.updateHandlePositions();
    const hitHandle = this.handles.hitTest(x, y);

    if (hitHandle) {
      // Start dragging a handle
      this.isDragging = true;
      this.activeHandle = hitHandle;
    } else if (this.isPointInRegion(x, y)) {
      // Start dragging the entire region
      this.isDragging = true;
      this.activeHandle = null;
    } else {
      return; // Clicked outside
    }

    // Store drag start state
    this.dragStartX = x;
    this.dragStartY = y;
    this.regionStartX = this.cropRegion.x;
    this.regionStartY = this.cropRegion.y;
    this.regionStartWidth = this.cropRegion.width;
    this.regionStartHeight = this.cropRegion.height;
  }

  /**
   * Handle mouse move - update crop region
   */
  handleMouseMove(e) {
    if (!this.isActive) return;

    // getMousePos already converts screen coords to canvas coords (accounting for zoom)
    const pos = this.canvasManager.getMousePos(e);
    const x = pos.x;
    const y = pos.y;

    // Update cursor based on what's under mouse
    if (!this.isDragging) {
      this.updateHandlePositions();
      const hitHandle = this.handles.hitTest(x, y);

      if (hitHandle) {
        this.canvasManager.getCanvas().style.cursor = this.handles.getCursor(hitHandle);
      } else if (this.isPointInRegion(x, y)) {
        this.canvasManager.getCanvas().style.cursor = "move";
      } else {
        this.canvasManager.getCanvas().style.cursor = "default";
      }
      return;
    }

    const dx = x - this.dragStartX;
    const dy = y - this.dragStartY;
    const canvasSize = this.canvasManager.getSize();

    if (this.activeHandle) {
      // Resize based on which handle is being dragged
      this.resizeRegion(this.activeHandle, dx, dy, canvasSize);
    } else {
      // Move the entire region
      this.moveRegion(dx, dy, canvasSize);
    }

    this.render();
  }

  /**
   * Handle mouse up - finish dragging
   */
  handleMouseUp(e) {
    if (!this.isActive) return;
    this.isDragging = false;
    this.activeHandle = null;
  }

  /**
   * Handle keyboard input
   */
  handleKeyDown(e) {
    if (!this.isActive) return;

    // Ctrl+Enter to apply crop
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      this.applyCrop();
      return;
    }

    // Escape to cancel
    if (e.key === "Escape") {
      e.preventDefault();
      // Deactivate tool - switch back to select
      import("../ui/toolbar.js").then((toolbar) => {
        toolbar.setActiveTool("select");
      });
      return;
    }

    // Arrow keys to nudge region
    const nudgeAmount = e.shiftKey ? 10 : 1;
    const canvasSize = this.canvasManager.getSize();

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        this.cropRegion.y = Math.max(0, this.cropRegion.y - nudgeAmount);
        break;
      case "ArrowDown":
        e.preventDefault();
        this.cropRegion.y = Math.min(canvasSize.height - this.cropRegion.height, this.cropRegion.y + nudgeAmount);
        break;
      case "ArrowLeft":
        e.preventDefault();
        this.cropRegion.x = Math.max(0, this.cropRegion.x - nudgeAmount);
        break;
      case "ArrowRight":
        e.preventDefault();
        this.cropRegion.x = Math.min(canvasSize.width - this.cropRegion.width, this.cropRegion.x + nudgeAmount);
        break;
      default:
        return;
    }

    this.render();
  }

  /**
   * Resize crop region based on handle being dragged
   */
  resizeRegion(handle, dx, dy, canvasSize) {
    let { x, y, width, height } = {
      x: this.regionStartX,
      y: this.regionStartY,
      width: this.regionStartWidth,
      height: this.regionStartHeight,
    };

    // Adjust based on handle position
    switch (handle) {
      case "tl": // Top-left
        x += dx;
        y += dy;
        width -= dx;
        height -= dy;
        break;
      case "t": // Top
        y += dy;
        height -= dy;
        break;
      case "tr": // Top-right
        y += dy;
        width += dx;
        height -= dy;
        break;
      case "l": // Left
        x += dx;
        width -= dx;
        break;
      case "r": // Right
        width += dx;
        break;
      case "bl": // Bottom-left
        x += dx;
        width -= dx;
        height += dy;
        break;
      case "b": // Bottom
        height += dy;
        break;
      case "br": // Bottom-right
        width += dx;
        height += dy;
        break;
    }

    // Enforce minimum size
    if (width < this.minSize) {
      if (handle.includes("l")) {
        x = this.regionStartX + this.regionStartWidth - this.minSize;
      }
      width = this.minSize;
    }
    if (height < this.minSize) {
      if (handle.includes("t")) {
        y = this.regionStartY + this.regionStartHeight - this.minSize;
      }
      height = this.minSize;
    }

    // Constrain to canvas bounds
    if (x < 0) {
      width += x;
      x = 0;
    }
    if (y < 0) {
      height += y;
      y = 0;
    }
    if (x + width > canvasSize.width) {
      width = canvasSize.width - x;
    }
    if (y + height > canvasSize.height) {
      height = canvasSize.height - y;
    }

    this.cropRegion = { x, y, width, height };
  }

  /**
   * Move entire crop region
   */
  moveRegion(dx, dy, canvasSize) {
    let x = this.regionStartX + dx;
    let y = this.regionStartY + dy;

    // Constrain to canvas bounds
    x = Math.max(0, Math.min(canvasSize.width - this.cropRegion.width, x));
    y = Math.max(0, Math.min(canvasSize.height - this.cropRegion.height, y));

    this.cropRegion.x = x;
    this.cropRegion.y = y;
  }

  /**
   * Check if point is inside crop region
   */
  isPointInRegion(x, y) {
    const r = this.cropRegion;
    return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
  }

  /**
   * Update handle positions and sizes based on current crop region and zoom
   */
  updateHandlePositions() {
    const r = this.cropRegion;

    // Scale handle sizes inversely with zoom so they appear constant on screen
    this.handles.handleSize = this.getScaledSize(this.baseHandleSize);
    this.handles.hitArea = this.getScaledSize(this.baseHitArea);

    this.handles.setRect(r.x, r.y, r.width, r.height);
  }

  /**
   * Render crop overlay and handles
   */
  render() {
    // First render the base canvas
    this.canvasManager.render();

    const ctx = this.canvasManager.ctx;
    const canvasSize = this.canvasManager.getSize();
    const r = this.cropRegion;

    // Get scaled sizes for consistent screen appearance
    const scaledLineWidth = this.getScaledSize(this.baseLineWidth);
    const scaledFontSize = this.getScaledSize(this.baseFontSize);
    const scaledDash = this.getScaledSize(5);
    const scaledPadding = this.getScaledSize(5);
    const scaledTextPadding = this.getScaledSize(20);

    ctx.save();

    // Draw semi-transparent overlay outside crop region
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

    // Top region
    ctx.fillRect(0, 0, canvasSize.width, r.y);
    // Bottom region
    ctx.fillRect(0, r.y + r.height, canvasSize.width, canvasSize.height - r.y - r.height);
    // Left region
    ctx.fillRect(0, r.y, r.x, r.height);
    // Right region
    ctx.fillRect(r.x + r.width, r.y, canvasSize.width - r.x - r.width, r.height);

    // Draw crop region border (dashed) - scaled for zoom
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = scaledLineWidth;
    ctx.setLineDash([scaledDash, scaledDash]);
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.width - 1, r.height - 1);

    // Draw second border offset for visibility
    ctx.strokeStyle = "#000000";
    ctx.lineDashOffset = scaledDash;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.width - 1, r.height - 1);

    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // Draw dimension text - scaled for zoom
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `${scaledFontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const dimensionText = `${Math.round(r.width)} × ${Math.round(r.height)}`;
    const textY = r.y > scaledTextPadding ? r.y - scaledPadding : r.y + r.height + scaledTextPadding * 0.75;
    ctx.fillText(dimensionText, r.x + r.width / 2, textY);

    // Draw handles - scaled for zoom
    this.updateHandlePositions();
    this.handles.render(ctx);

    // Draw instruction text at bottom - scaled for zoom
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `${scaledFontSize * 0.9}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("Ctrl+Enter to crop, Escape to cancel", canvasSize.width / 2, canvasSize.height - scaledPadding * 2);

    ctx.restore();
  }

  /**
   * Apply the crop operation
   */
  async applyCrop() {
    const r = this.cropRegion;

    // Validate crop region
    if (r.width < this.minSize || r.height < this.minSize) {
      import("../utils/toast.js").then((toast) => {
        toast.showToast("Crop region too small", "error");
      });
      return;
    }

    showSpinner();
    try {
      // Flatten all layers to a single image
      const flatImage = await flattenToImage(this.canvasManager, this.layerManager);

      // Create a new canvas for the cropped region
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = Math.round(r.width);
      cropCanvas.height = Math.round(r.height);
      const cropCtx = cropCanvas.getContext("2d");

      // Draw the cropped portion
      cropCtx.drawImage(flatImage, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), 0, 0, Math.round(r.width), Math.round(r.height));

      // Convert to image
      const croppedImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = cropCanvas.toDataURL("image/png");
      });

      // Replace all layers with cropped image
      replaceWithImage(this.layerManager, this.canvasManager, croppedImage);

      // Notify of change for undo
      if (this.notifyChange) {
        this.notifyChange();
      }

      // Recalculate zoom after crop (zoom to fit new size)
      import("../utils/zoom.js").then((zoom) => {
        zoom.recalculateZoom();
      });

      hideSpinner();

      // Show success message
      import("../utils/toast.js").then((toast) => {
        toast.showToast(`Cropped to ${croppedImage.width} × ${croppedImage.height}`, "success");
      });

      // Switch back to select tool
      import("../ui/toolbar.js").then((toolbar) => {
        toolbar.setActiveTool("select");
      });
    } catch (error) {
      hideSpinner();
      console.error("Crop failed:", error);
      import("../utils/toast.js").then((toast) => {
        toast.showToast("Crop failed", "error");
      });
    }
  }
}
