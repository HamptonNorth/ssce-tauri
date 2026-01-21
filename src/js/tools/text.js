/**
 * SSCE - Text Tool
 *
 * Handles adding text annotations to the canvas.
 * Click to position, type to enter text (supports multi-line with Enter key).
 * Press Ctrl+Enter or click elsewhere to confirm, Escape to cancel.
 * Font weight scales with size: xs=400, sm=500, md=600, lg=700 for better readability.
 */

import { getTextSize, getTextLineHeight } from "../utils/config.js";

export class TextTool {
  /**
   * Create a new TextTool
   * @param {CanvasManager} canvasManager
   * @param {LayerManager} layerManager
   * @param {Function} getColour - Function that returns current colour
   * @param {Function} getSize - Function that returns current text size
   */
  constructor(canvasManager, layerManager, getColour, getSize) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;
    this.getColour = getColour;
    this.getSize = getSize;

    // Text input element reference
    this.textInput = document.getElementById("text-input");

    // Current text position
    this.textX = 0;
    this.textY = 0;
    this.isEditing = false;

    // Bind event handlers
    this.handleCanvasClick = this.handleCanvasClick.bind(this);
    this.handleInputKeyDown = this.handleInputKeyDown.bind(this);
    this.handleInputBlur = this.handleInputBlur.bind(this);
  }

  /**
   * Activate the text tool
   */
  activate() {
    const canvas = this.canvasManager.getCanvas();
    canvas.addEventListener("click", this.handleCanvasClick);
  }

  /**
   * Deactivate the text tool
   */
  deactivate() {
    const canvas = this.canvasManager.getCanvas();
    canvas.removeEventListener("click", this.handleCanvasClick);

    // Finish any current text editing
    this.finishEditing();
  }

  /**
   * Handle canvas click - position text input
   * @param {MouseEvent} e
   */
  handleCanvasClick(e) {
    // If already editing, finish that first
    if (this.isEditing) {
      this.finishEditing();
      return;
    }

    const pos = this.canvasManager.getMousePos(e);
    this.startEditing(pos.x, pos.y);
  }

  /**
   * Start editing text at a position
   * @param {number} x
   * @param {number} y
   */
  startEditing(x, y) {
    this.isEditing = true;

    // Position the text input
    const wrapper = document.getElementById("canvas-wrapper");
    const rect = wrapper.getBoundingClientRect();

    // Get font size and weight from centralized config
    const sizeConfig = getTextSize(this.getSize());
    const lineHeight = sizeConfig.fontSize * getTextLineHeight();

    // Store click position
    // Adjust Y upward so text top edge aligns with click point (not baseline)
    // Canvas renders with textBaseline='top', so we store the adjusted position
    this.textX = x;
    this.textY = y - sizeConfig.fontSize; // Shift up by font height

    // Position textarea to match where text will render
    // (Textarea and canvas both use top-left positioning)
    this.textInput.style.left = `${x}px`;
    this.textInput.style.top = `${y - sizeConfig.fontSize}px`;
    this.textInput.style.fontSize = `${sizeConfig.fontSize}px`;
    this.textInput.style.fontWeight = `${sizeConfig.fontWeight}`;
    this.textInput.style.lineHeight = `${lineHeight}px`;
    this.textInput.style.color = this.getColour();
    this.textInput.style.fontFamily = "system-ui, -apple-system, sans-serif";
    this.textInput.style.minWidth = "200px"; // Minimum width for usability
    this.textInput.style.maxWidth = "800px"; // Maximum width to prevent overflow

    // Show and focus
    this.textInput.classList.remove("hidden");
    this.textInput.value = "";
    this.textInput.rows = 1; // Start with single row
    this.textInput.focus();

    // Add event listeners for input
    this.textInput.addEventListener("keydown", this.handleInputKeyDown);
    this.textInput.addEventListener("blur", this.handleInputBlur);
    this.textInput.addEventListener("input", this.handleInputChange.bind(this));
  }

  /**
   * Handle keydown in text input
   * @param {KeyboardEvent} e
   */
  handleInputKeyDown(e) {
    if (e.key === "Enter" && e.ctrlKey) {
      // Ctrl+Enter to finish editing
      e.preventDefault();
      this.finishEditing();
    } else if (e.key === "Escape") {
      // Escape to cancel
      e.preventDefault();
      this.cancelEditing();
    }
    // Regular Enter key now adds a new line (default textarea behavior)
  }

  /**
   * Handle input changes - auto-expand textarea as user types
   */
  handleInputChange() {
    // Auto-expand textarea to fit content
    this.textInput.style.height = "auto"; // Reset height
    this.textInput.style.height = this.textInput.scrollHeight + "px"; // Set to scroll height
  }

  /**
   * Handle input blur (clicking outside)
   */
  handleInputBlur() {
    // Small delay to allow for intentional clicks
    setTimeout(() => {
      if (this.isEditing) {
        this.finishEditing();
      }
    }, 100);
  }

  /**
   * Finish editing and add text layer
   */
  finishEditing() {
    if (!this.isEditing) return;

    const text = this.textInput.value.trim();

    if (text) {
      // Add text layer
      this.layerManager.addTextLayer(text, this.textX, this.textY, this.getColour(), this.getSize());

      // Notify app of layer change
      import("../app.js").then((app) => {
        if (app.notifyLayerChange) {
          app.notifyLayerChange();
        }
      });
    }

    this.hideInput();
  }

  /**
   * Cancel editing without saving
   */
  cancelEditing() {
    this.hideInput();
  }

  /**
   * Hide the text input
   */
  hideInput() {
    this.isEditing = false;
    this.textInput.classList.add("hidden");
    this.textInput.value = "";
    this.textInput.rows = 1; // Reset to single row
    this.textInput.style.height = "auto"; // Reset height
    this.textInput.removeEventListener("keydown", this.handleInputKeyDown);
    this.textInput.removeEventListener("blur", this.handleInputBlur);
    this.textInput.removeEventListener("input", this.handleInputChange);
  }
}
