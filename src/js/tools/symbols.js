/**
 * Symbols Tool
 * Places symbols at click position - user selects from configured symbols array
 * Right-click opens picker dialog to choose symbol
 */

import { state } from "../state.js";

export class SymbolsTool {
  constructor(canvasManager, layerManager) {
    this.canvasManager = canvasManager;
    this.layerManager = layerManager;
    this.isActive = false;
    this.canvas = document.getElementById("main-canvas");

    // Current symbol (will be set from config)
    this.currentSymbol = null;
    this.symbolsArray = [];

    // Bind event handlers
    this.handleClick = this.handleClick.bind(this);
    this.handleRightClick = this.handleRightClick.bind(this);
  }

  /**
   * Set the available symbols from config
   */
  setSymbols(symbolsArray) {
    this.symbolsArray = symbolsArray;
    // Set first symbol as default
    if (symbolsArray && symbolsArray.length > 0) {
      this.currentSymbol = symbolsArray[0];
    }
  }

  /**
   * Activate the symbols tool
   */
  activate() {
    this.isActive = true;
    this.canvas.addEventListener("click", this.handleClick);
    this.canvas.addEventListener("contextmenu", this.handleRightClick);
    console.log("Symbols tool activated - current symbol:", this.currentSymbol);
  }

  /**
   * Deactivate the symbols tool
   */
  deactivate() {
    this.isActive = false;
    this.canvas.removeEventListener("click", this.handleClick);
    this.canvas.removeEventListener("contextmenu", this.handleRightClick);
  }

  /**
   * Handle canvas click - place current symbol
   */
  handleClick(e) {
    if (!this.isActive) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Get current state
    const size = state.textSize; // Reuse text size setting (xs, sm, md, lg)
    const symbol = this.currentSymbol;

    if (!symbol) {
      console.warn("No symbol selected");
      return;
    }

    // Add symbol layer (no colour - symbols use their native colours)
    this.layerManager.addSymbolLayer(x, y, symbol, null, size);

    console.log("Symbol placed:", symbol, "at", x, y);

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
   * Handle right-click - show symbol picker dialog
   */
  handleRightClick(e) {
    if (!this.isActive) return;

    e.preventDefault(); // Prevent context menu

    // Show symbol picker dialog
    import("../ui/dialogs/index.js").then((dialogs) => {
      dialogs.showSymbolPickerDialog();
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
