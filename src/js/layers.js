/**
 * SSCE - Layer Manager
 *
 * Manages the layer stack for non-destructive editing.
 * Each edit creates a new layer, enabling undo/redo functionality.
 *
 * Layer Structure:
 * {
 *   type: 'image' | 'arrow' | 'text',
 *   data: { ... type-specific data ... },
 *   id: unique identifier
 * }
 */

export class LayerManager {
  /**
   * Create a new LayerManager
   * @param {CanvasManager} canvasManager
   */
  constructor(canvasManager) {
    this.canvasManager = canvasManager;

    // Set bidirectional reference
    canvasManager.setLayerManager(this);

    // Layer stack - array of layer objects
    this.layers = [];

    // Undo/redo stacks
    this.undoStack = [];
    this.redoStack = [];

    // Counter for unique layer IDs
    this.nextId = 1;
  }

  /**
   * Generate a unique layer ID
   * @returns {number}
   */
  generateId() {
    return this.nextId++;
  }

  /**
   * Get all layers
   * @returns {Array}
   */
  getLayers() {
    return this.layers;
  }

  /**
   * Check if there are any layers
   * @returns {boolean}
   */
  hasLayers() {
    return this.layers.length > 0;
  }

  /**
   * Clear all layers
   */
  clear() {
    this.layers = [];
    this.undoStack = [];
    this.redoStack = [];
    this.canvasManager.setSize(800, 600);
    this.canvasManager.clear();
  }

  /**
   * Add an image layer (typically the base screenshot)
   * @param {HTMLImageElement} image
   * @param {number} x - X position (default 0)
   * @param {number} y - Y position (default 0)
   */
  addImageLayer(image, x = 0, y = 0) {
    const layer = {
      type: "image",
      id: this.generateId(),
      data: {
        image: image,
        x: x,
        y: y,
        width: image.width,
        height: image.height,
      },
    };

    // If this is the first image, resize canvas to fit
    if (this.layers.length === 0) {
      this.canvasManager.setSize(image.width, image.height);
    }

    this.addLayer(layer);
  }

  /**
   * Add an arrow layer
   * @param {number} startX
   * @param {number} startY
   * @param {number} endX
   * @param {number} endY
   * @param {string} colour - Hex colour
   * @param {string} lineStyle - Line style: solid, dashed, dotted
   * @param {number} lineWidth - Line width in pixels
   */
  addArrowLayer(startX, startY, endX, endY, colour, lineStyle = "solid", lineWidth = 3) {
    const layer = {
      type: "arrow",
      id: this.generateId(),
      data: {
        startX,
        startY,
        endX,
        endY,
        colour,
        lineWidth,
        lineStyle,
      },
    };

    this.addLayer(layer);
  }

  /**
   * Add a line layer (line without arrowhead)
   * @param {number} startX
   * @param {number} startY
   * @param {number} endX
   * @param {number} endY
   * @param {string} colour
   * @param {string} lineStyle - Line style: solid, dashed, dotted
   * @param {number} lineWidth - Line width in pixels
   */
  addLineLayer(startX, startY, endX, endY, colour, lineStyle = "solid", lineWidth = 3) {
    const layer = {
      type: "line",
      id: this.generateId(),
      data: {
        startX,
        startY,
        endX,
        endY,
        colour,
        lineWidth,
        lineStyle,
      },
    };

    this.addLayer(layer);
  }

  /**
   * Add a text layer
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {string} colour - Hex colour
   * @param {string} size - Size name: xs, sm, md, lg
   */
  addTextLayer(text, x, y, colour, size) {
    const layer = {
      type: "text",
      id: this.generateId(),
      data: {
        text,
        x,
        y,
        colour,
        size,
      },
    };

    this.addLayer(layer);
  }

  /**
   * Add a step layer (circled number)
   * @param {number} x
   * @param {number} y
   * @param {number} stepNumber - The step number (1-9)
   * @param {string} symbol - The circled digit character (①②③④⑤⑥⑦⑧⑨)
   * @param {string} colour - Hex colour
   * @param {string} size - Size name: xs, sm, md, lg
   */
  addStepLayer(x, y, stepNumber, symbol, colour, size) {
    const layer = {
      type: "step",
      id: this.generateId(),
      data: {
        stepNumber,
        symbol,
        x,
        y,
        colour,
        size,
      },
    };

    this.addLayer(layer);
  }

  /**
   * Add a symbol layer
   * @param {number} x
   * @param {number} y
   * @param {string} symbol - The symbol character
   * @param {string} colour - Hex colour
   * @param {string} size - Size name: xs, sm, md, lg
   */
  addSymbolLayer(x, y, symbol, colour, size) {
    const layer = {
      type: "symbol",
      id: this.generateId(),
      data: {
        symbol,
        x,
        y,
        colour,
        size,
      },
    };

    this.addLayer(layer);
  }

  /**
   * Add a shape (rectangle) layer
   * @param {number} x - Top-left X coordinate
   * @param {number} y - Top-left Y coordinate
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @param {string} borderColour - Border color
   * @param {string} fillColour - Fill color (or "transparent")
   * @param {number} borderWidth - Border width in pixels
   * @param {string} lineStyle - Line style (solid, dashed, dotted)
   * @param {string} cornerStyle - Corner style (square, rounded)
   */
  addShapeLayer(x, y, width, height, borderColour, fillColour, borderWidth, lineStyle, cornerStyle) {
    const layer = {
      type: "shape",
      id: this.generateId(),
      data: {
        x,
        y,
        width,
        height,
        borderColour,
        fillColour,
        borderWidth,
        lineStyle,
        cornerStyle,
      },
    };

    this.addLayer(layer);
  }

  /**
   * Add a highlight layer
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {string} colour - Fill colour (rendered at 30% opacity)
   */
  addHighlightLayer(x, y, width, height, colour) {
    const layer = {
      type: "highlight",
      id: this.generateId(),
      data: {
        x,
        y,
        width,
        height,
        colour,
      },
    };

    this.addLayer(layer);
  }

  /**
   * Save current state to undo stack (layers + canvas size)
   */
  saveUndoState() {
    const size = this.canvasManager.getSize();
    this.undoStack.push({
      layers: [...this.layers],
      canvasWidth: size.width,
      canvasHeight: size.height,
    });
    // Clear redo stack (new action invalidates redo history)
    this.redoStack = [];
  }

  /**
   * Add a layer and manage undo stack
   * @param {Object} layer
   */
  addLayer(layer) {
    // Save current state for undo (includes canvas size)
    this.saveUndoState();

    // Add the layer
    this.layers.push(layer);

    // Trigger re-render
    this.canvasManager.render();
  }

  /**
   * Add an image layer without saving undo state
   * Use when undo state was already saved before canvas expansion
   * @param {HTMLImageElement} image
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  addLayerDirect(image, x = 0, y = 0) {
    const layer = {
      type: "image",
      id: this.generateId(),
      data: {
        image: image,
        x: x,
        y: y,
        width: image.width,
        height: image.height,
      },
    };

    // Add the layer without saving undo (caller already saved it)
    this.layers.push(layer);

    // Trigger re-render
    this.canvasManager.render();
  }

  /**
   * Remove the last layer
   */
  removeLastLayer() {
    if (this.layers.length === 0) return;

    this.saveUndoState();
    this.layers.pop();
    this.canvasManager.render();
  }

  /**
   * Remove a specific layer by index
   * @param {number} index - Index of layer to remove
   * @returns {boolean} True if layer was removed, false otherwise
   */
  removeLayerByIndex(index) {
    // Don't allow removing the base image layer (index 0)
    if (index <= 0 || index >= this.layers.length) {
      return false;
    }

    this.saveUndoState();

    // Remove the layer
    this.layers.splice(index, 1);

    // Re-render
    this.canvasManager.render();

    return true;
  }

  /**
   * Remove multiple layers by their indices
   * @param {Array<number>} indices - Array of layer indices to remove
   * @returns {boolean} True if layers were removed, false otherwise
   */
  removeLayersByIndices(indices) {
    // Filter out invalid indices (base layer, out of bounds)
    const validIndices = indices.filter((idx) => idx > 0 && idx < this.layers.length);

    if (validIndices.length === 0) {
      return false;
    }

    this.saveUndoState();

    // Sort indices in descending order to maintain correct positions during deletion
    const sortedIndices = [...validIndices].sort((a, b) => b - a);

    // Remove layers from highest index to lowest
    for (const index of sortedIndices) {
      this.layers.splice(index, 1);
    }

    // Re-render
    this.canvasManager.render();

    return true;
  }

  /**
   * Undo the last action
   */
  undo() {
    if (!this.canUndo()) return;

    // Save current state to redo stack (with canvas size)
    const currentSize = this.canvasManager.getSize();
    this.redoStack.push({
      layers: [...this.layers],
      canvasWidth: currentSize.width,
      canvasHeight: currentSize.height,
    });

    // Restore previous state
    const prevState = this.undoStack.pop();
    this.layers = prevState.layers;

    // Restore canvas size if it changed
    const size = this.canvasManager.getSize();
    if (size.width !== prevState.canvasWidth || size.height !== prevState.canvasHeight) {
      this.canvasManager.setSize(prevState.canvasWidth, prevState.canvasHeight);
      // Update zoom button since canvas size changed
      import("../utils/zoom.js").then((zoom) => zoom.updateZoomButton());
    }

    // Re-render
    this.canvasManager.render();
  }

  /**
   * Redo the last undone action
   */
  redo() {
    if (!this.canRedo()) return;

    // Save current state to undo stack (with canvas size)
    const currentSize = this.canvasManager.getSize();
    this.undoStack.push({
      layers: [...this.layers],
      canvasWidth: currentSize.width,
      canvasHeight: currentSize.height,
    });

    // Restore redo state
    const redoState = this.redoStack.pop();
    this.layers = redoState.layers;

    // Restore canvas size if it changed
    const size = this.canvasManager.getSize();
    if (size.width !== redoState.canvasWidth || size.height !== redoState.canvasHeight) {
      this.canvasManager.setSize(redoState.canvasWidth, redoState.canvasHeight);
      // Update zoom button since canvas size changed
      import("../utils/zoom.js").then((zoom) => zoom.updateZoomButton());
    }

    // Re-render
    this.canvasManager.render();
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean}
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Offset all layer positions (used when canvas is resized)
   * @param {number} dx - X offset
   * @param {number} dy - Y offset
   */
  offsetAllLayers(dx, dy) {
    for (const layer of this.layers) {
      switch (layer.type) {
        case "image":
          layer.data.x += dx;
          layer.data.y += dy;
          break;
        case "arrow":
        case "line":
          layer.data.startX += dx;
          layer.data.startY += dy;
          layer.data.endX += dx;
          layer.data.endY += dy;
          break;
        case "text":
          layer.data.x += dx;
          layer.data.y += dy;
          break;
      }
    }
  }

  /**
   * Expand canvas to fit a second image at a given position
   * @param {HTMLImageElement} image - The second image
   * @param {string} position - 'above', 'below', 'left', 'right'
   * @returns {{x: number, y: number}} Position for the new image
   */
  expandCanvasForCombine(image, position) {
    const currentSize = this.canvasManager.getSize();
    let newWidth = currentSize.width;
    let newHeight = currentSize.height;
    let imageX = 0;
    let imageY = 0;
    let offsetX = 0;
    let offsetY = 0;

    switch (position) {
      case "above":
        newHeight = currentSize.height + image.height;
        offsetY = image.height; // Move existing content down
        imageX = 0;
        imageY = 0;
        break;
      case "below":
        newHeight = currentSize.height + image.height;
        imageX = 0;
        imageY = currentSize.height;
        break;
      case "left":
        newWidth = currentSize.width + image.width;
        offsetX = image.width; // Move existing content right
        imageX = 0;
        imageY = 0;
        break;
      case "right":
        newWidth = currentSize.width + image.width;
        imageX = currentSize.width;
        imageY = 0;
        break;
    }

    // If we need to offset existing layers, do it before resizing
    if (offsetX !== 0 || offsetY !== 0) {
      this.offsetAllLayers(offsetX, offsetY);
    }

    // Resize canvas if needed
    if (newWidth !== currentSize.width || newHeight !== currentSize.height) {
      this.canvasManager.setSize(newWidth, newHeight);
    }

    return { x: imageX, y: imageY };
  }

  /**
   * Move a layer to the front (top of z-order)
   * @param {number} layerIndex - Index of layer to move
   * @returns {boolean} True if layer was moved, false otherwise
   */
  moveLayerToFront(layerIndex) {
    // Don't allow moving the base image layer (index 0)
    if (layerIndex <= 0 || layerIndex >= this.layers.length) {
      return false;
    }

    // Already at the front?
    if (layerIndex === this.layers.length - 1) {
      return false;
    }

    this.saveUndoState();

    // Move layer to end of array (top of z-order)
    const layer = this.layers.splice(layerIndex, 1)[0];
    this.layers.push(layer);

    // Re-render
    this.canvasManager.render();

    return true;
  }

  /**
   * Move a layer forward one position (up in z-order)
   * @param {number} layerIndex - Index of layer to move
   * @returns {boolean} True if layer was moved, false otherwise
   */
  moveLayerForward(layerIndex) {
    // Don't allow moving the base image layer (index 0)
    if (layerIndex <= 0 || layerIndex >= this.layers.length) {
      return false;
    }

    // Already at the front?
    if (layerIndex === this.layers.length - 1) {
      return false;
    }

    this.saveUndoState();

    // Swap with next layer
    const temp = this.layers[layerIndex];
    this.layers[layerIndex] = this.layers[layerIndex + 1];
    this.layers[layerIndex + 1] = temp;

    // Re-render
    this.canvasManager.render();

    return true;
  }

  /**
   * Move a layer backward one position (down in z-order)
   * @param {number} layerIndex - Index of layer to move
   * @returns {boolean} True if layer was moved, false otherwise
   */
  moveLayerBackward(layerIndex) {
    // Don't allow moving the base image layer (index 0)
    // Also can't move a layer backward from position 1 (would hit base layer)
    if (layerIndex <= 1 || layerIndex >= this.layers.length) {
      return false;
    }

    this.saveUndoState();

    // Swap with previous layer
    const temp = this.layers[layerIndex];
    this.layers[layerIndex] = this.layers[layerIndex - 1];
    this.layers[layerIndex - 1] = temp;

    // Re-render
    this.canvasManager.render();

    return true;
  }

  /**
   * Move a layer to the back (just above base image in z-order)
   * @param {number} layerIndex - Index of layer to move
   * @returns {boolean} True if layer was moved, false otherwise
   */
  moveLayerToBack(layerIndex) {
    // Don't allow moving the base image layer (index 0)
    if (layerIndex <= 1 || layerIndex >= this.layers.length) {
      return false;
    }

    // Already at position 1 (just above base layer)?
    if (layerIndex === 1) {
      return false;
    }

    this.saveUndoState();

    // Move layer to position 1 (just after base image)
    const layer = this.layers.splice(layerIndex, 1)[0];
    this.layers.splice(1, 0, layer);

    // Re-render
    this.canvasManager.render();

    return true;
  }

  /**
   * Get the current state as a serializable object
   * (for potential future save/load functionality)
   * @returns {Object}
   */
  getState() {
    return {
      layers: this.layers.map((layer) => ({
        ...layer,
        // Images need special handling for serialization
        data: layer.type === "image" ? { ...layer.data, image: layer.data.image.src } : layer.data,
      })),
      canvasSize: this.canvasManager.getSize(),
    };
  }
}
