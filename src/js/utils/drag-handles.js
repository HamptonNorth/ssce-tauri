/**
 * Drag Handles Utility
 * Shared drag handle system for tools that need interactive resize/move handles.
 * Used by: select tool (arrow/line endpoints), crop tool, cut tool, future shape resizing
 */

/**
 * Handle types for different use cases
 */
export const HandleType = {
  CORNER: "corner", // 4 corners of a rectangle
  EDGE: "edge", // 4 edge midpoints
  ENDPOINT: "endpoint", // 2 endpoints of a line
  ALL: "all", // corners + edges (8 handles)
};

/**
 * Individual handle position identifiers
 */
export const HandlePosition = {
  TOP_LEFT: "tl",
  TOP: "t",
  TOP_RIGHT: "tr",
  LEFT: "l",
  RIGHT: "r",
  BOTTOM_LEFT: "bl",
  BOTTOM: "b",
  BOTTOM_RIGHT: "br",
  START: "start", // For line endpoints
  END: "end", // For line endpoints
};

/**
 * DragHandleSet - Manages a set of drag handles
 *
 * Usage:
 *   const handles = new DragHandleSet({ type: HandleType.ALL });
 *   handles.setRect(x, y, width, height);
 *   handles.render(ctx);
 *   const hitHandle = handles.hitTest(mouseX, mouseY);
 */
export class DragHandleSet {
  /**
   * @param {Object} options Configuration options
   * @param {string} options.type Handle type (HandleType constant)
   * @param {number} options.size Visual size of handles in pixels (default: 8)
   * @param {number} options.hitArea Hit detection area in pixels (default: 12)
   * @param {string} options.fill Fill colour (default: '#3B82F6' blue-500)
   * @param {string} options.stroke Stroke colour (default: '#FFFFFF')
   * @param {number} options.strokeWidth Stroke width (default: 2)
   * @param {string} options.shape Shape of handles: 'square' or 'circle' (default: 'square')
   */
  constructor(options = {}) {
    this.type = options.type || HandleType.ALL;
    this.handleSize = options.size || 8;
    this.hitArea = options.hitArea || 12;
    this.fillColour = options.fill || "#3B82F6"; // blue-500
    this.strokeColour = options.stroke || "#FFFFFF";
    this.strokeWidth = options.strokeWidth || 2;
    this.shape = options.shape || "square";

    this.handles = []; // Array of { id, x, y }
  }

  /**
   * Set handles for a rectangular region
   * @param {number} x Left edge
   * @param {number} y Top edge
   * @param {number} width Rectangle width
   * @param {number} height Rectangle height
   */
  setRect(x, y, width, height) {
    this.handles = [];

    if (this.type === HandleType.CORNER || this.type === HandleType.ALL) {
      this.handles.push({ id: HandlePosition.TOP_LEFT, x: x, y: y });
      this.handles.push({ id: HandlePosition.TOP_RIGHT, x: x + width, y: y });
      this.handles.push({ id: HandlePosition.BOTTOM_LEFT, x: x, y: y + height });
      this.handles.push({ id: HandlePosition.BOTTOM_RIGHT, x: x + width, y: y + height });
    }

    if (this.type === HandleType.EDGE || this.type === HandleType.ALL) {
      this.handles.push({ id: HandlePosition.TOP, x: x + width / 2, y: y });
      this.handles.push({ id: HandlePosition.BOTTOM, x: x + width / 2, y: y + height });
      this.handles.push({ id: HandlePosition.LEFT, x: x, y: y + height / 2 });
      this.handles.push({ id: HandlePosition.RIGHT, x: x + width, y: y + height / 2 });
    }
  }

  /**
   * Set handles for a line (two endpoints)
   * @param {number} x1 Start X
   * @param {number} y1 Start Y
   * @param {number} x2 End X
   * @param {number} y2 End Y
   */
  setLine(x1, y1, x2, y2) {
    this.handles = [
      { id: HandlePosition.START, x: x1, y: y1 },
      { id: HandlePosition.END, x: x2, y: y2 },
    ];
  }

  /**
   * Hit test - check if mouse position is over a handle
   * @param {number} mouseX Mouse X position
   * @param {number} mouseY Mouse Y position
   * @returns {string|null} Handle id if hit, null otherwise
   */
  hitTest(mouseX, mouseY) {
    for (const handle of this.handles) {
      const dx = Math.abs(mouseX - handle.x);
      const dy = Math.abs(mouseY - handle.y);
      if (dx <= this.hitArea && dy <= this.hitArea) {
        return handle.id;
      }
    }
    return null;
  }

  /**
   * Get cursor style for a handle
   * @param {string} handleId Handle identifier
   * @returns {string} CSS cursor value
   */
  getCursor(handleId) {
    const cursors = {
      [HandlePosition.TOP_LEFT]: "nwse-resize",
      [HandlePosition.BOTTOM_RIGHT]: "nwse-resize",
      [HandlePosition.TOP_RIGHT]: "nesw-resize",
      [HandlePosition.BOTTOM_LEFT]: "nesw-resize",
      [HandlePosition.TOP]: "ns-resize",
      [HandlePosition.BOTTOM]: "ns-resize",
      [HandlePosition.LEFT]: "ew-resize",
      [HandlePosition.RIGHT]: "ew-resize",
      [HandlePosition.START]: "move",
      [HandlePosition.END]: "move",
    };
    return cursors[handleId] || "default";
  }

  /**
   * Render all handles to canvas context
   * @param {CanvasRenderingContext2D} ctx Canvas context
   */
  render(ctx) {
    ctx.save();
    ctx.fillStyle = this.fillColour;
    ctx.strokeStyle = this.strokeColour;
    // Scale stroke width proportionally with handle size
    const baseRatio = this.handleSize / 8; // 8 is default handle size
    ctx.lineWidth = this.strokeWidth * baseRatio;

    for (const handle of this.handles) {
      const halfSize = this.handleSize / 2;

      if (this.shape === "circle") {
        ctx.beginPath();
        ctx.arc(handle.x, handle.y, halfSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        // Square
        ctx.fillRect(handle.x - halfSize, handle.y - halfSize, this.handleSize, this.handleSize);
        ctx.strokeRect(handle.x - halfSize, handle.y - halfSize, this.handleSize, this.handleSize);
      }
    }

    ctx.restore();
  }

  /**
   * Get handle by id
   * @param {string} id Handle identifier
   * @returns {Object|undefined} Handle object { id, x, y } or undefined
   */
  getHandle(id) {
    return this.handles.find((h) => h.id === id);
  }

  /**
   * Update a single handle position
   * @param {string} id Handle identifier
   * @param {number} x New X position
   * @param {number} y New Y position
   */
  updateHandle(id, x, y) {
    const handle = this.getHandle(id);
    if (handle) {
      handle.x = x;
      handle.y = y;
    }
  }

  /**
   * Get all handle positions
   * @returns {Array} Array of { id, x, y }
   */
  getHandles() {
    return this.handles;
  }

  /**
   * Clear all handles
   */
  clear() {
    this.handles = [];
  }
}
