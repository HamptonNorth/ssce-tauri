/**
 * Cut Tool
 * Removes a horizontal or vertical strip from the image and joins the remaining parts.
 * Optionally applies a fade effect at the join.
 *
 * Usage:
 * 1. Activate Cut tool
 * 2. Click and drag to define cut strip (two parallel lines)
 * 3. Orientation determined by drag direction
 * 4. Drag handles to adjust strip position/width
 * 5. Toggle "Fade join" checkbox for smooth blending
 * 6. Ctrl+Enter to apply, Escape to cancel
 */

import { state, modules } from "../state.js";
import { DragHandleSet, HandleType } from "../utils/drag-handles.js";
import { flattenToImage, replaceWithImage } from "../utils/image-ops.js";
import { makeDraggable } from "../utils/draggable-panel.js";

export class CutTool {
  constructor(canvasManager, layerManager, notifyChange) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;
    this.notifyChange = notifyChange;

    // Cut state - defines a strip between two parallel lines
    this.cutStrip = null; // { orientation: 'h'|'v', line1: number, line2: number }
    this.isDrawing = false;
    this.startPoint = null;
    this.orientationLocked = false;

    // Fade option
    this.fadeEnabled = false;
    this.fadeWidth = 20;

    // Drag handles for the two lines
    this.handles = new DragHandleSet({
      type: HandleType.ENDPOINT,
      size: 10,
      hitArea: 14,
      shape: "circle",
      fill: "#EF4444",
      stroke: "#FFFFFF",
    });

    // Which line is being dragged (1 or 2)
    this.draggingLine = null;

    // Minimum strip width
    this.minStripWidth = 10;

    // Draggable panel controller
    this.panelDraggable = null;

    // Bind event handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleFadeToggle = this.handleFadeToggle.bind(this);
  }

  getZoomScale() {
    return state.zoomScale || 1.0;
  }

  screenToCanvas(screenX, screenY) {
    const scale = this.getZoomScale();
    return {
      x: screenX / scale,
      y: screenY / scale,
    };
  }

  getScaledSize(baseSize) {
    const scale = this.getZoomScale();
    return baseSize / scale;
  }

  activate() {
    const canvas = this.canvasManager.getCanvas();

    // Reset state
    this.cutStrip = null;
    this.isDrawing = false;
    this.startPoint = null;
    this.orientationLocked = false;
    this.draggingLine = null;

    // Calculate fade width based on image size (10% of smallest dimension, min 40px)
    const size = this.canvasManager.getSize();
    const minDim = Math.min(size.width, size.height);
    this.fadeWidth = Math.max(40, Math.round(minDim * 0.1));

    // Add event listeners
    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mouseup", this.handleMouseUp);
    document.addEventListener("keydown", this.handleKeyDown);

    // Show options panel
    this.showOptionsPanel();

    // Set cursor
    canvas.style.cursor = "crosshair";
  }

  deactivate() {
    const canvas = this.canvasManager.getCanvas();

    canvas.removeEventListener("mousedown", this.handleMouseDown);
    canvas.removeEventListener("mousemove", this.handleMouseMove);
    canvas.removeEventListener("mouseup", this.handleMouseUp);
    document.removeEventListener("keydown", this.handleKeyDown);

    this.hideOptionsPanel();

    this.cutStrip = null;
    this.canvasManager.render();
  }

  showOptionsPanel() {
    let panel = document.getElementById("cut-options");
    const isNewPanel = !panel;

    if (isNewPanel) {
      panel = document.createElement("div");
      panel.id = "cut-options";
      panel.className = "fixed bg-gray-800 rounded-lg p-3 shadow-lg z-50 border border-gray-600";
      panel.innerHTML = `
        <div class="text-sm font-medium text-gray-200 pb-2 text-center border-b border-gray-600" data-drag-handle>Cut Tool</div>
        <label class="flex items-center gap-2 cursor-pointer mt-2 mb-2">
          <input type="checkbox" id="cut-fade" class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500" />
          <span class="text-sm text-gray-300">Fade join</span>
        </label>
        <div id="cut-fade-options" class="hidden mb-2">
          <label class="text-xs text-gray-400 block mb-1">Fade width: <span id="cut-fade-value">${this.fadeWidth}px</span></label>
          <input type="range" id="cut-fade-slider" min="10" max="200" value="${this.fadeWidth}" class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div class="text-xs text-gray-500 pt-2 mt-2">
          Drag to define cut strip<br>
          Ctrl+Enter to apply<br>
          Escape to cancel
        </div>
      `;
      document.body.appendChild(panel);

      // Make panel draggable
      this.panelDraggable = makeDraggable(panel, {
        storageKey: "ssce_cutPanelPos",
        defaultPosition: { right: 16, bottom: 64 },
      });
    }

    panel.classList.remove("hidden");

    const fadeCheckbox = document.getElementById("cut-fade");
    const fadeOptions = document.getElementById("cut-fade-options");
    const fadeSlider = document.getElementById("cut-fade-slider");
    const fadeValue = document.getElementById("cut-fade-value");

    if (fadeCheckbox) {
      fadeCheckbox.checked = this.fadeEnabled;
      fadeCheckbox.addEventListener("change", this.handleFadeToggle);
      // Show/hide slider based on checkbox state
      if (fadeOptions) {
        fadeOptions.classList.toggle("hidden", !this.fadeEnabled);
      }
    }

    if (fadeSlider) {
      fadeSlider.value = this.fadeWidth;
      fadeSlider.addEventListener("input", (e) => {
        this.fadeWidth = parseInt(e.target.value);
        if (fadeValue) {
          fadeValue.textContent = `${this.fadeWidth}px`;
        }
        this.render();
      });
    }
  }

  hideOptionsPanel() {
    const panel = document.getElementById("cut-options");
    if (panel) {
      const fadeCheckbox = document.getElementById("cut-fade");
      if (fadeCheckbox) {
        fadeCheckbox.removeEventListener("change", this.handleFadeToggle);
      }
      panel.classList.add("hidden");
    }
    // Note: Don't destroy panelDraggable here - it persists for position memory
  }

  handleFadeToggle(e) {
    this.fadeEnabled = e.target.checked;
    const fadeOptions = document.getElementById("cut-fade-options");
    if (fadeOptions) {
      fadeOptions.classList.toggle("hidden", !this.fadeEnabled);
    }
    this.render();
  }

  handleMouseDown(e) {
    if (e.button !== 0) return;

    const rect = this.canvasManager.getCanvas().getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const coords = this.screenToCanvas(screenX, screenY);
    const size = this.canvasManager.getSize();

    // Check if clicking on a handle to adjust existing strip
    if (this.cutStrip) {
      const hitLine = this.hitTestLines(coords.x, coords.y);
      if (hitLine) {
        this.draggingLine = hitLine;
        return;
      }
    }

    // Start new cut strip
    this.isDrawing = true;
    this.startPoint = coords;
    this.orientationLocked = false;
    this.cutStrip = null;
  }

  hitTestLines(x, y) {
    if (!this.cutStrip) return null;

    const hitArea = this.getScaledSize(14);
    const size = this.canvasManager.getSize();

    if (this.cutStrip.orientation === "h") {
      // Horizontal lines - check Y distance
      if (Math.abs(y - this.cutStrip.line1) < hitArea) return 1;
      if (Math.abs(y - this.cutStrip.line2) < hitArea) return 2;
    } else {
      // Vertical lines - check X distance
      if (Math.abs(x - this.cutStrip.line1) < hitArea) return 1;
      if (Math.abs(x - this.cutStrip.line2) < hitArea) return 2;
    }
    return null;
  }

  handleMouseMove(e) {
    const rect = this.canvasManager.getCanvas().getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const coords = this.screenToCanvas(screenX, screenY);
    const canvas = this.canvasManager.getCanvas();
    const size = this.canvasManager.getSize();

    // Dragging a line handle
    if (this.draggingLine && this.cutStrip) {
      if (this.cutStrip.orientation === "h") {
        const newY = Math.max(0, Math.min(size.height, coords.y));
        if (this.draggingLine === 1) {
          this.cutStrip.line1 = newY;
        } else {
          this.cutStrip.line2 = newY;
        }
      } else {
        const newX = Math.max(0, Math.min(size.width, coords.x));
        if (this.draggingLine === 1) {
          this.cutStrip.line1 = newX;
        } else {
          this.cutStrip.line2 = newX;
        }
      }
      this.render();
      return;
    }

    // Drawing new strip
    if (this.isDrawing && this.startPoint) {
      const dx = coords.x - this.startPoint.x;
      const dy = coords.y - this.startPoint.y;

      // Determine orientation after 5px of movement
      if (!this.orientationLocked && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        this.orientationLocked = true;
        if (Math.abs(dy) > Math.abs(dx)) {
          // Vertical drag = horizontal cut (remove horizontal strip)
          this.cutStrip = {
            orientation: "h",
            line1: this.startPoint.y,
            line2: this.startPoint.y,
          };
        } else {
          // Horizontal drag = vertical cut (remove vertical strip)
          this.cutStrip = {
            orientation: "v",
            line1: this.startPoint.x,
            line2: this.startPoint.x,
          };
        }
      }

      // Update second line position
      if (this.cutStrip) {
        if (this.cutStrip.orientation === "h") {
          this.cutStrip.line2 = Math.max(0, Math.min(size.height, coords.y));
        } else {
          this.cutStrip.line2 = Math.max(0, Math.min(size.width, coords.x));
        }
      }

      this.render();
      return;
    }

    // Update cursor based on hover
    if (this.cutStrip) {
      const hitLine = this.hitTestLines(coords.x, coords.y);
      if (hitLine) {
        canvas.style.cursor = this.cutStrip.orientation === "h" ? "ns-resize" : "ew-resize";
      } else {
        canvas.style.cursor = "crosshair";
      }
    }
  }

  handleMouseUp(e) {
    this.isDrawing = false;
    this.draggingLine = null;
  }

  handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      // Abandon any cut strip, stay in cut tool
      if (this.cutStrip) {
        this.cutStrip = null;
        this.render();
      }
    } else if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      if (this.cutStrip) {
        this.applyCut();
      }
    }
  }

  render() {
    this.canvasManager.render();

    if (!this.cutStrip) return;

    const ctx = this.canvasManager.getCanvas().getContext("2d");
    const size = this.canvasManager.getSize();

    // Ensure line1 < line2 for drawing
    const min = Math.min(this.cutStrip.line1, this.cutStrip.line2);
    const max = Math.max(this.cutStrip.line1, this.cutStrip.line2);

    ctx.save();

    // Draw semi-transparent overlay on the strip being cut
    ctx.fillStyle = "rgba(239, 68, 68, 0.3)"; // Red tint
    if (this.cutStrip.orientation === "h") {
      ctx.fillRect(0, min, size.width, max - min);
    } else {
      ctx.fillRect(min, 0, max - min, size.height);
    }

    // Draw the two cut lines with double-line technique for visibility on any background
    // First: white solid line (background), then red dashed line on top
    const lineWidth = this.getScaledSize(2);
    const dashLength = this.getScaledSize(6);
    const gapLength = this.getScaledSize(3);

    // Draw white background line (solid)
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);

    ctx.beginPath();
    if (this.cutStrip.orientation === "h") {
      ctx.moveTo(0, this.cutStrip.line1);
      ctx.lineTo(size.width, this.cutStrip.line1);
      ctx.moveTo(0, this.cutStrip.line2);
      ctx.lineTo(size.width, this.cutStrip.line2);
    } else {
      ctx.moveTo(this.cutStrip.line1, 0);
      ctx.lineTo(this.cutStrip.line1, size.height);
      ctx.moveTo(this.cutStrip.line2, 0);
      ctx.lineTo(this.cutStrip.line2, size.height);
    }
    ctx.stroke();

    // Draw red dashed line on top
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([dashLength, gapLength]);

    ctx.beginPath();
    if (this.cutStrip.orientation === "h") {
      ctx.moveTo(0, this.cutStrip.line1);
      ctx.lineTo(size.width, this.cutStrip.line1);
      ctx.moveTo(0, this.cutStrip.line2);
      ctx.lineTo(size.width, this.cutStrip.line2);
    } else {
      ctx.moveTo(this.cutStrip.line1, 0);
      ctx.lineTo(this.cutStrip.line1, size.height);
      ctx.moveTo(this.cutStrip.line2, 0);
      ctx.lineTo(this.cutStrip.line2, size.height);
    }
    ctx.stroke();

    ctx.restore();

    // Draw handles at line midpoints
    this.renderHandles(ctx, size);

    // Draw dimension info
    this.renderDimensionInfo(ctx, size, min, max);
  }

  renderHandles(ctx, size) {
    const handleSize = this.getScaledSize(8);
    const strokeWidth = this.getScaledSize(1.5);

    ctx.save();
    ctx.fillStyle = "#EF4444";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = strokeWidth;

    if (this.cutStrip.orientation === "h") {
      // Handles at center of each horizontal line
      const cx = size.width / 2;
      ctx.beginPath();
      ctx.arc(cx, this.cutStrip.line1, handleSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, this.cutStrip.line2, handleSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else {
      // Handles at center of each vertical line
      const cy = size.height / 2;
      ctx.beginPath();
      ctx.arc(this.cutStrip.line1, cy, handleSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.cutStrip.line2, cy, handleSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  renderDimensionInfo(ctx, size, min, max) {
    const stripWidth = Math.round(max - min);
    if (stripWidth < 1) return;

    const fontSize = this.getScaledSize(12);
    const padding = this.getScaledSize(6);

    ctx.save();
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let text, x, y;
    if (this.cutStrip.orientation === "h") {
      const remaining = size.height - stripWidth;
      text = `Cut ${stripWidth}px (${remaining}px remaining)`;
      x = size.width / 2;
      y = (min + max) / 2;
    } else {
      const remaining = size.width - stripWidth;
      text = `Cut ${stripWidth}px (${remaining}px remaining)`;
      x = (min + max) / 2;
      y = size.height / 2;
    }

    // Background
    const metrics = ctx.measureText(text);
    const bgPadding = this.getScaledSize(4);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(x - metrics.width / 2 - bgPadding, y - fontSize / 2 - bgPadding, metrics.width + bgPadding * 2, fontSize + bgPadding * 2);

    // Text
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  async applyCut() {
    if (!this.cutStrip) return;

    const size = this.canvasManager.getSize();
    const min = Math.min(this.cutStrip.line1, this.cutStrip.line2);
    const max = Math.max(this.cutStrip.line1, this.cutStrip.line2);
    const stripWidth = max - min;

    if (stripWidth < 1) {
      import("../utils/toast.js").then((t) => t.showToast("Cut strip too narrow", "error"));
      return;
    }

    try {
      const flatImage = await flattenToImage(this.canvasManager, this.layerManager);

      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = flatImage.width;
      sourceCanvas.height = flatImage.height;
      const sourceCtx = sourceCanvas.getContext("2d");
      sourceCtx.drawImage(flatImage, 0, 0);

      let resultCanvas;
      if (this.cutStrip.orientation === "h") {
        resultCanvas = this.performHorizontalCut(sourceCanvas, min, max);
      } else {
        resultCanvas = this.performVerticalCut(sourceCanvas, min, max);
      }

      const resultImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = resultCanvas.toDataURL("image/png");
      });

      replaceWithImage(this.layerManager, this.canvasManager, resultImage);

      if (this.notifyChange) {
        this.notifyChange();
      }

      import("../utils/zoom.js").then((zoom) => zoom.recalculateZoom());
      import("../utils/toast.js").then((t) => t.showToast(`Cut applied: ${resultImage.width} × ${resultImage.height}`, "success"));

      // Reset cut strip for next cut (stay in cut tool)
      this.cutStrip = null;
      this.render();
    } catch (error) {
      console.error("Cut failed:", error);
      import("../utils/toast.js").then((t) => t.showToast("Cut failed", "error"));
    }
  }

  performHorizontalCut(sourceCanvas, min, max) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const stripHeight = max - min;
    const topHeight = min;
    const bottomHeight = height - max;

    if (!this.fadeEnabled) {
      // Simple join - no fade
      const newHeight = height - stripHeight;
      const resultCanvas = document.createElement("canvas");
      resultCanvas.width = width;
      resultCanvas.height = newHeight;
      const resultCtx = resultCanvas.getContext("2d");

      // Draw top section
      if (topHeight > 0) {
        resultCtx.drawImage(sourceCanvas, 0, 0, width, topHeight, 0, 0, width, topHeight);
      }
      // Draw bottom section directly after top
      if (bottomHeight > 0) {
        resultCtx.drawImage(sourceCanvas, 0, max, width, bottomHeight, 0, topHeight, width, bottomHeight);
      }
      return resultCanvas;
    }

    // Fade join with transparent gap:
    // - Top section: solid part + fade to transparent
    // - Gap: transparent space
    // - Bottom section: fade from transparent + solid part
    const fadeHeight = Math.min(this.fadeWidth, topHeight, bottomHeight);
    const gapHeight = Math.round(fadeHeight * 0.2); // 20% of fade width as transparent gap

    // Calculate heights
    const topSolidHeight = topHeight - fadeHeight;
    const bottomSolidHeight = bottomHeight - fadeHeight;
    const newHeight = topSolidHeight + fadeHeight + gapHeight + fadeHeight + bottomSolidHeight;

    const resultCanvas = document.createElement("canvas");
    resultCanvas.width = width;
    resultCanvas.height = newHeight;
    const resultCtx = resultCanvas.getContext("2d");

    let destY = 0;

    // Draw top section's solid part
    if (topSolidHeight > 0) {
      resultCtx.drawImage(sourceCanvas, 0, 0, width, topSolidHeight, 0, destY, width, topSolidHeight);
      destY += topSolidHeight;
    }

    // Draw top section's fade zone (solid -> transparent)
    const topFadeSourceY = topHeight - fadeHeight;
    for (let y = 0; y < fadeHeight; y++) {
      const alpha = 1 - y / fadeHeight; // 1 -> 0
      resultCtx.globalAlpha = alpha;
      resultCtx.drawImage(sourceCanvas, 0, topFadeSourceY + y, width, 1, 0, destY + y, width, 1);
    }
    destY += fadeHeight;

    // Gap - transparent space (just advance destY)
    destY += gapHeight;

    // Draw bottom section's fade zone (transparent -> solid)
    for (let y = 0; y < fadeHeight; y++) {
      const alpha = y / fadeHeight; // 0 -> 1
      resultCtx.globalAlpha = alpha;
      resultCtx.drawImage(sourceCanvas, 0, max + y, width, 1, 0, destY + y, width, 1);
    }
    destY += fadeHeight;

    // Draw bottom section's solid part
    resultCtx.globalAlpha = 1;
    if (bottomSolidHeight > 0) {
      resultCtx.drawImage(sourceCanvas, 0, max + fadeHeight, width, bottomSolidHeight, 0, destY, width, bottomSolidHeight);
    }

    return resultCanvas;
  }

  performVerticalCut(sourceCanvas, min, max) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const stripWidth = max - min;
    const leftWidth = min;
    const rightWidth = width - max;

    if (!this.fadeEnabled) {
      // Simple join - no fade
      const newWidth = width - stripWidth;
      const resultCanvas = document.createElement("canvas");
      resultCanvas.width = newWidth;
      resultCanvas.height = height;
      const resultCtx = resultCanvas.getContext("2d");

      // Draw left section
      if (leftWidth > 0) {
        resultCtx.drawImage(sourceCanvas, 0, 0, leftWidth, height, 0, 0, leftWidth, height);
      }
      // Draw right section directly after left
      if (rightWidth > 0) {
        resultCtx.drawImage(sourceCanvas, max, 0, rightWidth, height, leftWidth, 0, rightWidth, height);
      }
      return resultCanvas;
    }

    // Fade join with transparent gap:
    // - Left section: solid part + fade to transparent
    // - Gap: transparent space
    // - Right section: fade from transparent + solid part
    const fadeWidth = Math.min(this.fadeWidth, leftWidth, rightWidth);
    const gapWidth = Math.round(fadeWidth * 0.2); // 20% of fade width as transparent gap

    // Calculate widths
    const leftSolidWidth = leftWidth - fadeWidth;
    const rightSolidWidth = rightWidth - fadeWidth;
    const newWidth = leftSolidWidth + fadeWidth + gapWidth + fadeWidth + rightSolidWidth;

    const resultCanvas = document.createElement("canvas");
    resultCanvas.width = newWidth;
    resultCanvas.height = height;
    const resultCtx = resultCanvas.getContext("2d");

    let destX = 0;

    // Draw left section's solid part
    if (leftSolidWidth > 0) {
      resultCtx.drawImage(sourceCanvas, 0, 0, leftSolidWidth, height, destX, 0, leftSolidWidth, height);
      destX += leftSolidWidth;
    }

    // Draw left section's fade zone (solid -> transparent)
    const leftFadeSourceX = leftWidth - fadeWidth;
    for (let x = 0; x < fadeWidth; x++) {
      const alpha = 1 - x / fadeWidth; // 1 -> 0
      resultCtx.globalAlpha = alpha;
      resultCtx.drawImage(sourceCanvas, leftFadeSourceX + x, 0, 1, height, destX + x, 0, 1, height);
    }
    destX += fadeWidth;

    // Gap - transparent space (just advance destX)
    destX += gapWidth;

    // Draw right section's fade zone (transparent -> solid)
    for (let x = 0; x < fadeWidth; x++) {
      const alpha = x / fadeWidth; // 0 -> 1
      resultCtx.globalAlpha = alpha;
      resultCtx.drawImage(sourceCanvas, max + x, 0, 1, height, destX + x, 0, 1, height);
    }
    destX += fadeWidth;

    // Draw right section's solid part
    resultCtx.globalAlpha = 1;
    if (rightSolidWidth > 0) {
      resultCtx.drawImage(sourceCanvas, max + fadeWidth, 0, rightSolidWidth, height, destX, 0, rightSolidWidth, height);
    }

    return resultCanvas;
  }
}
