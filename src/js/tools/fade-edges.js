/**
 * Fade Edges Tool
 * Fades selected edges to transparent for seamless embedding.
 *
 * Usage:
 * 1. Activate Fade Edges tool
 * 2. Toggle edge buttons (Top, Left, Right, Bottom) - max 2 edges
 * 3. Adjust fade width slider
 * 4. Single edge: linear fade inward
 * 5. Two adjacent edges: smooth corner fade
 * 6. Ctrl+Enter to apply, Escape to cancel
 */

import { state, modules } from "../state.js";
import { flattenToImage, replaceWithImage } from "../utils/image-ops.js";
import { makeDraggable } from "../utils/draggable-panel.js";

export class FadeEdgesTool {
  constructor(canvasManager, layerManager, notifyChange) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;
    this.notifyChange = notifyChange;

    // Selected edges
    this.selectedEdges = {
      top: false,
      left: false,
      right: false,
      bottom: false,
    };

    // Fade width in pixels (for single edge)
    this.fadeWidth = 50;

    // Corner fade: distance from corner to fade line, and handle positions on edges
    this.cornerFadeDistance = 100; // Distance from corner to the diagonal line
    this.cornerHandleX = 0; // Position of handle on horizontal edge (0 = at diagonal, increases toward corner)
    this.cornerHandleY = 0; // Position of handle on vertical edge (0 = at diagonal, increases toward corner)

    // Drag handle state for corner fade
    // 'handleX' = edge handle on horizontal, 'handleY' = edge handle on vertical, 'handleCenter' = middle of diagonal
    this.draggingHandle = null;
    this.handleSize = 10;
    this.handleHitArea = 14;

    // Draggable panel controller
    this.panelDraggable = null;

    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleEdgeToggle = this.handleEdgeToggle.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  /**
   * Activate the fade edges tool
   * @returns {void}
   */
  activate() {
    // Calculate default fade width (10% of smallest dimension)
    const size = this.canvasManager.getSize();
    const minDim = Math.min(size.width, size.height);
    this.fadeWidth = Math.max(10, Math.min(200, Math.round(minDim * 0.1)));
    this.cornerFadeDistance = 100; // Fixed default for better handle visibility
    this.cornerHandleX = 0; // Handles start at diagonal line endpoints
    this.cornerHandleY = 0;

    // Reset edge selection
    this.selectedEdges = { top: false, left: false, right: false, bottom: false };

    // Add event listeners
    const canvas = this.canvasManager.getCanvas();
    document.addEventListener("keydown", this.handleKeyDown);
    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mouseup", this.handleMouseUp);

    // Show options panel
    this.showOptionsPanel();

    // Initial render
    this.render();
  }

  /**
   * Deactivate the fade edges tool
   * @returns {void}
   */
  deactivate() {
    const canvas = this.canvasManager.getCanvas();
    document.removeEventListener("keydown", this.handleKeyDown);
    canvas.removeEventListener("mousedown", this.handleMouseDown);
    canvas.removeEventListener("mousemove", this.handleMouseMove);
    canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.hideOptionsPanel();
    this.canvasManager.render();
  }

  /**
   * Show the fade edges options panel
   * @returns {void}
   */
  showOptionsPanel() {
    let panel = document.getElementById("fade-edges-options");
    const isNewPanel = !panel;

    if (isNewPanel) {
      panel = document.createElement("div");
      panel.id = "fade-edges-options";
      panel.className = "fixed bg-gray-800 rounded-lg p-3 shadow-lg z-50 border border-gray-600";
      panel.innerHTML = `
        <div class="text-sm font-medium text-gray-200 pb-2 text-center border-b border-gray-600" data-drag-handle>Fade Edges</div>
        <div class="mt-3 mb-3">
          <div class="flex flex-col items-center gap-1">
            <button id="fade-edge-top" class="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-colors">Top</button>
            <div class="flex gap-8">
              <button id="fade-edge-left" class="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-colors">Left</button>
              <button id="fade-edge-right" class="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-colors">Right</button>
            </div>
            <button id="fade-edge-bottom" class="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-colors">Bottom</button>
          </div>
        </div>
        <div id="fade-edges-warning" class="hidden text-xs text-red-400 mb-2">
          Cannot fade opposite edges
        </div>
        <div class="text-xs text-gray-500 pt-2 mt-2">
          Select 1-2 adjacent edges<br>
          Ctrl+Enter to apply<br>
          Escape to cancel
        </div>
      `;
      document.body.appendChild(panel);

      // Make panel draggable
      this.panelDraggable = makeDraggable(panel, {
        storageKey: "ssce_fadeEdgesPanelPos",
        defaultPosition: { right: 16, bottom: 64 },
      });
    }

    panel.classList.remove("hidden");

    // Set up edge button listeners
    const edges = ["top", "left", "right", "bottom"];
    edges.forEach((edge) => {
      const btn = document.getElementById(`fade-edge-${edge}`);
      if (btn) {
        btn.onclick = () => this.handleEdgeToggle(edge);
      }
    });

    this.updateEdgeButtons();
  }

  /**
   * Hide the fade edges options panel
   * @returns {void}
   */
  hideOptionsPanel() {
    const panel = document.getElementById("fade-edges-options");
    if (panel) {
      panel.classList.add("hidden");
    }
    // Note: Don't destroy panelDraggable here - it persists for position memory
  }

  /**
   * Handle edge button toggle
   * @param {string} edge - Edge name (top, left, right, bottom)
   * @returns {void}
   */
  handleEdgeToggle(edge) {
    // Toggle the edge
    this.selectedEdges[edge] = !this.selectedEdges[edge];

    // Count selected edges
    const selected = Object.entries(this.selectedEdges)
      .filter(([_, v]) => v)
      .map(([k, _]) => k);

    // If more than 2 selected, deselect the oldest (just toggled one stays)
    if (selected.length > 2) {
      // Find first selected that isn't the one we just toggled
      for (const e of selected) {
        if (e !== edge) {
          this.selectedEdges[e] = false;
          break;
        }
      }
    }

    this.updateEdgeButtons();
    this.render();
  }

  /**
   * Update edge button visual states
   * @returns {void}
   */
  updateEdgeButtons() {
    const edges = ["top", "left", "right", "bottom"];
    edges.forEach((edge) => {
      const btn = document.getElementById(`fade-edge-${edge}`);
      if (btn) {
        if (this.selectedEdges[edge]) {
          btn.classList.remove("bg-gray-700", "text-gray-300", "border-gray-600");
          btn.classList.add("bg-blue-600", "text-white", "border-blue-500");
        } else {
          btn.classList.remove("bg-blue-600", "text-white", "border-blue-500");
          btn.classList.add("bg-gray-700", "text-gray-300", "border-gray-600");
        }
      }
    });

    // Check for invalid selection (opposite edges)
    const warning = document.getElementById("fade-edges-warning");
    if (warning) {
      const isInvalid = this.isOppositeEdges();
      warning.classList.toggle("hidden", !isInvalid);
    }
  }

  /**
   * Check if opposite edges are selected (invalid combination)
   * @returns {boolean} True if top+bottom or left+right selected
   */
  isOppositeEdges() {
    const { top, bottom, left, right } = this.selectedEdges;
    return (top && bottom) || (left && right);
  }

  /**
   * Check if current edge selection is valid for applying fade
   * @returns {boolean} True if 1-2 adjacent edges selected
   */
  isValidSelection() {
    const count = Object.values(this.selectedEdges).filter((v) => v).length;
    if (count === 0) return false;
    if (count > 2) return false;
    if (this.isOppositeEdges()) return false;
    return true;
  }

  /**
   * Get list of currently selected edge names
   * @returns {string[]} Array of selected edge names
   */
  getSelectedEdges() {
    return Object.entries(this.selectedEdges)
      .filter(([_, v]) => v)
      .map(([k, _]) => k);
  }

  /**
   * Handle keyboard events (Escape to cancel, Ctrl+Enter to apply)
   * @param {KeyboardEvent} e - Keyboard event
   * @returns {void}
   */
  handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      // Clear selection, stay in tool
      this.selectedEdges = { top: false, left: false, right: false, bottom: false };
      this.updateEdgeButtons();
      this.render();
    } else if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      if (this.isValidSelection()) {
        this.applyFade();
      }
    }
  }

  /**
   * Get current zoom scale
   * @returns {number} Zoom scale factor
   */
  getZoomScale() {
    return state.zoomScale || 1.0;
  }

  /**
   * Convert screen coordinates to canvas coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {{x: number, y: number}} Canvas coordinates
   */
  screenToCanvas(screenX, screenY) {
    const scale = this.getZoomScale();
    return { x: screenX / scale, y: screenY / scale };
  }

  /**
   * Scale a size value for current zoom level
   * @param {number} baseSize - Base size in pixels
   * @returns {number} Scaled size
   */
  getScaledSize(baseSize) {
    return baseSize / this.getZoomScale();
  }

  /**
   * Get handle positions for corner fade (2 adjacent edges)
   * @returns {Object|null} Handle positions or null if not corner fade
   */
  getCornerHandlePositions() {
    const selected = this.getSelectedEdges();
    if (selected.length !== 2 || this.isOppositeEdges()) return null;

    const size = this.canvasManager.getSize();
    const hasTop = selected.includes("top");
    const hasBottom = selected.includes("bottom");
    const hasLeft = selected.includes("left");
    const hasRight = selected.includes("right");

    // The diagonal line is at cornerFadeDistance from the corner (45-degree line)
    const dist = this.cornerFadeDistance;
    let lineStart, lineEnd, cornerX, cornerY;

    if (hasTop && hasLeft) {
      cornerX = 0;
      cornerY = 0;
      lineStart = { x: dist, y: 0 }; // Point on top edge
      lineEnd = { x: 0, y: dist }; // Point on left edge
    } else if (hasTop && hasRight) {
      cornerX = size.width;
      cornerY = 0;
      lineStart = { x: size.width - dist, y: 0 };
      lineEnd = { x: size.width, y: dist };
    } else if (hasBottom && hasLeft) {
      cornerX = 0;
      cornerY = size.height;
      lineStart = { x: dist, y: size.height };
      lineEnd = { x: 0, y: size.height - dist };
    } else if (hasBottom && hasRight) {
      cornerX = size.width;
      cornerY = size.height;
      lineStart = { x: size.width - dist, y: size.height };
      lineEnd = { x: size.width, y: size.height - dist };
    }

    // Center handle is midpoint of diagonal line
    const handleCenter = {
      x: (lineStart.x + lineEnd.x) / 2,
      y: (lineStart.y + lineEnd.y) / 2,
    };

    // Edge handles start at diagonal endpoints (lineStart/lineEnd)
    // When dragged AWAY from corner, they move along the edge into the image
    // This creates a bezier curve fade boundary that bulges away from corner
    let handleX, handleY;
    if (hasTop && hasLeft) {
      // handleX on top edge: starts at lineStart.x, moves RIGHT away from corner
      handleX = { x: lineStart.x + this.cornerHandleX, y: 0 };
      // handleY on left edge: starts at lineEnd.y, moves DOWN away from corner
      handleY = { x: 0, y: lineEnd.y + this.cornerHandleY };
    } else if (hasTop && hasRight) {
      // handleX on top edge: starts at lineStart.x, moves LEFT away from corner
      handleX = { x: lineStart.x - this.cornerHandleX, y: 0 };
      // handleY on right edge: starts at lineEnd.y, moves DOWN away from corner
      handleY = { x: size.width, y: lineEnd.y + this.cornerHandleY };
    } else if (hasBottom && hasLeft) {
      // handleX on bottom edge: starts at lineStart.x, moves RIGHT away from corner
      handleX = { x: lineStart.x + this.cornerHandleX, y: size.height };
      // handleY on left edge: starts at lineEnd.y, moves UP away from corner
      handleY = { x: 0, y: lineEnd.y - this.cornerHandleY };
    } else if (hasBottom && hasRight) {
      // handleX on bottom edge: starts at lineStart.x, moves LEFT away from corner
      handleX = { x: lineStart.x - this.cornerHandleX, y: size.height };
      // handleY on right edge: starts at lineEnd.y, moves UP away from corner
      handleY = { x: size.width, y: lineEnd.y - this.cornerHandleY };
    }

    return { lineStart, lineEnd, handleX, handleY, handleCenter, cornerX, cornerY };
  }

  /**
   * Get handle position for single edge fade
   * @returns {Object|null} Handle position {x, y} or null if not single edge
   */
  getSingleEdgeHandlePosition() {
    const selected = this.getSelectedEdges();
    if (selected.length !== 1) return null;

    const size = this.canvasManager.getSize();
    const edge = selected[0];
    const fadeWidth = this.fadeWidth;

    switch (edge) {
      case "top":
        return { x: size.width / 2, y: fadeWidth };
      case "bottom":
        return { x: size.width / 2, y: size.height - fadeWidth };
      case "left":
        return { x: fadeWidth, y: size.height / 2 };
      case "right":
        return { x: size.width - fadeWidth, y: size.height / 2 };
    }
    return null;
  }

  /**
   * Test if canvas coordinates hit a drag handle
   * @param {number} canvasX - Canvas X coordinate
   * @param {number} canvasY - Canvas Y coordinate
   * @returns {string|null} Handle name or null if no hit
   */
  hitTestHandle(canvasX, canvasY) {
    const hitArea = this.getScaledSize(this.handleHitArea);

    // Check for corner fade handles
    const cornerPositions = this.getCornerHandlePositions();
    if (cornerPositions) {
      const { handleX, handleY, handleCenter } = cornerPositions;

      // Test center handle first (highest priority)
      if (Math.abs(canvasX - handleCenter.x) < hitArea && Math.abs(canvasY - handleCenter.y) < hitArea) {
        return "handleCenter";
      }
      if (Math.abs(canvasX - handleX.x) < hitArea && Math.abs(canvasY - handleX.y) < hitArea) {
        return "handleX";
      }
      if (Math.abs(canvasX - handleY.x) < hitArea && Math.abs(canvasY - handleY.y) < hitArea) {
        return "handleY";
      }
    }

    // Check for single edge handle
    const singleHandle = this.getSingleEdgeHandlePosition();
    if (singleHandle) {
      if (Math.abs(canvasX - singleHandle.x) < hitArea && Math.abs(canvasY - singleHandle.y) < hitArea) {
        return "singleEdge";
      }
    }

    return null;
  }

  /**
   * Handle mouse down - start dragging handle
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
   */
  handleMouseDown(e) {
    if (e.button !== 0) return;

    const rect = this.canvasManager.getCanvas().getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const coords = this.screenToCanvas(screenX, screenY);

    const handle = this.hitTestHandle(coords.x, coords.y);
    if (handle) {
      this.draggingHandle = handle;
      e.preventDefault();
    }
  }

  /**
   * Handle mouse move - update handle position while dragging
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
   */
  handleMouseMove(e) {
    const rect = this.canvasManager.getCanvas().getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const coords = this.screenToCanvas(screenX, screenY);
    const canvas = this.canvasManager.getCanvas();
    const size = this.canvasManager.getSize();

    if (this.draggingHandle) {
      const selected = this.getSelectedEdges();
      const hasTop = selected.includes("top");
      const hasBottom = selected.includes("bottom");
      const hasLeft = selected.includes("left");
      const hasRight = selected.includes("right");

      // Single edge drag
      if (this.draggingHandle === "singleEdge") {
        const edge = selected[0];
        const maxFade = Math.min(size.width, size.height) / 2;

        switch (edge) {
          case "top":
            this.fadeWidth = Math.max(10, Math.min(maxFade, coords.y));
            break;
          case "bottom":
            this.fadeWidth = Math.max(10, Math.min(maxFade, size.height - coords.y));
            break;
          case "left":
            this.fadeWidth = Math.max(10, Math.min(maxFade, coords.x));
            break;
          case "right":
            this.fadeWidth = Math.max(10, Math.min(maxFade, size.width - coords.x));
            break;
        }
        this.render();
        return;
      }

      if (this.draggingHandle === "handleCenter") {
        // Dragging the center handle moves the diagonal line toward/away from corner
        // Calculate distance from corner based on mouse position along the diagonal
        let distFromCorner;
        if (hasTop && hasLeft) {
          // Distance along diagonal from (0,0)
          distFromCorner = (coords.x + coords.y) / 2;
        } else if (hasTop && hasRight) {
          distFromCorner = (size.width - coords.x + coords.y) / 2;
        } else if (hasBottom && hasLeft) {
          distFromCorner = (coords.x + (size.height - coords.y)) / 2;
        } else if (hasBottom && hasRight) {
          distFromCorner = (size.width - coords.x + (size.height - coords.y)) / 2;
        }
        this.cornerFadeDistance = Math.max(10, Math.min(Math.min(size.width, size.height), distFromCorner));
      } else if (this.draggingHandle === "handleX") {
        // Dragging the horizontal edge handle AWAY from corner
        // handleX starts at lineStart (dist from corner), moves away from corner into image
        const dist = this.cornerFadeDistance;
        const maxExtend = Math.min(size.width, size.height) - dist; // Don't go past image
        if (hasLeft) {
          // Handle at x = dist + cornerHandleX, moving RIGHT away from corner
          // cornerHandleX = coords.x - dist
          this.cornerHandleX = Math.max(0, Math.min(maxExtend, coords.x - dist));
        } else if (hasRight) {
          // Handle at x = (width - dist) - cornerHandleX, moving LEFT away from corner
          // cornerHandleX = (width - dist) - coords.x
          this.cornerHandleX = Math.max(0, Math.min(maxExtend, size.width - dist - coords.x));
        }
      } else if (this.draggingHandle === "handleY") {
        // Dragging the vertical edge handle AWAY from corner
        // handleY starts at lineEnd (dist from corner), moves away from corner into image
        const dist = this.cornerFadeDistance;
        const maxExtend = Math.min(size.width, size.height) - dist; // Don't go past image
        if (hasTop) {
          // Handle at y = dist + cornerHandleY, moving DOWN away from corner
          // cornerHandleY = coords.y - dist
          this.cornerHandleY = Math.max(0, Math.min(maxExtend, coords.y - dist));
        } else if (hasBottom) {
          // Handle at y = (height - dist) - cornerHandleY, moving UP away from corner
          // cornerHandleY = (height - dist) - coords.y
          this.cornerHandleY = Math.max(0, Math.min(maxExtend, size.height - dist - coords.y));
        }
      }

      this.render();
      return;
    }

    // Update cursor based on hover
    const handle = this.hitTestHandle(coords.x, coords.y);
    if (handle) {
      canvas.style.cursor = "pointer";
    } else {
      canvas.style.cursor = "default";
    }
  }

  /**
   * Handle mouse up - stop dragging
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
   */
  handleMouseUp(e) {
    this.draggingHandle = null;
  }

  /**
   * Render the fade preview overlay
   * @returns {void}
   */
  render() {
    // Render base layers
    this.canvasManager.render();

    const selected = this.getSelectedEdges();
    if (selected.length === 0) return;

    // Draw fade preview overlay
    const ctx = this.canvasManager.getCanvas().getContext("2d");
    const size = this.canvasManager.getSize();

    ctx.save();

    // Draw checkerboard pattern in fade areas to show transparency
    this.drawFadePreview(ctx, size, selected);

    ctx.restore();
  }

  /**
   * Draw fade preview overlay on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {{width: number, height: number}} size - Canvas size
   * @param {string[]} selectedEdges - Selected edge names
   * @returns {void}
   */
  drawFadePreview(ctx, size, selectedEdges) {
    const fadeWidth = this.fadeWidth;

    // For corner fade (2 adjacent edges), draw diagonal preview
    if (selectedEdges.length === 2 && !this.isOppositeEdges()) {
      this.drawCornerPreview(ctx, size, selectedEdges, fadeWidth);
      return;
    }

    // Single edge: use gradient overlay with drag handle
    const edge = selectedEdges[0];
    const gradient = this.createFadeGradient(ctx, size, edge, fadeWidth);
    ctx.fillStyle = gradient;

    let handleX, handleY, lineStart, lineEnd;

    switch (edge) {
      case "top":
        ctx.fillRect(0, 0, size.width, fadeWidth);
        handleX = size.width / 2;
        handleY = fadeWidth;
        lineStart = { x: 0, y: fadeWidth };
        lineEnd = { x: size.width, y: fadeWidth };
        break;
      case "bottom":
        ctx.fillRect(0, size.height - fadeWidth, size.width, fadeWidth);
        handleX = size.width / 2;
        handleY = size.height - fadeWidth;
        lineStart = { x: 0, y: size.height - fadeWidth };
        lineEnd = { x: size.width, y: size.height - fadeWidth };
        break;
      case "left":
        ctx.fillRect(0, 0, fadeWidth, size.height);
        handleX = fadeWidth;
        handleY = size.height / 2;
        lineStart = { x: fadeWidth, y: 0 };
        lineEnd = { x: fadeWidth, y: size.height };
        break;
      case "right":
        ctx.fillRect(size.width - fadeWidth, 0, fadeWidth, size.height);
        handleX = size.width - fadeWidth;
        handleY = size.height / 2;
        lineStart = { x: size.width - fadeWidth, y: 0 };
        lineEnd = { x: size.width - fadeWidth, y: size.height };
        break;
    }

    // Draw the fade boundary line
    ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(lineStart.x, lineStart.y);
    ctx.lineTo(lineEnd.x, lineEnd.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw drag handle
    const handleSize = this.getScaledSize(this.handleSize);
    const strokeWidth = this.getScaledSize(2);
    ctx.lineWidth = strokeWidth;
    ctx.fillStyle = "#3B82F6";
    ctx.strokeStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(handleX, handleY, handleSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Create gradient for single edge fade preview
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {{width: number, height: number}} size - Canvas size
   * @param {string} edge - Edge name
   * @param {number} fadeWidth - Fade width in pixels
   * @returns {CanvasGradient} Gradient for preview
   */
  createFadeGradient(ctx, size, edge, fadeWidth) {
    let gradient;
    // Gradient from edge (more transparent preview) to inside (less visible)
    // This shows the user where the fade will be strongest

    switch (edge) {
      case "top":
        gradient = ctx.createLinearGradient(0, 0, 0, fadeWidth);
        break;
      case "bottom":
        gradient = ctx.createLinearGradient(0, size.height, 0, size.height - fadeWidth);
        break;
      case "left":
        gradient = ctx.createLinearGradient(0, 0, fadeWidth, 0);
        break;
      case "right":
        gradient = ctx.createLinearGradient(size.width, 0, size.width - fadeWidth, 0);
        break;
    }

    // Preview overlay: shows checkerboard pattern fading in from edge
    gradient.addColorStop(0, "rgba(128, 128, 128, 0.6)");
    gradient.addColorStop(1, "rgba(128, 128, 128, 0)");

    return gradient;
  }

  /**
   * Draw corner fade preview (2 adjacent edges with bezier curve)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {{width: number, height: number}} size - Canvas size
   * @param {string[]} selectedEdges - Selected edge names
   * @param {number} fadeWidth - Fade width in pixels
   * @returns {void}
   */
  drawCornerPreview(ctx, size, selectedEdges, fadeWidth) {
    // Draw diagonal fade preview for corner
    const positions = this.getCornerHandlePositions();
    if (!positions) return;

    const { lineStart, lineEnd, handleX, handleY, handleCenter, cornerX, cornerY } = positions;

    // Check if handles have been moved (creating bezier curve)
    const hasBezier = this.cornerHandleX > 0 || this.cornerHandleY > 0;

    // Draw the fade region (from corner to fade boundary)
    ctx.fillStyle = "rgba(128, 128, 128, 0.5)";
    ctx.beginPath();
    ctx.moveTo(cornerX, cornerY);

    if (hasBezier) {
      // Draw bezier curve boundary: corner -> handleX -> bezier curve -> handleY -> corner
      ctx.lineTo(handleX.x, handleX.y);
      // Quadratic bezier from handleX to handleY with control point at diagonal midpoint
      ctx.quadraticCurveTo(handleCenter.x, handleCenter.y, handleY.x, handleY.y);
    } else {
      // Simple diagonal line
      ctx.lineTo(lineStart.x, lineStart.y);
      ctx.lineTo(lineEnd.x, lineEnd.y);
    }
    ctx.closePath();
    ctx.fill();

    // Draw the fade boundary (diagonal line or bezier curve)
    ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    if (hasBezier) {
      ctx.moveTo(handleX.x, handleX.y);
      ctx.quadraticCurveTo(handleCenter.x, handleCenter.y, handleY.x, handleY.y);
    } else {
      ctx.moveTo(lineStart.x, lineStart.y);
      ctx.lineTo(lineEnd.x, lineEnd.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw drag handles
    const handleSize = this.getScaledSize(this.handleSize);
    const strokeWidth = this.getScaledSize(2);

    ctx.lineWidth = strokeWidth;

    // Center handle (on diagonal line) - controls line position
    ctx.fillStyle = "#3B82F6";
    ctx.strokeStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(handleCenter.x, handleCenter.y, handleSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Edge handles - at diagonal endpoints or moved toward corner
    ctx.fillStyle = "#10B981"; // Green
    ctx.strokeStyle = "#FFFFFF";

    // Handle on horizontal edge
    ctx.beginPath();
    ctx.arc(handleX.x, handleX.y, handleSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Handle on vertical edge
    ctx.beginPath();
    ctx.arc(handleY.x, handleY.y, handleSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Apply fade effect to selected edges
   * @returns {Promise<void>}
   */
  async applyFade() {
    if (!this.isValidSelection()) return;

    const selectedEdges = this.getSelectedEdges();
    const size = this.canvasManager.getSize();

    try {
      // Flatten all layers to single image
      const flatImage = await flattenToImage(this.canvasManager, this.layerManager);

      // Create canvas to work with
      const workCanvas = document.createElement("canvas");
      workCanvas.width = flatImage.width;
      workCanvas.height = flatImage.height;
      const workCtx = workCanvas.getContext("2d");
      workCtx.drawImage(flatImage, 0, 0);

      // Get image data for pixel manipulation
      const imageData = workCtx.getImageData(0, 0, workCanvas.width, workCanvas.height);
      const data = imageData.data;

      // Apply fade to selected edges
      if (selectedEdges.length === 1) {
        this.applySingleEdgeFade(data, workCanvas.width, workCanvas.height, selectedEdges[0]);
      } else {
        // Two adjacent edges - apply corner fade
        this.applyCornerFade(data, workCanvas.width, workCanvas.height, selectedEdges);
      }

      // Put modified image data back
      workCtx.putImageData(imageData, 0, 0);

      // Convert back to image
      const resultImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = workCanvas.toDataURL("image/png");
      });

      // Replace canvas with result
      replaceWithImage(this.layerManager, this.canvasManager, resultImage);

      if (this.notifyChange) {
        this.notifyChange();
      }

      import("../utils/toast.js").then((t) => t.showToast(`Fade applied to ${edgeText}`, "success"));

      // Reset selection for next operation
      this.selectedEdges = { top: false, left: false, right: false, bottom: false };
      this.updateEdgeButtons();
      this.render();
    } catch (error) {
      console.error("Fade failed:", error);
      import("../utils/toast.js").then((t) => t.showToast("Fade failed", "error"));
    }
  }

  /**
   * Apply fade to single edge
   * @param {Uint8ClampedArray} data - Image data array
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {string} edge - Edge name
   * @returns {void}
   */
  applySingleEdgeFade(data, width, height, edge) {
    const fadeWidth = Math.min(this.fadeWidth, edge === "top" || edge === "bottom" ? height : width);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let alpha = 1;

        switch (edge) {
          case "top":
            if (y < fadeWidth) {
              // Alpha goes from 0 at y=0 to 1 at y=fadeWidth
              const t = y / fadeWidth;
              // Use smoothstep for gradual transition at boundary
              alpha = t * t * (3 - 2 * t);
            }
            break;
          case "bottom":
            if (y >= height - fadeWidth) {
              // Alpha goes from 1 at boundary to 0 at edge
              const t = (height - y) / fadeWidth;
              alpha = t * t * (3 - 2 * t);
            }
            break;
          case "left":
            if (x < fadeWidth) {
              // Alpha goes from 0 at x=0 to 1 at x=fadeWidth
              const t = x / fadeWidth;
              alpha = t * t * (3 - 2 * t);
            }
            break;
          case "right":
            if (x >= width - fadeWidth) {
              // Alpha goes from 1 at boundary to 0 at edge
              const t = (width - x) / fadeWidth;
              alpha = t * t * (3 - 2 * t);
            }
            break;
        }

        // Apply alpha (multiply with existing alpha)
        data[idx + 3] = Math.round(data[idx + 3] * alpha);
      }
    }
  }

  /**
   * Apply fade to corner (2 adjacent edges)
   * @param {Uint8ClampedArray} data - Image data array
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {string[]} selectedEdges - Selected edge names
   * @returns {void}
   */
  applyCornerFade(data, width, height, selectedEdges) {
    const hasTop = selectedEdges.includes("top");
    const hasBottom = selectedEdges.includes("bottom");
    const hasLeft = selectedEdges.includes("left");
    const hasRight = selectedEdges.includes("right");

    const dist = this.cornerFadeDistance;
    const handleOffsetX = this.cornerHandleX;
    const handleOffsetY = this.cornerHandleY;

    // Get corner position and diagonal line endpoints
    let cornerX, cornerY;
    let lineStartX, lineStartY, lineEndX, lineEndY;
    let handleX_x, handleX_y, handleY_x, handleY_y;

    if (hasTop && hasLeft) {
      cornerX = 0;
      cornerY = 0;
      lineStartX = dist;
      lineStartY = 0;
      lineEndX = 0;
      lineEndY = dist;
      // Handles move AWAY from corner (right and down)
      handleX_x = dist + handleOffsetX;
      handleX_y = 0;
      handleY_x = 0;
      handleY_y = dist + handleOffsetY;
    } else if (hasTop && hasRight) {
      cornerX = width;
      cornerY = 0;
      lineStartX = width - dist;
      lineStartY = 0;
      lineEndX = width;
      lineEndY = dist;
      // Handles move AWAY from corner (left and down)
      handleX_x = width - dist - handleOffsetX;
      handleX_y = 0;
      handleY_x = width;
      handleY_y = dist + handleOffsetY;
    } else if (hasBottom && hasLeft) {
      cornerX = 0;
      cornerY = height;
      lineStartX = dist;
      lineStartY = height;
      lineEndX = 0;
      lineEndY = height - dist;
      // Handles move AWAY from corner (right and up)
      handleX_x = dist + handleOffsetX;
      handleX_y = height;
      handleY_x = 0;
      handleY_y = height - dist - handleOffsetY;
    } else if (hasBottom && hasRight) {
      cornerX = width;
      cornerY = height;
      lineStartX = width - dist;
      lineStartY = height;
      lineEndX = width;
      lineEndY = height - dist;
      // Handles move AWAY from corner (left and up)
      handleX_x = width - dist - handleOffsetX;
      handleX_y = height;
      handleY_x = width;
      handleY_y = height - dist - handleOffsetY;
    }

    // Control point for bezier curve (center of diagonal line)
    const controlX = (lineStartX + lineEndX) / 2;
    const controlY = (lineStartY + lineEndY) / 2;

    // Check if using bezier curve or simple diagonal
    const hasBezier = handleOffsetX > 0 || handleOffsetY > 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Check if pixel is in the fade region
        let alpha = 1;

        if (hasBezier) {
          // Use bezier curve boundary
          // Find if point is inside the fade region (corner side of bezier curve)
          const inFadeRegion = this.isPointInBezierFadeRegion(x, y, cornerX, cornerY, handleX_x, handleX_y, controlX, controlY, handleY_x, handleY_y);

          if (inFadeRegion) {
            // Calculate distance-based alpha using bezier curve
            alpha = this.calculateBezierAlpha(x, y, cornerX, cornerY, handleX_x, handleX_y, controlX, controlY, handleY_x, handleY_y);
          }
        } else {
          // Simple diagonal line fade - radial gradient from corner to diagonal
          // Calculate line equation: ax + by + c = 0
          const a = lineEndY - lineStartY;
          const b = lineStartX - lineEndX;
          const c = lineEndX * lineStartY - lineStartX * lineEndY;
          const lineLen = Math.sqrt(a * a + b * b);

          // Signed distance from pixel to line
          const signedDist = (a * x + b * y + c) / lineLen;
          const cornerDist = (a * cornerX + b * cornerY + c) / lineLen;
          const cornerSide = Math.sign(cornerDist);

          if (Math.sign(signedDist) === cornerSide) {
            // Pixel is on corner side - apply gradient based on perpendicular distance
            // This avoids ray artifacts by using consistent distance calculation

            // Distance from pixel to diagonal line (perpendicular)
            const distFromLine = Math.abs(signedDist);

            // Distance from corner to diagonal line
            const cornerToLine = Math.abs(cornerDist);

            if (cornerToLine > 0) {
              // Alpha = 1 at diagonal line, 0 at corner
              // Use ratio of distances
              let linearAlpha = 1 - distFromLine / cornerToLine;
              linearAlpha = Math.max(0, Math.min(1, linearAlpha));
              // Apply smoothstep for gradual transition at boundaries
              alpha = linearAlpha * linearAlpha * (3 - 2 * linearAlpha);
            } else {
              alpha = 0;
            }
          }
        }

        data[idx + 3] = Math.round(data[idx + 3] * alpha);
      }
    }
  }

  /**
   * Check if point is inside bezier fade region
   * @param {number} px - Point X
   * @param {number} py - Point Y
   * @param {number} cornerX - Corner X
   * @param {number} cornerY - Corner Y
   * @param {number} p0x - Handle X position X
   * @param {number} p0y - Handle X position Y
   * @param {number} cpx - Control point X
   * @param {number} cpy - Control point Y
   * @param {number} p1x - Handle Y position X
   * @param {number} p1y - Handle Y position Y
   * @returns {boolean} True if point is in fade region
   */
  isPointInBezierFadeRegion(px, py, cornerX, cornerY, p0x, p0y, cpx, cpy, p1x, p1y) {
    // Simple boundary check based on handle positions
    // handleX (p0) is on horizontal edge, handleY (p1) is on vertical edge
    // Fade region is bounded by: x between corner and handleX, y between corner and handleY

    if (cornerX === 0) {
      // Left side corners: x must be <= handleX.x (p0x)
      if (px > p0x) return false;
    } else {
      // Right side corners: x must be >= handleX.x (p0x)
      if (px < p0x) return false;
    }

    if (cornerY === 0) {
      // Top corners: y must be <= handleY.y (p1y)
      if (py > p1y) return false;
    } else {
      // Bottom corners: y must be >= handleY.y (p1y)
      if (py < p1y) return false;
    }

    // Check if point is on the corner side of the line from handleX to handleY
    // This eliminates triangle artifacts near the handles
    const lineVecX = p1x - p0x;
    const lineVecY = p1y - p0y;
    const toPointFromP0X = px - p0x;
    const toPointFromP0Y = py - p0y;
    const cross = lineVecX * toPointFromP0Y - lineVecY * toPointFromP0X;
    const toCornerFromP0X = cornerX - p0x;
    const toCornerFromP0Y = cornerY - p0y;
    const crossCorner = lineVecX * toCornerFromP0Y - lineVecY * toCornerFromP0X;

    // Point must be on same side of line as corner
    if (Math.sign(cross) !== Math.sign(crossCorner)) {
      return false;
    }

    // Now check if point is on the corner side of the bezier curve
    const samples = 50;
    let closestDist = Infinity;
    let closestBx = 0,
      closestBy = 0;

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const bx = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * cpx + t * t * p1x;
      const by = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * cpy + t * t * p1y;
      const d = (px - bx) * (px - bx) + (py - by) * (py - by);
      if (d < closestDist) {
        closestDist = d;
        closestBx = bx;
        closestBy = by;
      }
    }

    // Vector from closest bezier point to corner
    const toCornerX = cornerX - closestBx;
    const toCornerY = cornerY - closestBy;

    // Vector from closest bezier point to test point
    const toPointX = px - closestBx;
    const toPointY = py - closestBy;

    // Dot product: positive means point is on corner side of the curve
    const dot = toCornerX * toPointX + toCornerY * toPointY;

    return dot > 0;
  }

  /**
   * Calculate alpha value based on distance from bezier curve toward corner
   * @param {number} px - Point X
   * @param {number} py - Point Y
   * @param {number} cornerX - Corner X
   * @param {number} cornerY - Corner Y
   * @param {number} p0x - Handle X position X
   * @param {number} p0y - Handle X position Y
   * @param {number} cpx - Control point X
   * @param {number} cpy - Control point Y
   * @param {number} p1x - Handle Y position X
   * @param {number} p1y - Handle Y position Y
   * @returns {number} Alpha value (0-1)
   */
  calculateBezierAlpha(px, py, cornerX, cornerY, p0x, p0y, cpx, cpy, p1x, p1y) {
    // Find closest point on bezier curve with higher precision
    const samples = 50;
    let closestDist = Infinity;

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const bx = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * cpx + t * t * p1x;
      const by = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * cpy + t * t * p1y;
      const d = Math.sqrt((px - bx) * (px - bx) + (py - by) * (py - by));
      if (d < closestDist) {
        closestDist = d;
      }
    }

    // Distance from pixel to corner
    const distFromCorner = Math.sqrt((px - cornerX) * (px - cornerX) + (py - cornerY) * (py - cornerY));

    // Total distance = distance to curve + distance from curve to corner approximation
    // Use the closest distance to bezier as perpendicular distance
    const totalDist = closestDist + distFromCorner;

    if (totalDist < 1) return 0;

    // Alpha based on ratio: how far from corner vs total path
    // At corner: distFromCorner = 0, alpha = 0
    // At bezier: closestDist = 0, alpha = 1
    let linearAlpha = distFromCorner / (distFromCorner + closestDist);
    linearAlpha = Math.max(0, Math.min(1, linearAlpha));

    // Apply smoothstep for gradual transition
    const alpha = linearAlpha * linearAlpha * (3 - 2 * linearAlpha);

    return alpha;
  }
}
