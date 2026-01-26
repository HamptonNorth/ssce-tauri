/**
 * Steps Tool
 * Places numbered steps (1-9) at click position using configurable symbols
 * Right-click opens dialog to set step number
 * Symbols are loaded from .env STEPS config
 */

import { state } from "../state.js";

/**
 * Default circled digit Unicode characters (U+2460 to U+2468)
 * Used if no config provided
 */
const DEFAULT_STEPS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

export class StepsTool {
  constructor(canvasManager, layerManager) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;
    this.isActive = false;
    this.canvas = document.getElementById("main-canvas");

    // Step symbols from config (set via setSteps)
    this.steps = DEFAULT_STEPS;

    // Current step counter (1-9)
    this.currentStep = 1;

    // Bind event handlers
    this.handleClick = this.handleClick.bind(this);
    this.handleRightClick = this.handleRightClick.bind(this);
  }

  /**
   * Set the step symbols from config
   * @param {string[]} steps - Array of step symbols
   */
  setSteps(steps) {
    if (steps && steps.length > 0) {
      this.steps = steps;
    }
  }

  /**
   * Get the current step symbol for display/copy
   * @returns {string}
   */
  getCurrentStepSymbol() {
    return this.steps[this.currentStep - 1] || this.steps[0];
  }

  /**
   * Activate the steps tool
   */
  activate() {
    this.isActive = true;
    this.canvas.addEventListener("click", this.handleClick);
    this.canvas.addEventListener("contextmenu", this.handleRightClick);
    console.log("Steps tool activated - current step:", this.currentStep);
  }

  /**
   * Deactivate the steps tool
   */
  deactivate() {
    this.isActive = false;
    this.canvas.removeEventListener("click", this.handleClick);
    this.canvas.removeEventListener("contextmenu", this.handleRightClick);
  }

  /**
   * Handle canvas click - place current step number
   */
  handleClick(e) {
    if (!this.isActive) return;

    // Use canvasManager.getMousePos to convert screen coords to canvas coords
    // This properly accounts for CSS zoom scaling
    const pos = this.canvasManager.getMousePos(e);
    const x = pos.x;
    const y = pos.y;

    // Get current state
    const colour = state.currentColour;
    const size = state.textSize; // Reuse text size setting (xs, sm, md, lg)
    const stepNumber = this.currentStep;
    const symbol = this.getCurrentStepSymbol();

    // Add step layer
    this.layerManager.addStepLayer(x, y, stepNumber, symbol, colour, size);

    // Increment counter (wrap at max steps back to 1)
    this.currentStep = (this.currentStep % this.steps.length) + 1;

    console.log("Step placed:", symbol, "at", x, y, "- next step:", this.currentStep);

    // Notify app for undo/redo state
    import("../app.js").then((app) => {
      if (app.notifyLayerChange) {
        app.notifyLayerChange();
      }
    });

    // Re-render canvas
    this.canvasManager.render();
  }

  /**
   * Handle right-click - show reset dialog to choose starting number
   */
  handleRightClick(e) {
    if (!this.isActive) return;

    e.preventDefault(); // Prevent context menu

    // Show reset dialog
    import("../ui/dialogs/index.js").then((dialogs) => {
      dialogs.showStepsResetDialog();
    });
  }

  /**
   * Get current colour from state
   */
  getColour() {
    return state.currentColour;
  }

  /**
   * Get current size from state
   */
  getSize() {
    return state.textSize;
  }
}
