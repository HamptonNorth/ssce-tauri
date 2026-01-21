/**
 * Reusable Slider Component
 *
 * Creates a slider with:
 * - Label
 * - Range input
 * - Value display with unit
 * - Optional live preview vs change-on-release
 *
 * Designed for use in property cards.
 */

/**
 * Create a slider component
 * @param {Object} options Configuration options
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {number} options.value - Initial value
 * @param {number} options.step - Step increment (default: 1)
 * @param {string} options.label - Label text (optional)
 * @param {string} options.unit - Unit suffix (e.g., "px") (optional)
 * @param {boolean} options.livePreview - Call onChange during drag (default: true)
 * @param {Function} options.onChange - Callback when value changes: (value) => void
 * @param {Function} options.onChangeEnd - Callback when slider released (optional)
 * @returns {Object} { element: HTMLElement, setValue: (value) => void, getValue: () => number, destroy: () => void }
 */
export function createSlider(options = {}) {
  const { min = 1, max = 10, value = 5, step = 1, label = null, unit = "", livePreview = true, onChange = () => {}, onChangeEnd = null } = options;

  let currentValue = value;

  // Create container
  const container = document.createElement("div");
  container.className = "slider-component flex flex-col gap-1";

  // Build the slider HTML
  container.innerHTML = `
    ${label ? `<label class="text-xs text-gray-400">${label}</label>` : ""}
    <div class="flex items-center gap-2">
      <input type="range"
             class="slider-input flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
             min="${min}"
             max="${max}"
             step="${step}"
             value="${currentValue}">
      <span class="slider-value text-sm text-gray-300 min-w-[3rem] text-right font-mono">${currentValue}${unit}</span>
    </div>
  `;

  // Get references
  const input = container.querySelector(".slider-input");
  const valueDisplay = container.querySelector(".slider-value");

  /**
   * Update value display
   */
  function updateDisplay() {
    valueDisplay.textContent = `${currentValue}${unit}`;
  }

  /**
   * Handle input event (during drag)
   */
  function handleInput(e) {
    currentValue = parseFloat(e.target.value);
    updateDisplay();
    if (livePreview) {
      onChange(currentValue);
    }
  }

  /**
   * Handle change event (on release)
   */
  function handleChange(e) {
    currentValue = parseFloat(e.target.value);
    updateDisplay();
    if (!livePreview) {
      onChange(currentValue);
    }
    if (onChangeEnd) {
      onChangeEnd(currentValue);
    }
  }

  // Wire up event listeners
  input.addEventListener("input", handleInput);
  input.addEventListener("change", handleChange);

  // Return the component interface
  return {
    element: container,

    setValue(val) {
      currentValue = val;
      input.value = val;
      updateDisplay();
    },

    getValue() {
      return currentValue;
    },

    setMin(val) {
      input.min = val;
    },

    setMax(val) {
      input.max = val;
    },

    destroy() {
      input.removeEventListener("input", handleInput);
      input.removeEventListener("change", handleChange);
    },
  };
}
