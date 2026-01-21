/**
 * Reusable Button Group Component
 *
 * Creates a group of mutually exclusive buttons (like radio buttons but styled as buttons).
 * Supports:
 * - Text labels
 * - Icons (SVG or emoji)
 * - Tooltips
 *
 * Designed for use in property cards.
 */

/**
 * Create a button group component
 * @param {Object} options Configuration options
 * @param {Array} options.buttons - Array of button definitions: [{ value, label, icon?, title?, isHtml? }]
 * @param {string} options.value - Currently selected value
 * @param {string} options.size - Button size: "sm", "md" (default: "sm")
 * @param {string} options.label - Group label (optional)
 * @param {Function} options.onChange - Callback when selection changes: (value) => void
 * @returns {Object} { element: HTMLElement, setValue: (value) => void, getValue: () => string, destroy: () => void }
 */
export function createButtonGroup(options = {}) {
  const { buttons = [], value = null, size = "sm", label = null, onChange = () => {} } = options;

  let currentValue = value || (buttons.length > 0 ? buttons[0].value : null);

  // Size classes
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  // Create container
  const container = document.createElement("div");
  container.className = "button-group-component flex flex-col gap-1";

  // Build the button group HTML
  // If isHtml is true, label is rendered as HTML (for SVG icons etc.)
  container.innerHTML = `
    ${label ? `<label class="text-xs text-gray-400">${label}</label>` : ""}
    <div class="button-group-buttons flex gap-1">
      ${buttons
        .map(
          (btn) => `
        <button type="button"
                class="button-group-btn ${sizeClasses[size]} rounded border border-gray-600 hover:border-gray-400 transition-colors ${btn.value === currentValue ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-700 text-gray-300"}"
                data-value="${btn.value}"
                ${btn.title ? `title="${btn.title}"` : ""}>
          ${btn.icon ? `<span class="button-icon">${btn.icon}</span>` : ""}
          ${btn.label ? (btn.isHtml ? btn.label : `<span class="button-label">${btn.label}</span>`) : ""}
        </button>
      `,
        )
        .join("")}
    </div>
  `;

  // Get references
  const buttonElements = container.querySelectorAll(".button-group-btn");

  /**
   * Update visual selection state
   */
  function updateSelection() {
    buttonElements.forEach((btn) => {
      const isSelected = btn.dataset.value === currentValue;
      btn.classList.toggle("bg-blue-600", isSelected);
      btn.classList.toggle("border-blue-500", isSelected);
      btn.classList.toggle("text-white", isSelected);
      btn.classList.toggle("bg-gray-700", !isSelected);
      btn.classList.toggle("text-gray-300", !isSelected);
      btn.classList.toggle("border-gray-600", !isSelected);
    });
  }

  /**
   * Handle button click
   */
  function handleClick(e) {
    const btn = e.target.closest(".button-group-btn");
    if (btn && btn.dataset.value !== currentValue) {
      currentValue = btn.dataset.value;
      updateSelection();
      onChange(currentValue);
    }
  }

  // Wire up event listeners
  buttonElements.forEach((btn) => btn.addEventListener("click", handleClick));

  // Return the component interface
  return {
    element: container,

    setValue(val) {
      if (val !== currentValue) {
        currentValue = val;
        updateSelection();
      }
    },

    getValue() {
      return currentValue;
    },

    destroy() {
      buttonElements.forEach((btn) => btn.removeEventListener("click", handleClick));
    },
  };
}

/**
 * Create a line style button group (convenience function)
 * @param {Object} options
 * @param {string} options.value - Current style (solid, dashed, dotted)
 * @param {Function} options.onChange - Callback
 * @returns {Object} Button group component
 */
export function createLineStyleGroup(options = {}) {
  const { value = "solid", onChange = () => {} } = options;

  return createButtonGroup({
    label: "Line Style",
    buttons: [
      {
        value: "solid",
        label: "━━━",
        title: "Solid line",
      },
      {
        value: "dashed",
        label: "╌╌╌",
        title: "Dashed line",
      },
      {
        value: "dotted",
        label: "···",
        title: "Dotted line",
      },
    ],
    value,
    onChange,
  });
}

/**
 * Create a size button group (convenience function)
 * @param {Object} options
 * @param {string} options.value - Current size (xs, sm, md, lg)
 * @param {boolean} options.showPixels - Show pixel values in labels
 * @param {Object} options.pixelValues - Custom pixel values { xs: 1, sm: 2, md: 4, lg: 8 }
 * @param {Function} options.onChange - Callback
 * @returns {Object} Button group component
 */
export function createSizeGroup(options = {}) {
  const { value = "md", showPixels = false, pixelValues = { xs: 12, sm: 16, md: 20, lg: 28 }, onChange = () => {} } = options;

  const buttons = ["xs", "sm", "md", "lg"].map((size) => ({
    value: size,
    label: showPixels ? `${size.toUpperCase()} (${pixelValues[size]}px)` : size.toUpperCase(),
    title: `${size.toUpperCase()} - ${pixelValues[size]}px`,
  }));

  return createButtonGroup({
    label: "Size",
    buttons,
    value,
    onChange,
  });
}

/**
 * Create a line width preset button group (convenience function)
 * @param {Object} options
 * @param {string} options.value - Current preset (xs, sm, md, lg, xl)
 * @param {Function} options.onChange - Callback
 * @returns {Object} Button group component
 */
export function createLineWidthPresetGroup(options = {}) {
  const { value = "sm", onChange = () => {} } = options;

  return createButtonGroup({
    label: "Line Width",
    buttons: [
      { value: "xs", label: "XS", title: "1px" },
      { value: "sm", label: "SM", title: "2px" },
      { value: "md", label: "MD", title: "4px" },
      { value: "lg", label: "LG", title: "8px" },
      { value: "xl", label: "XL", title: "11px" },
    ],
    value,
    onChange,
  });
}
