/**
 * Symbols Tool Property Card
 *
 * Properties:
 * - Symbol selector (grid of available symbols from config)
 * - Size (XS/SM/MD/LG presets) - shares textSize with Text/Steps tools
 *
 * Note: No colour picker - emoji symbols have their own built-in colours
 */

import { BasePropertyCard } from "./base-card.js";
import { createButtonGroup } from "../components/button-group.js";
import { state, modules, persistState } from "../../state.js";
import { getToolConfig, setToolConfig, getTextSize, getSymbols } from "../../utils/config.js";

export class SymbolsCard extends BasePropertyCard {
  constructor() {
    super("symbols", "Symbols");

    // Component references
    this.sizeGroup = null;
    this.symbolButtons = [];
  }

  /**
   * Render the card content
   * @returns {HTMLElement}
   */
  renderContent() {
    const content = document.createElement("div");
    content.className = "flex flex-wrap gap-10 items-end";

    // Get current values from state or config
    const currentSize = state.textSize || getToolConfig("symbols", "size") || "md";
    const currentSymbol = modules.symbolsTool?.currentSymbol || null;

    // === Symbol Selector Section ===
    const symbolSection = document.createElement("div");
    symbolSection.appendChild(this.createSymbolSelector(currentSymbol));
    content.appendChild(symbolSection);

    // === Size Section ===
    const sizeSection = document.createElement("div");
    this.sizeGroup = createSymbolSizeGroup({
      value: currentSize,
      onChange: (size) => this.handleSizeChange(size),
    });
    sizeSection.appendChild(this.sizeGroup.element);
    this.registerComponent(this.sizeGroup);
    content.appendChild(sizeSection);

    return content;
  }

  /**
   * Create the symbol selector grid
   * @param {string} currentSymbol - Currently selected symbol
   * @returns {HTMLElement}
   */
  createSymbolSelector(currentSymbol) {
    const container = document.createElement("div");

    // Label
    const label = document.createElement("div");
    label.className = "text-xs text-gray-400 mb-1";
    label.textContent = "Symbol";
    container.appendChild(label);

    // Symbol grid - max 12 per row (12 * 36px button + 11 * 4px gap = 476px)
    const grid = document.createElement("div");
    grid.className = "flex flex-wrap gap-1";
    grid.style.maxWidth = "476px";

    // Get symbols from defaults config
    const symbols = getSymbols();

    if (symbols.length === 0) {
      const noSymbols = document.createElement("span");
      noSymbols.className = "text-gray-500 text-sm";
      noSymbols.textContent = "No symbols configured";
      grid.appendChild(noSymbols);
    } else {
      symbols.forEach((symbol) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "w-9 h-9 text-xl rounded bg-gray-600 hover:bg-gray-500 transition-colors flex items-center justify-center";
        button.textContent = symbol;
        button.title = symbol;

        // Highlight current symbol
        if (symbol === currentSymbol) {
          button.classList.add("ring-2", "ring-blue-500", "bg-gray-500");
        }

        button.addEventListener("click", () => this.handleSymbolChange(symbol, button));
        this.symbolButtons.push(button);
        grid.appendChild(button);
      });
    }

    container.appendChild(grid);
    return container;
  }

  /**
   * Handle symbol change
   * @param {string} symbol
   * @param {HTMLElement} button
   */
  handleSymbolChange(symbol, button) {
    // Update tool
    if (modules.symbolsTool) {
      modules.symbolsTool.currentSymbol = symbol;
    }

    // Update button states
    this.symbolButtons.forEach((btn) => {
      btn.classList.remove("ring-2", "ring-blue-500", "bg-gray-500");
      btn.classList.add("bg-gray-600");
    });
    button.classList.remove("bg-gray-600");
    button.classList.add("ring-2", "ring-blue-500", "bg-gray-500");

    // Save to tool-specific config
    setToolConfig("symbols", "symbol", symbol);
  }

  /**
   * Handle size change
   * @param {string} size
   */
  handleSizeChange(size) {
    // Update global state (textSize is shared by text, steps, symbols tools)
    state.textSize = size;
    persistState("textSize", size);

    // Update toolbar text size display if it exists
    const display = document.getElementById("current-text-size");
    if (display) {
      display.textContent = size.toUpperCase();
    }

    // Save to tool-specific config
    setToolConfig("symbols", "size", size);
  }

  /**
   * Cleanup
   */
  destroy() {
    this.symbolButtons = [];
    super.destroy();
  }
}

/**
 * Create a symbol size button group
 * @param {Object} options
 * @param {string} options.value - Current size (xs, sm, md, lg)
 * @param {Function} options.onChange - Callback
 * @returns {Object} Button group component
 */
function createSymbolSizeGroup(options = {}) {
  const { value = "md", onChange = () => {} } = options;

  // Get text sizes from centralized config (symbols use same sizes as text)
  const presets = ["xs", "sm", "md", "lg"];
  const buttons = presets.map((size) => ({
    value: size,
    label: size.toUpperCase(),
    title: `${getTextSize(size).fontSize}px`,
  }));

  return createButtonGroup({
    label: "Symbol Size",
    buttons,
    value,
    onChange,
  });
}
