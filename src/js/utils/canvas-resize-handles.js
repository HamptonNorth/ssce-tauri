/**
 * Canvas Resize Handles
 *
 * Adds 8 drag handles (4 corners + 4 edges) around the canvas wrapper
 * for interactive canvas resizing. Handles are HTML elements positioned
 * on the canvas-wrapper div.
 */

const HANDLE_SIZE = 10; // px
const MIN_CANVAS_SIZE = 100; // px minimum width/height

/**
 * Handle position to anchor mapping.
 * When dragging a handle, the opposite side stays fixed.
 * The anchor value is used by CanvasManager.resize().
 */
const HANDLE_CONFIG = {
  tl: { cursor: "nwse-resize", anchor: "br" },
  t:  { cursor: "ns-resize",   anchor: "bc" },
  tr: { cursor: "nesw-resize", anchor: "bl" },
  l:  { cursor: "ew-resize",   anchor: "mr" },
  r:  { cursor: "ew-resize",   anchor: "ml" },
  bl: { cursor: "nesw-resize", anchor: "tr" },
  b:  { cursor: "ns-resize",   anchor: "tc" },
  br: { cursor: "nwse-resize", anchor: "tl" },
};

/**
 * Create and manage canvas resize handles
 */
export class CanvasResizeHandles {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.wrapper - The canvas-wrapper element
   * @param {import('../canvas.js').CanvasManager} options.canvasManager
   * @param {Function} options.onBeforeResize - Called before resize (for undo state)
   * @param {Function} options.onAfterResize - Called after resize completes
   */
  constructor({ wrapper, canvasManager, onBeforeResize, onAfterResize }) {
    this.wrapper = wrapper;
    this.canvasManager = canvasManager;
    this.onBeforeResize = onBeforeResize;
    this.onAfterResize = onAfterResize;

    this.handles = {};
    this.activeHandle = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.startWidth = 0;
    this.startHeight = 0;
    this.visible = false;

    // Preview element for showing new canvas boundary during drag
    this.preview = null;

    // Bind handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    this.createHandles();
    this.createPreview();
  }

  /**
   * Create HTML handle elements and append to wrapper
   */
  createHandles() {
    for (const [id, config] of Object.entries(HANDLE_CONFIG)) {
      const el = document.createElement("div");
      el.className = "canvas-resize-handle";
      el.dataset.handle = id;
      el.style.cssText = `
        position: absolute;
        width: ${HANDLE_SIZE}px;
        height: ${HANDLE_SIZE}px;
        background: rgba(59, 130, 246, 0.8);
        border: 1px solid white;
        cursor: ${config.cursor};
        z-index: 20;
        display: none;
        box-sizing: border-box;
      `;

      el.addEventListener("mousedown", this.handleMouseDown);
      this.wrapper.appendChild(el);
      this.handles[id] = el;
    }
  }

  /**
   * Create preview outline element
   */
  createPreview() {
    this.preview = document.createElement("div");
    this.preview.style.cssText = `
      position: absolute;
      border: 2px dashed rgba(59, 130, 246, 0.6);
      pointer-events: none;
      z-index: 19;
      display: none;
      box-sizing: border-box;
    `;
    this.wrapper.appendChild(this.preview);
  }

  /**
   * Position handles around the canvas edges/corners
   */
  positionHandles() {
    const { width, height } = this.canvasManager.getSize();
    const half = HANDLE_SIZE / 2;

    // Corners
    this.setHandlePos("tl", -half, -half);
    this.setHandlePos("tr", width - half, -half);
    this.setHandlePos("bl", -half, height - half);
    this.setHandlePos("br", width - half, height - half);

    // Edges (centered)
    this.setHandlePos("t", width / 2 - half, -half);
    this.setHandlePos("b", width / 2 - half, height - half);
    this.setHandlePos("l", -half, height / 2 - half);
    this.setHandlePos("r", width - half, height / 2 - half);
  }

  /**
   * Set position of a single handle
   */
  setHandlePos(id, left, top) {
    const el = this.handles[id];
    if (el) {
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    }
  }

  /**
   * Show resize handles
   */
  show() {
    this.visible = true;
    this.positionHandles();
    for (const el of Object.values(this.handles)) {
      el.style.display = "block";
    }
  }

  /**
   * Hide resize handles
   */
  hide() {
    this.visible = false;
    for (const el of Object.values(this.handles)) {
      el.style.display = "none";
    }
    this.preview.style.display = "none";
  }

  /**
   * Handle mouse down on a resize handle
   */
  handleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    const id = e.target.dataset.handle;
    if (!id) return;

    this.activeHandle = id;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;

    const size = this.canvasManager.getSize();
    this.startWidth = size.width;
    this.startHeight = size.height;

    // Show preview
    this.preview.style.display = "block";
    this.updatePreview(this.startWidth, this.startHeight, 0, 0);

    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
  }

  /**
   * Handle mouse move during drag
   */
  handleMouseMove(e) {
    if (!this.activeHandle) return;

    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    // Account for zoom scale on the canvas wrapper
    const rect = this.wrapper.getBoundingClientRect();
    const scaleX = this.startWidth / rect.width;
    const scaleY = this.startHeight / rect.height;

    const scaledDx = dx * scaleX;
    const scaledDy = dy * scaleY;

    const { newWidth, newHeight, offsetX, offsetY } = this.calculateNewSize(
      this.activeHandle,
      this.startWidth,
      this.startHeight,
      scaledDx,
      scaledDy
    );

    this.updatePreview(newWidth, newHeight, offsetX, offsetY);
  }

  /**
   * Handle mouse up - apply resize
   */
  handleMouseUp(e) {
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);

    if (!this.activeHandle) return;

    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    const rect = this.wrapper.getBoundingClientRect();
    const scaleX = this.startWidth / rect.width;
    const scaleY = this.startHeight / rect.height;

    const scaledDx = dx * scaleX;
    const scaledDy = dy * scaleY;

    const { newWidth, newHeight } = this.calculateNewSize(
      this.activeHandle,
      this.startWidth,
      this.startHeight,
      scaledDx,
      scaledDy
    );

    // Only resize if dimensions actually changed
    if (newWidth !== this.startWidth || newHeight !== this.startHeight) {
      const anchor = HANDLE_CONFIG[this.activeHandle].anchor;

      if (this.onBeforeResize) {
        this.onBeforeResize();
      }

      this.canvasManager.resize(newWidth, newHeight, anchor);

      if (this.onAfterResize) {
        this.onAfterResize();
      }
    }

    this.activeHandle = null;
    this.preview.style.display = "none";

    // Reposition handles after resize
    if (this.visible) {
      this.positionHandles();
    }
  }

  /**
   * Calculate new canvas size based on handle being dragged
   * @returns {{ newWidth: number, newHeight: number, offsetX: number, offsetY: number }}
   */
  calculateNewSize(handleId, startWidth, startHeight, dx, dy) {
    let newWidth = startWidth;
    let newHeight = startHeight;
    let offsetX = 0;
    let offsetY = 0;

    switch (handleId) {
      case "tl":
        newWidth = Math.max(MIN_CANVAS_SIZE, startWidth - dx);
        newHeight = Math.max(MIN_CANVAS_SIZE, startHeight - dy);
        offsetX = startWidth - newWidth;
        offsetY = startHeight - newHeight;
        break;
      case "t":
        newHeight = Math.max(MIN_CANVAS_SIZE, startHeight - dy);
        offsetY = startHeight - newHeight;
        break;
      case "tr":
        newWidth = Math.max(MIN_CANVAS_SIZE, startWidth + dx);
        newHeight = Math.max(MIN_CANVAS_SIZE, startHeight - dy);
        offsetY = startHeight - newHeight;
        break;
      case "l":
        newWidth = Math.max(MIN_CANVAS_SIZE, startWidth - dx);
        offsetX = startWidth - newWidth;
        break;
      case "r":
        newWidth = Math.max(MIN_CANVAS_SIZE, startWidth + dx);
        break;
      case "bl":
        newWidth = Math.max(MIN_CANVAS_SIZE, startWidth - dx);
        newHeight = Math.max(MIN_CANVAS_SIZE, startHeight + dy);
        offsetX = startWidth - newWidth;
        break;
      case "b":
        newHeight = Math.max(MIN_CANVAS_SIZE, startHeight + dy);
        break;
      case "br":
        newWidth = Math.max(MIN_CANVAS_SIZE, startWidth + dx);
        newHeight = Math.max(MIN_CANVAS_SIZE, startHeight + dy);
        break;
    }

    newWidth = Math.round(newWidth);
    newHeight = Math.round(newHeight);

    return { newWidth, newHeight, offsetX: Math.round(offsetX), offsetY: Math.round(offsetY) };
  }

  /**
   * Update the preview outline during drag
   */
  updatePreview(width, height, offsetX, offsetY) {
    this.preview.style.left = `${offsetX}px`;
    this.preview.style.top = `${offsetY}px`;
    this.preview.style.width = `${width}px`;
    this.preview.style.height = `${height}px`;
  }

  /**
   * Clean up handles and event listeners
   */
  destroy() {
    for (const el of Object.values(this.handles)) {
      el.removeEventListener("mousedown", this.handleMouseDown);
      el.remove();
    }
    if (this.preview) {
      this.preview.remove();
    }
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
  }
}

// Export constants for testing
export { HANDLE_CONFIG, MIN_CANVAS_SIZE };
