/**
 * Draggable Panel Utility
 *
 * Makes floating panels draggable with:
 * - Drag by title bar / header area
 * - Constrain to viewport bounds
 * - Save position to localStorage
 * - Restore position on activation
 * - Visual feedback (cursor: grab/grabbing)
 */

/**
 * Make a panel element draggable
 * @param {HTMLElement} panel - The panel element to make draggable
 * @param {Object} options - Configuration options
 * @param {string} options.handle - CSS selector for drag handle (default: first child or element with [data-drag-handle])
 * @param {string} options.storageKey - localStorage key for persisting position (required for persistence)
 * @param {Object} options.defaultPosition - Default position { right, bottom } for initial placement
 * @param {Function} options.onDragEnd - Callback when drag ends
 * @returns {Object} Controller with methods: resetPosition(), destroy()
 */
export function makeDraggable(panel, options = {}) {
  const { handle = null, storageKey = null, defaultPosition = { right: 16, bottom: 64 }, onDragEnd = null } = options;

  // State
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let hasBeenDragged = false;

  // Find or create drag handle
  let dragHandle = null;
  if (handle) {
    dragHandle = panel.querySelector(handle);
  }
  if (!dragHandle) {
    dragHandle = panel.querySelector("[data-drag-handle]");
  }
  if (!dragHandle) {
    // Use first child as handle if no explicit handle
    dragHandle = panel.firstElementChild;
  }

  // Apply cursor style to handle
  if (dragHandle) {
    dragHandle.style.cursor = "grab";
    dragHandle.style.userSelect = "none";
  }

  /**
   * Restore position from localStorage or use default
   */
  function restorePosition() {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const pos = JSON.parse(saved);
          if (pos.x !== undefined && pos.y !== undefined) {
            applyPosition(pos.x, pos.y);
            hasBeenDragged = true;
            return;
          }
        } catch (e) {
          // Invalid JSON, ignore
        }
      }
    }

    // Apply default position (right/bottom)
    applyDefaultPosition();
  }

  /**
   * Apply default position (bottom-right)
   */
  function applyDefaultPosition() {
    panel.style.position = "fixed";
    panel.style.left = "";
    panel.style.top = "";
    panel.style.right = `${defaultPosition.right}px`;
    panel.style.bottom = `${defaultPosition.bottom}px`;
    hasBeenDragged = false;
  }

  /**
   * Apply absolute position
   */
  function applyPosition(x, y) {
    // Ensure position is within viewport
    const rect = panel.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    panel.style.position = "fixed";
    panel.style.right = "";
    panel.style.bottom = "";
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
  }

  /**
   * Save position to localStorage
   */
  function savePosition() {
    if (!storageKey) return;

    const rect = panel.getBoundingClientRect();
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        x: rect.left,
        y: rect.top,
      })
    );
  }

  /**
   * Handle mouse down on drag handle
   */
  function handleMouseDown(e) {
    // Only respond to left mouse button
    if (e.button !== 0) return;

    // Don't start drag if clicking a button or input inside the handle
    if (e.target.closest("button, input, select, textarea")) return;

    isDragging = true;
    hasBeenDragged = true;

    // Calculate offset from panel position
    const rect = panel.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    // Update cursor
    if (dragHandle) {
      dragHandle.style.cursor = "grabbing";
    }
    document.body.style.cursor = "grabbing";

    // Prevent text selection during drag
    e.preventDefault();
  }

  /**
   * Handle mouse move during drag
   */
  function handleMouseMove(e) {
    if (!isDragging) return;

    e.preventDefault();

    // Calculate new position
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;

    applyPosition(newX, newY);
  }

  /**
   * Handle mouse up (end drag)
   */
  function handleMouseUp(e) {
    if (!isDragging) return;

    isDragging = false;

    // Restore cursor
    if (dragHandle) {
      dragHandle.style.cursor = "grab";
    }
    document.body.style.cursor = "";

    // Save position
    savePosition();

    // Call callback
    if (onDragEnd) {
      const rect = panel.getBoundingClientRect();
      onDragEnd({ x: rect.left, y: rect.top });
    }
  }

  /**
   * Handle window resize - ensure panel stays in viewport
   */
  function handleWindowResize() {
    if (!hasBeenDragged) return;

    const rect = panel.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    let needsUpdate = false;
    let newX = rect.left;
    let newY = rect.top;

    if (rect.left > maxX) {
      newX = Math.max(0, maxX);
      needsUpdate = true;
    }
    if (rect.top > maxY) {
      newY = Math.max(0, maxY);
      needsUpdate = true;
    }

    if (needsUpdate) {
      applyPosition(newX, newY);
      savePosition();
    }
  }

  // Attach event listeners
  if (dragHandle) {
    dragHandle.addEventListener("mousedown", handleMouseDown);
  }
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  window.addEventListener("resize", handleWindowResize);

  // Initialize position
  restorePosition();

  // Return controller
  return {
    /**
     * Reset panel to default position
     */
    resetPosition() {
      applyDefaultPosition();
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    },

    /**
     * Check if panel has been dragged from default position
     */
    hasBeenDragged() {
      return hasBeenDragged;
    },

    /**
     * Cleanup event listeners
     */
    destroy() {
      if (dragHandle) {
        dragHandle.removeEventListener("mousedown", handleMouseDown);
        dragHandle.style.cursor = "";
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", handleWindowResize);
    },
  };
}

/**
 * Restore a panel's position from localStorage
 * Convenience function for panels that need to restore position without full draggable setup
 * @param {HTMLElement} panel - The panel element
 * @param {string} storageKey - localStorage key
 * @param {Object} defaultPosition - Default position { right, bottom }
 */
export function restorePosition(panel, storageKey, defaultPosition = { right: 16, bottom: 64 }) {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const pos = JSON.parse(saved);
      if (pos.x !== undefined && pos.y !== undefined) {
        panel.style.position = "fixed";
        panel.style.right = "";
        panel.style.bottom = "";
        panel.style.left = `${pos.x}px`;
        panel.style.top = `${pos.y}px`;
        return true;
      }
    } catch (e) {
      // Invalid JSON
    }
  }

  // Apply default
  panel.style.position = "fixed";
  panel.style.left = "";
  panel.style.top = "";
  panel.style.right = `${defaultPosition.right}px`;
  panel.style.bottom = `${defaultPosition.bottom}px`;
  return false;
}

/**
 * Reset a panel's position to default
 * @param {HTMLElement} panel - The panel element
 * @param {string} storageKey - localStorage key to clear
 * @param {Object} defaultPosition - Default position { right, bottom }
 */
export function resetPosition(panel, storageKey, defaultPosition = { right: 16, bottom: 64 }) {
  if (storageKey) {
    localStorage.removeItem(storageKey);
  }
  panel.style.position = "fixed";
  panel.style.left = "";
  panel.style.top = "";
  panel.style.right = `${defaultPosition.right}px`;
  panel.style.bottom = `${defaultPosition.bottom}px`;
}
