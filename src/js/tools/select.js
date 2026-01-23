/**
 * SSCE - Select Tool
 *
 * Allows selecting and moving existing layers (arrows, text, etc.)
 */

import { DragHandleSet, HandleType } from "../utils/drag-handles.js";
import { getTextSize, getTextLineHeight } from "../utils/config.js";

export class SelectTool {
  constructor(canvasManager, layerManager) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;
    this.isActive = false;
    this.selectedLayerIndices = []; // Array of selected layer indices (multi-select support)
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.layerStartPositions = []; // Store start positions for all selected layers

    // Drag handles for arrow/line endpoints (only works with single selection)
    this.lineHandles = new DragHandleSet({
      type: HandleType.ENDPOINT,
      size: 8,
      hitArea: 10,
      shape: "circle",
    });
    this.activeDragPoint = null; // 'start' or 'end' for arrows

    // Drag handles for rectangle corners (only works with single selection)
    this.rectHandles = new DragHandleSet({
      type: HandleType.CORNER,
      size: 8,
      hitArea: 10,
      shape: "square",
    });
    this.activeRectHandle = null; // 'tl', 'tr', 'bl', 'br' for rectangles
    this.rectOriginal = null; // Store original rect for resize calculations

    // Context menu reference
    this.contextMenu = null;

    // Bind event handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);

    // Store bound context menu handlers for removal
    this.contextMenuHandlers = {
      delete: () => this.deleteSelectedLayer(),
      bringToFront: () => this.bringToFront(),
      bringForward: () => this.bringForward(),
      sendBackward: () => this.sendBackward(),
      sendToBack: () => this.sendToBack(),
      flattenSelected: () => this.flattenSelected(),
      duplicate: () => this.duplicateSelectedLayers(),
    };
  }

  /**
   * Activate the select tool
   * @returns {void}
   */
  activate() {
    this.isActive = true;
    const canvas = this.canvasManager.canvas;
    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mouseup", this.handleMouseUp);
    canvas.addEventListener("contextmenu", this.handleContextMenu);

    // Get reference to context menu
    this.contextMenu = document.getElementById("layer-context-menu");

    // Wire up context menu buttons using stored handlers
    document.getElementById("context-delete").addEventListener("click", this.contextMenuHandlers.delete);
    document.getElementById("context-bring-to-front").addEventListener("click", this.contextMenuHandlers.bringToFront);
    document.getElementById("context-bring-forward").addEventListener("click", this.contextMenuHandlers.bringForward);
    document.getElementById("context-send-backward").addEventListener("click", this.contextMenuHandlers.sendBackward);
    document.getElementById("context-send-to-back").addEventListener("click", this.contextMenuHandlers.sendToBack);
    document.getElementById("context-flatten-selected").addEventListener("click", this.contextMenuHandlers.flattenSelected);
    document.getElementById("context-duplicate").addEventListener("click", this.contextMenuHandlers.duplicate);

    // Listen for clicks outside context menu to close it
    document.addEventListener("click", this.handleDocumentClick);
  }

  /**
   * Deactivate the select tool
   * @returns {void}
   */
  deactivate() {
    this.isActive = false;
    this.selectedLayerIndices = [];
    this.isDragging = false;
    const canvas = this.canvasManager.canvas;
    canvas.removeEventListener("mousedown", this.handleMouseDown);
    canvas.removeEventListener("mousemove", this.handleMouseMove);
    canvas.removeEventListener("mouseup", this.handleMouseUp);
    canvas.removeEventListener("contextmenu", this.handleContextMenu);
    document.removeEventListener("click", this.handleDocumentClick);

    // Remove context menu button listeners
    document.getElementById("context-delete").removeEventListener("click", this.contextMenuHandlers.delete);
    document.getElementById("context-bring-to-front").removeEventListener("click", this.contextMenuHandlers.bringToFront);
    document.getElementById("context-bring-forward").removeEventListener("click", this.contextMenuHandlers.bringForward);
    document.getElementById("context-send-backward").removeEventListener("click", this.contextMenuHandlers.sendBackward);
    document.getElementById("context-send-to-back").removeEventListener("click", this.contextMenuHandlers.sendToBack);
    document.getElementById("context-flatten-selected").removeEventListener("click", this.contextMenuHandlers.flattenSelected);
    document.getElementById("context-duplicate").removeEventListener("click", this.contextMenuHandlers.duplicate);

    // Hide context menu if visible
    if (this.contextMenu) {
      this.contextMenu.classList.add("hidden");
    }

    this.canvasManager.render();
  }

  /**
   * Handle mouse down - start selection or dragging
   * Supports multi-select with Ctrl+click
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
   */
  handleMouseDown(e) {
    if (!this.isActive) return;

    // Ignore right-click (button 2) - let context menu handle it
    if (e.button === 2) return;

    const pos = this.canvasManager.getMousePos(e);
    const x = pos.x;
    const y = pos.y;

    const layers = this.layerManager.layers;
    const ctrlPressed = e.ctrlKey || e.metaKey;

    // If we have a single selected arrow/line, check if clicking on a drag point
    // Drag points only work with single selection
    if (this.selectedLayerIndices.length === 1 && !ctrlPressed) {
      const layer = layers[this.selectedLayerIndices[0]];
      if (layer.type === "arrow" || layer.type === "line") {
        // Update handle positions and test for hit
        this.lineHandles.setLine(layer.data.startX, layer.data.startY, layer.data.endX, layer.data.endY);
        const hitHandle = this.lineHandles.hitTest(x, y);
        if (hitHandle) {
          this.activeDragPoint = hitHandle;
          this.isDragging = true;
          return;
        }
      } else if (layer.type === "shape" || layer.type === "highlight") {
        // Check for rectangle corner handle hit (shapes and highlights have same structure)
        const { x: rx, y: ry, width: rw, height: rh } = layer.data;
        this.rectHandles.setRect(rx, ry, rw, rh);
        const hitHandle = this.rectHandles.hitTest(x, y);
        if (hitHandle) {
          this.activeRectHandle = hitHandle;
          this.rectOriginal = { x: rx, y: ry, width: rw, height: rh };
          this.isDragging = true;
          return;
        }
      }
    }

    // Find layer at click position (check from top to bottom)
    let foundLayerIndex = null;

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];

      // Skip the base image layer (layer 0)
      if (i === 0) continue;

      if (this.isPointInLayer(x, y, layer)) {
        foundLayerIndex = i;
        break;
      }
    }

    if (foundLayerIndex !== null) {
      // Ctrl+click: toggle selection
      if (ctrlPressed) {
        const idx = this.selectedLayerIndices.indexOf(foundLayerIndex);
        if (idx >= 0) {
          // Already selected - deselect it
          this.selectedLayerIndices.splice(idx, 1);
        } else {
          // Not selected - add to selection
          this.selectedLayerIndices.push(foundLayerIndex);
        }
        this.canvasManager.render();
        this.renderSelection();
      } else {
        // Normal click: select only this layer (replace selection)
        this.selectedLayerIndices = [foundLayerIndex];
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        this.activeDragPoint = null;

        // Store original positions for all selected layers
        this.layerStartPositions = this.selectedLayerIndices.map((idx) => {
          const layer = layers[idx];
          if (layer.type === "arrow" || layer.type === "line") {
            return { startX: layer.data.startX, startY: layer.data.startY };
          } else if (layer.type === "text" || layer.type === "step" || layer.type === "symbol" || layer.type === "shape" || layer.type === "highlight") {
            return { x: layer.data.x, y: layer.data.y };
          } else if (layer.type === "image") {
            return { x: layer.data.x || 0, y: layer.data.y || 0 };
          }
          return {};
        });

        this.canvasManager.render();
        this.renderSelection();
      }
    } else {
      // Clicked on empty space - deselect all (unless Ctrl is held)
      if (!ctrlPressed) {
        this.selectedLayerIndices = [];
        this.activeDragPoint = null;
        this.canvasManager.render();
      }
    }
  }

  /**
   * Handle mouse move - update drag position
   * Supports moving multiple selected layers
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
   */
  handleMouseMove(e) {
    if (!this.isActive || !this.isDragging || this.selectedLayerIndices.length === 0) return;

    const pos = this.canvasManager.getMousePos(e);
    const x = pos.x;
    const y = pos.y;

    const layers = this.layerManager.layers;

    // If dragging an arrow/line drag point (only works with single selection)
    if (this.activeDragPoint && this.selectedLayerIndices.length === 1) {
      const layer = layers[this.selectedLayerIndices[0]];
      if (layer.type === "arrow" || layer.type === "line") {
        let newX = x;
        let newY = y;

        // Snap to horizontal or vertical if Shift is held
        if (e.shiftKey) {
          // Determine the anchor point (the point NOT being dragged)
          const anchorX = this.activeDragPoint === "start" ? layer.data.endX : layer.data.startX;
          const anchorY = this.activeDragPoint === "start" ? layer.data.endY : layer.data.startY;
          const snapped = this.snapToAxis(anchorX, anchorY, x, y);
          newX = snapped.x;
          newY = snapped.y;
        }

        if (this.activeDragPoint === "start") {
          layer.data.startX = newX;
          layer.data.startY = newY;
        } else if (this.activeDragPoint === "end") {
          layer.data.endX = newX;
          layer.data.endY = newY;
        }
      }
    } else if (this.activeRectHandle && this.selectedLayerIndices.length === 1) {
      // Resizing a rectangle/highlight by dragging corner
      const layer = layers[this.selectedLayerIndices[0]];
      if ((layer.type === "shape" || layer.type === "highlight") && this.rectOriginal) {
        const orig = this.rectOriginal;
        let newX = orig.x;
        let newY = orig.y;
        let newW = orig.width;
        let newH = orig.height;

        // Calculate new dimensions based on which corner is being dragged
        switch (this.activeRectHandle) {
          case "tl": // Top-left: anchor is bottom-right
            newX = Math.min(x, orig.x + orig.width - 5);
            newY = Math.min(y, orig.y + orig.height - 5);
            newW = orig.x + orig.width - newX;
            newH = orig.y + orig.height - newY;
            break;
          case "tr": // Top-right: anchor is bottom-left
            newY = Math.min(y, orig.y + orig.height - 5);
            newW = Math.max(5, x - orig.x);
            newH = orig.y + orig.height - newY;
            break;
          case "bl": // Bottom-left: anchor is top-right
            newX = Math.min(x, orig.x + orig.width - 5);
            newW = orig.x + orig.width - newX;
            newH = Math.max(5, y - orig.y);
            break;
          case "br": // Bottom-right: anchor is top-left
            newW = Math.max(5, x - orig.x);
            newH = Math.max(5, y - orig.y);
            break;
        }

        layer.data.x = newX;
        layer.data.y = newY;
        layer.data.width = newW;
        layer.data.height = newH;
      }
    } else {
      // Move all selected layers
      const dx = x - this.dragStartX;
      const dy = y - this.dragStartY;

      this.selectedLayerIndices.forEach((idx, i) => {
        const layer = layers[idx];
        const startPos = this.layerStartPositions[i];

        if (layer.type === "arrow" || layer.type === "line") {
          const deltaX = layer.data.endX - layer.data.startX;
          const deltaY = layer.data.endY - layer.data.startY;
          layer.data.startX = startPos.startX + dx;
          layer.data.startY = startPos.startY + dy;
          layer.data.endX = layer.data.startX + deltaX;
          layer.data.endY = layer.data.startY + deltaY;
        } else if (layer.type === "text" || layer.type === "step" || layer.type === "symbol" || layer.type === "shape" || layer.type === "highlight") {
          layer.data.x = startPos.x + dx;
          layer.data.y = startPos.y + dy;
        } else if (layer.type === "image") {
          layer.data.x = startPos.x + dx;
          layer.data.y = startPos.y + dy;
        }
      });
    }

    this.canvasManager.render();
    this.renderSelection();
  }

  /**
   * Handle mouse up - finish dragging
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
   */
  handleMouseUp(e) {
    if (!this.isActive) return;

    if (this.isDragging) {
      this.isDragging = false;
      this.activeRectHandle = null;
      this.rectOriginal = null;

      // Notify app of layer change for undo/redo
      import("../app.js").then((app) => {
        if (app.notifyLayerChange) {
          app.notifyLayerChange();
        }
      });
    }
  }

  /**
   * Snap end position to horizontal or vertical axis relative to anchor point
   * @param {number} anchorX - Fixed point X
   * @param {number} anchorY - Fixed point Y
   * @param {number} endX - Moving point X
   * @param {number} endY - Moving point Y
   * @returns {{x: number, y: number}} Snapped position
   */
  snapToAxis(anchorX, anchorY, endX, endY) {
    const dx = Math.abs(endX - anchorX);
    const dy = Math.abs(endY - anchorY);

    // Snap to axis with larger delta (more movement)
    if (dx > dy) {
      // Horizontal - keep X, snap Y to anchor
      return { x: endX, y: anchorY };
    } else {
      // Vertical - keep Y, snap X to anchor
      return { x: anchorX, y: endY };
    }
  }

  /**
   * Check if a point is within a layer's bounds
   * Uses different detection strategies based on layer type
   * @param {number} x - Canvas X coordinate
   * @param {number} y - Canvas Y coordinate
   * @param {Object} layer - Layer object to test
   * @returns {boolean} True if point is within layer bounds
   */
  isPointInLayer(x, y, layer) {
    // Tolerance margin makes small objects easier to click
    // 10px chosen as comfortable click target without excessive false positives
    const hitMargin = 10;

    if (layer.type === "arrow" || layer.type === "line") {
      // Check if point is near the arrow/line
      return this.isPointNearLine(x, y, layer.data.startX, layer.data.startY, layer.data.endX, layer.data.endY, hitMargin);
    } else if (layer.type === "text") {
      // Create bounding box for text using actual font metrics
      const ctx = this.canvasManager.ctx;
      const sizeConfig = getTextSize(layer.data.size);
      const fontSize = sizeConfig.fontSize;
      const fontWeight = sizeConfig.fontWeight;
      ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textBaseline = "alphabetic";

      const lines = layer.data.text.split("\n");
      const lineHeightMult = getTextLineHeight();

      // Measure first line to get metrics
      const firstMetrics = ctx.measureText(lines[0] || "X");

      // When rendered with textBaseline='top', the em-box top is at y
      // The actual glyph starts at y + (fontBoundingBoxAscent - actualBoundingBoxAscent)
      const glyphTop = firstMetrics.fontBoundingBoxAscent - firstMetrics.actualBoundingBoxAscent;

      // Find widest line
      let maxWidth = firstMetrics.width;
      for (let i = 1; i < lines.length; i++) {
        const metrics = ctx.measureText(lines[i]);
        if (metrics.width > maxWidth) {
          maxWidth = metrics.width;
        }
      }

      // Measure last line to get descent
      const lastMetrics = lines.length > 1 ? ctx.measureText(lines[lines.length - 1]) : firstMetrics;

      const width = maxWidth;
      // Height from actual glyph top to actual glyph bottom
      const height = firstMetrics.actualBoundingBoxAscent + (lines.length - 1) * fontSize * lineHeightMult + lastMetrics.actualBoundingBoxDescent;

      // Bounding box starts at y + glyphTop (where actual content begins)
      return x >= layer.data.x - hitMargin && x <= layer.data.x + width + hitMargin && y >= layer.data.y + glyphTop - hitMargin && y <= layer.data.y + glyphTop + height + hitMargin;
    } else if (layer.type === "step") {
      // Use actual font metrics for accurate bounding box
      const ctx = this.canvasManager.ctx;
      const sizeConfig = getTextSize(layer.data.size);
      ctx.font = `${sizeConfig.fontWeight} ${sizeConfig.fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textBaseline = "alphabetic";
      const metrics = ctx.measureText(layer.data.symbol);

      // When rendered with textBaseline='top', actual glyph starts below y
      const glyphTop = metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent;
      const width = metrics.width;
      const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

      return x >= layer.data.x - hitMargin && x <= layer.data.x + width + hitMargin && y >= layer.data.y + glyphTop - hitMargin && y <= layer.data.y + glyphTop + height + hitMargin;
    } else if (layer.type === "symbol") {
      // Symbols use canvas scaling, measure at base size then scale
      const ctx = this.canvasManager.ctx;
      const sizeConfig = getTextSize(layer.data.size);
      const baseSize = 20;
      const scale = sizeConfig.fontSize / baseSize;
      ctx.font = `${sizeConfig.fontWeight} ${baseSize}px system-ui, -apple-system, sans-serif`;
      ctx.textBaseline = "alphabetic";
      const metrics = ctx.measureText(layer.data.symbol);

      // When rendered with textBaseline='top', actual glyph starts below y (scaled)
      const glyphTop = (metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent) * scale;
      const width = metrics.width * scale;
      const height = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) * scale;

      return x >= layer.data.x - hitMargin && x <= layer.data.x + width + hitMargin && y >= layer.data.y + glyphTop - hitMargin && y <= layer.data.y + glyphTop + height + hitMargin;
    } else if (layer.type === "shape" || layer.type === "highlight") {
      // Bounding box for rectangle shape or highlight
      return x >= layer.data.x - hitMargin && x <= layer.data.x + layer.data.width + hitMargin && y >= layer.data.y - hitMargin && y <= layer.data.y + layer.data.height + hitMargin;
    } else if (layer.type === "image") {
      // Check if point is within image bounds
      const imgX = layer.data.x || 0;
      const imgY = layer.data.y || 0;
      const imgWidth = layer.data.width || layer.data.image.width;
      const imgHeight = layer.data.height || layer.data.image.height;

      return x >= imgX - hitMargin && x <= imgX + imgWidth + hitMargin && y >= imgY - hitMargin && y <= imgY + imgHeight + hitMargin;
    }

    return false;
  }

  /**
   * Check if a point is near a line segment
   *
   * Uses vector projection to find the closest point on the line segment,
   * then calculates Euclidean distance from the click point to that closest point.
   *
   * Algorithm:
   * 1. Project the point onto the infinite line using dot product
   * 2. Clamp projection to segment bounds (t ∈ [0,1])
   * 3. Calculate distance from point to projected position
   *
   * @param {number} px, py - Point to test
   * @param {number} x1, y1 - Line segment start
   * @param {number} x2, y2 - Line segment end
   * @param {number} threshold - Maximum distance to consider "near"
   * @returns {boolean} True if point is within threshold distance of line segment
   */
  isPointNearLine(px, py, x1, y1, x2, y2, threshold) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      // Degenerate case: line is actually a point
      const dist = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
      return dist <= threshold;
    }

    // Project point onto line using dot product
    // t represents position along line: t=0 is start point, t=1 is end point
    // Formula: t = dot(point-start, end-start) / |end-start|²
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;

    // Clamp t to [0,1] to constrain to segment (not infinite line)
    // Without clamping, we'd check distance to the infinite line extension
    t = Math.max(0, Math.min(1, t));

    // Calculate closest point on segment
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    // Euclidean distance from click point to closest point on segment
    const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
    return dist <= threshold;
  }

  /**
   * Get text size in pixels from size name
   * @param {string} size - Size name (xs, sm, md, lg, xl)
   * @returns {number} Font size in pixels
   */
  getTextSizePixels(size) {
    return getTextSize(size).fontSize;
  }

  /**
   * Get step size in pixels from size name
   * @param {string} size - Size name (xs, sm, md, lg, xl)
   * @returns {number} Font size in pixels
   */
  getStepSize(size) {
    return getTextSize(size).fontSize;
  }

  /**
   * Get symbol size in pixels from size name
   * @param {string} size - Size name (xs, sm, md, lg, xl)
   * @returns {number} Font size in pixels
   */
  getSymbolSize(size) {
    return getTextSize(size).fontSize;
  }

  /**
   * Render selection indicator around all selected layers
   * @returns {void}
   */
  renderSelection() {
    if (this.selectedLayerIndices.length === 0) return;

    const ctx = this.canvasManager.ctx;
    ctx.save();

    // Render selection for each selected layer
    this.selectedLayerIndices.forEach((selectedIdx) => {
      const layer = this.layerManager.layers[selectedIdx];

      if (layer.type === "arrow" || layer.type === "line") {
        // Draw drag points at start and end of arrow/line (only for single selection)
        if (this.selectedLayerIndices.length === 1) {
          // Use shared drag handles utility
          this.lineHandles.setLine(layer.data.startX, layer.data.startY, layer.data.endX, layer.data.endY);
          this.lineHandles.render(ctx);
        } else {
          // Multi-select: just draw bounding box for arrows/lines
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          const minX = Math.min(layer.data.startX, layer.data.endX);
          const minY = Math.min(layer.data.startY, layer.data.endY);
          const maxX = Math.max(layer.data.startX, layer.data.endX);
          const maxY = Math.max(layer.data.startY, layer.data.endY);
          ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10);
        }
      } else if (layer.type === "text") {
        // Draw bounding box around text using actual font metrics
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const sizeConfig = getTextSize(layer.data.size);
        const fontSize = sizeConfig.fontSize;
        const fontWeight = sizeConfig.fontWeight;
        ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = "alphabetic";

        const lines = layer.data.text.split("\n");
        const lineHeightMult = getTextLineHeight();

        // Measure first line to get metrics
        const firstMetrics = ctx.measureText(lines[0] || "X");

        // When rendered with textBaseline='top', actual glyph starts below y
        const glyphTop = firstMetrics.fontBoundingBoxAscent - firstMetrics.actualBoundingBoxAscent;

        // Find widest line
        let maxWidth = firstMetrics.width;
        for (let i = 1; i < lines.length; i++) {
          const metrics = ctx.measureText(lines[i]);
          if (metrics.width > maxWidth) {
            maxWidth = metrics.width;
          }
        }

        // Measure last line to get descent
        const lastMetrics = lines.length > 1 ? ctx.measureText(lines[lines.length - 1]) : firstMetrics;

        const width = maxWidth;
        const height = firstMetrics.actualBoundingBoxAscent + (lines.length - 1) * fontSize * lineHeightMult + lastMetrics.actualBoundingBoxDescent;

        ctx.strokeRect(layer.data.x - 5, layer.data.y + glyphTop - 5, width + 10, height + 10);
      } else if (layer.type === "step") {
        // Draw bounding box around step using actual font metrics
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const sizeConfig = getTextSize(layer.data.size);
        ctx.font = `${sizeConfig.fontWeight} ${sizeConfig.fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = "alphabetic";
        const metrics = ctx.measureText(layer.data.symbol);

        // When rendered with textBaseline='top', actual glyph starts below y
        const glyphTop = metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent;
        const width = metrics.width;
        const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

        ctx.strokeRect(layer.data.x - 5, layer.data.y + glyphTop - 5, width + 10, height + 10);
      } else if (layer.type === "symbol") {
        // Draw bounding box around symbol using actual font metrics (scaled)
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const sizeConfig = getTextSize(layer.data.size);
        const baseSize = 20;
        const scale = sizeConfig.fontSize / baseSize;
        ctx.font = `${sizeConfig.fontWeight} ${baseSize}px system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = "alphabetic";
        const metrics = ctx.measureText(layer.data.symbol);

        // When rendered with textBaseline='top', actual glyph starts below y (scaled)
        const glyphTop = (metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent) * scale;
        const width = metrics.width * scale;
        const height = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) * scale;

        ctx.strokeRect(layer.data.x - 5, layer.data.y + glyphTop - 5, width + 10, height + 10);
      } else if (layer.type === "shape" || layer.type === "highlight") {
        // Draw corner handles for single selection, bounding box for multi-select
        if (this.selectedLayerIndices.length === 1) {
          // Use shared drag handles utility for corners
          this.rectHandles.setRect(layer.data.x, layer.data.y, layer.data.width, layer.data.height);
          this.rectHandles.render(ctx);
        } else {
          // Multi-select: just draw bounding box
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(layer.data.x - 5, layer.data.y - 5, layer.data.width + 10, layer.data.height + 10);
        }
      } else if (layer.type === "image") {
        // Draw bounding box around image
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const imgX = layer.data.x || 0;
        const imgY = layer.data.y || 0;
        const imgWidth = layer.data.width || layer.data.image.width;
        const imgHeight = layer.data.height || layer.data.image.height;

        ctx.strokeRect(imgX - 5, imgY - 5, imgWidth + 10, imgHeight + 10);
      }
    });

    ctx.restore();
  }

  /**
   * Move all selected layers by keyboard arrows
   * @param {number} dx - Horizontal offset
   * @param {number} dy - Vertical offset
   */
  moveSelectedLayer(dx, dy) {
    if (this.selectedLayerIndices.length === 0) return;

    const layers = this.layerManager.layers;

    // Move all selected layers
    this.selectedLayerIndices.forEach((idx) => {
      const layer = layers[idx];

      if (layer.type === "arrow" || layer.type === "line") {
        layer.data.startX += dx;
        layer.data.startY += dy;
        layer.data.endX += dx;
        layer.data.endY += dy;
      } else if (layer.type === "text") {
        layer.data.x += dx;
        layer.data.y += dy;
      } else if (layer.type === "step") {
        layer.data.x += dx;
        layer.data.y += dy;
      } else if (layer.type === "symbol") {
        layer.data.x += dx;
        layer.data.y += dy;
      } else if (layer.type === "shape" || layer.type === "highlight") {
        layer.data.x += dx;
        layer.data.y += dy;
      } else if (layer.type === "image") {
        layer.data.x = (layer.data.x || 0) + dx;
        layer.data.y = (layer.data.y || 0) + dy;
      }
    });

    this.canvasManager.render();
    this.renderSelection();

    // Notify app of layer change for undo/redo
    import("../app.js").then((app) => {
      if (app.notifyLayerChange) {
        app.notifyLayerChange();
      }
    });
  }

  /**
   * Check if any layers are selected (used by keyboard handler)
   * @returns {boolean} True if at least one layer is selected
   */
  hasSelection() {
    return this.selectedLayerIndices.length > 0;
  }

  /**
   * Handle right-click context menu
   * Shows context menu only if at least one layer is selected
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
   */
  handleContextMenu(e) {
    if (!this.isActive) return;

    // Only show context menu if at least one layer is selected
    if (this.selectedLayerIndices.length > 0) {
      e.preventDefault(); // Prevent default browser context menu

      // Show/hide "Flatten Selected" based on selection count (2+ required)
      const flattenBtn = document.getElementById("context-flatten-selected");
      if (flattenBtn) {
        if (this.selectedLayerIndices.length >= 2) {
          flattenBtn.classList.remove("hidden");
        } else {
          flattenBtn.classList.add("hidden");
        }
      }

      // Enable/disable "Duplicate" based on selection count (exactly 1 required)
      const duplicateBtn = document.getElementById("context-duplicate");
      if (duplicateBtn) {
        if (this.selectedLayerIndices.length === 1) {
          duplicateBtn.classList.remove("opacity-50", "cursor-not-allowed");
          duplicateBtn.disabled = false;
        } else {
          duplicateBtn.classList.add("opacity-50", "cursor-not-allowed");
          duplicateBtn.disabled = true;
        }
      }

      // Position context menu at mouse location
      this.contextMenu.style.left = `${e.pageX}px`;
      this.contextMenu.style.top = `${e.pageY}px`;
      this.contextMenu.classList.remove("hidden");
    }
  }

  /**
   * Handle document click to close context menu
   * Closes context menu when clicking anywhere outside it
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
   */
  handleDocumentClick(e) {
    if (!this.contextMenu) return;

    // Check if click is outside context menu
    if (!this.contextMenu.contains(e.target)) {
      this.contextMenu.classList.add("hidden");
    }
  }

  /**
   * Delete all currently selected layers
   * Called from context menu or Delete key
   * @returns {void}
   */
  deleteSelectedLayer() {
    if (this.selectedLayerIndices.length === 0) return;

    // Hide context menu
    if (this.contextMenu) {
      this.contextMenu.classList.add("hidden");
    }

    // Delete layers via LayerManager (delete in reverse order to maintain indices)
    const success = this.layerManager.removeLayersByIndices(this.selectedLayerIndices);

    if (success) {
      // Clear selection
      this.selectedLayerIndices = [];

      // Notify app of layer change for undo/redo
      import("../app.js").then((app) => {
        if (app.notifyLayerChange) {
          app.notifyLayerChange();
        }
      });

      // Re-render without selection
      this.canvasManager.render();
    }
  }

  /**
   * Bring selected layer to front (top of z-order)
   * Called from context menu - only works with single selection
   * @returns {void}
   */
  bringToFront() {
    if (this.selectedLayerIndices.length !== 1) return;

    // Hide context menu
    if (this.contextMenu) {
      this.contextMenu.classList.add("hidden");
    }

    // Move layer to front via LayerManager
    const success = this.layerManager.moveLayerToFront(this.selectedLayerIndices[0]);

    if (success) {
      // Update selection index (layer moved to end of array)
      this.selectedLayerIndices[0] = this.layerManager.layers.length - 1;

      // Re-render with updated selection
      this.canvasManager.render();
      this.renderSelection();
    }
  }

  /**
   * Bring selected layer forward one position
   * Called from context menu - only works with single selection
   * @returns {void}
   */
  bringForward() {
    if (this.selectedLayerIndices.length !== 1) return;

    // Hide context menu
    if (this.contextMenu) {
      this.contextMenu.classList.add("hidden");
    }

    // Move layer forward via LayerManager
    const success = this.layerManager.moveLayerForward(this.selectedLayerIndices[0]);

    if (success) {
      // Update selection index (layer moved up one position)
      this.selectedLayerIndices[0]++;

      // Re-render with updated selection
      this.canvasManager.render();
      this.renderSelection();
    }
  }

  /**
   * Send selected layer backward one position
   * Called from context menu - only works with single selection
   * @returns {void}
   */
  sendBackward() {
    if (this.selectedLayerIndices.length !== 1) return;

    // Hide context menu
    if (this.contextMenu) {
      this.contextMenu.classList.add("hidden");
    }

    // Move layer backward via LayerManager
    const success = this.layerManager.moveLayerBackward(this.selectedLayerIndices[0]);

    if (success) {
      // Update selection index (layer moved down one position)
      this.selectedLayerIndices[0]--;

      // Re-render with updated selection
      this.canvasManager.render();
      this.renderSelection();
    }
  }

  /**
   * Send selected layer to back (just above base image)
   * Called from context menu - only works with single selection
   * @returns {void}
   */
  sendToBack() {
    if (this.selectedLayerIndices.length !== 1) return;

    // Hide context menu
    if (this.contextMenu) {
      this.contextMenu.classList.add("hidden");
    }

    // Move layer to back via LayerManager
    const success = this.layerManager.moveLayerToBack(this.selectedLayerIndices[0]);

    if (success) {
      // Update selection index (layer moved to position 1)
      this.selectedLayerIndices[0] = 1;

      // Re-render with updated selection
      this.canvasManager.render();
      this.renderSelection();
    }
  }

  /**
   * Flatten selected layers into a single image
   * Called from context menu - requires 2+ layers selected
   * @returns {void}
   */
  flattenSelected() {
    if (this.selectedLayerIndices.length < 2) return;

    // Hide context menu
    if (this.contextMenu) {
      this.contextMenu.classList.add("hidden");
    }

    // Trigger the File menu's Flatten Selected button to avoid duplicate logic
    const menuButton = document.getElementById("menu-flatten-selected");
    if (menuButton) {
      menuButton.click();
    }
  }

  /**
   * Duplicate the selected layer
   * Creates an exact copy, selects the new duplicate for immediate arrow key movement
   * @returns {void}
   */
  duplicateSelectedLayers() {
    // Only works with exactly one selection
    if (this.selectedLayerIndices.length !== 1) return;

    // Hide context menu
    if (this.contextMenu) {
      this.contextMenu.classList.add("hidden");
    }

    const layers = this.layerManager.layers;

    // Save undo state before modification
    this.layerManager.saveUndoState();

    const layer = layers[this.selectedLayerIndices[0]];

    // Deep copy the layer data
    const newLayer = {
      type: layer.type,
      id: this.layerManager.generateId(),
      data: JSON.parse(JSON.stringify(layer.data)),
    };

    // Handle image data specially (can't be JSON stringified)
    if (layer.type === "image" && layer.data.image) {
      newLayer.data.image = layer.data.image;
    }

    // Add the new layer (don't use addLayer as it saves undo state)
    layers.push(newLayer);

    // Select the new duplicate for immediate arrow key movement
    this.selectedLayerIndices = [layers.length - 1];

    // Re-render
    this.canvasManager.render();
    this.renderSelection();

    // Notify app of layer change for undo/redo
    import("../app.js").then((app) => {
      if (app.notifyLayerChange) {
        app.notifyLayerChange();
      }
    });
  }
}
