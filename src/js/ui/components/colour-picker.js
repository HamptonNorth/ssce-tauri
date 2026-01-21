/**
 * Reusable Colour Picker Component
 *
 * Creates a colour picker with:
 * - Palette swatches (configurable, 6 colours in 2 rows of 3)
 * - Custom colour button (rainbow gradient) - opens hex input + named colours
 * - Eyedropper button (uses EyeDropper API for screen-wide picking)
 * - Last custom colour memory
 * - Transparency option (optional)
 *
 * Layout:
 *   Row 1: [colour1] [colour2] [colour3]
 *   Row 2: [colour4] [colour5] [colour6] [gap] [custom] [eyedropper]
 *
 * Designed for use in property cards and other UI contexts.
 */

// CSS Named Colours - complete set from MDN
const CSS_NAMED_COLOURS = [
  { name: "aliceblue", hex: "#F0F8FF" },
  { name: "antiquewhite", hex: "#FAEBD7" },
  { name: "aqua", hex: "#00FFFF" },
  { name: "aquamarine", hex: "#7FFFD4" },
  { name: "azure", hex: "#F0FFFF" },
  { name: "beige", hex: "#F5F5DC" },
  { name: "bisque", hex: "#FFE4C4" },
  { name: "black", hex: "#000000" },
  { name: "blanchedalmond", hex: "#FFEBCD" },
  { name: "blue", hex: "#0000FF" },
  { name: "blueviolet", hex: "#8A2BE2" },
  { name: "brown", hex: "#A52A2A" },
  { name: "burlywood", hex: "#DEB887" },
  { name: "cadetblue", hex: "#5F9EA0" },
  { name: "chartreuse", hex: "#7FFF00" },
  { name: "chocolate", hex: "#D2691E" },
  { name: "coral", hex: "#FF7F50" },
  { name: "cornflowerblue", hex: "#6495ED" },
  { name: "cornsilk", hex: "#FFF8DC" },
  { name: "crimson", hex: "#DC143C" },
  { name: "cyan", hex: "#00FFFF" },
  { name: "darkblue", hex: "#00008B" },
  { name: "darkcyan", hex: "#008B8B" },
  { name: "darkgoldenrod", hex: "#B8860B" },
  { name: "darkgray", hex: "#A9A9A9" },
  { name: "darkgreen", hex: "#006400" },
  { name: "darkkhaki", hex: "#BDB76B" },
  { name: "darkmagenta", hex: "#8B008B" },
  { name: "darkolivegreen", hex: "#556B2F" },
  { name: "darkorange", hex: "#FF8C00" },
  { name: "darkorchid", hex: "#9932CC" },
  { name: "darkred", hex: "#8B0000" },
  { name: "darksalmon", hex: "#E9967A" },
  { name: "darkseagreen", hex: "#8FBC8F" },
  { name: "darkslateblue", hex: "#483D8B" },
  { name: "darkslategray", hex: "#2F4F4F" },
  { name: "darkturquoise", hex: "#00CED1" },
  { name: "darkviolet", hex: "#9400D3" },
  { name: "deeppink", hex: "#FF1493" },
  { name: "deepskyblue", hex: "#00BFFF" },
  { name: "dimgray", hex: "#696969" },
  { name: "dodgerblue", hex: "#1E90FF" },
  { name: "firebrick", hex: "#B22222" },
  { name: "floralwhite", hex: "#FFFAF0" },
  { name: "forestgreen", hex: "#228B22" },
  { name: "fuchsia", hex: "#FF00FF" },
  { name: "gainsboro", hex: "#DCDCDC" },
  { name: "ghostwhite", hex: "#F8F8FF" },
  { name: "gold", hex: "#FFD700" },
  { name: "goldenrod", hex: "#DAA520" },
  { name: "gray", hex: "#808080" },
  { name: "green", hex: "#008000" },
  { name: "greenyellow", hex: "#ADFF2F" },
  { name: "honeydew", hex: "#F0FFF0" },
  { name: "hotpink", hex: "#FF69B4" },
  { name: "indianred", hex: "#CD5C5C" },
  { name: "indigo", hex: "#4B0082" },
  { name: "ivory", hex: "#FFFFF0" },
  { name: "khaki", hex: "#F0E68C" },
  { name: "lavender", hex: "#E6E6FA" },
  { name: "lavenderblush", hex: "#FFF0F5" },
  { name: "lawngreen", hex: "#7CFC00" },
  { name: "lemonchiffon", hex: "#FFFACD" },
  { name: "lightblue", hex: "#ADD8E6" },
  { name: "lightcoral", hex: "#F08080" },
  { name: "lightcyan", hex: "#E0FFFF" },
  { name: "lightgoldenrodyellow", hex: "#FAFAD2" },
  { name: "lightgray", hex: "#D3D3D3" },
  { name: "lightgreen", hex: "#90EE90" },
  { name: "lightpink", hex: "#FFB6C1" },
  { name: "lightsalmon", hex: "#FFA07A" },
  { name: "lightseagreen", hex: "#20B2AA" },
  { name: "lightskyblue", hex: "#87CEFA" },
  { name: "lightslategray", hex: "#778899" },
  { name: "lightsteelblue", hex: "#B0C4DE" },
  { name: "lightyellow", hex: "#FFFFE0" },
  { name: "lime", hex: "#00FF00" },
  { name: "limegreen", hex: "#32CD32" },
  { name: "linen", hex: "#FAF0E6" },
  { name: "magenta", hex: "#FF00FF" },
  { name: "maroon", hex: "#800000" },
  { name: "mediumaquamarine", hex: "#66CDAA" },
  { name: "mediumblue", hex: "#0000CD" },
  { name: "mediumorchid", hex: "#BA55D3" },
  { name: "mediumpurple", hex: "#9370DB" },
  { name: "mediumseagreen", hex: "#3CB371" },
  { name: "mediumslateblue", hex: "#7B68EE" },
  { name: "mediumspringgreen", hex: "#00FA9A" },
  { name: "mediumturquoise", hex: "#48D1CC" },
  { name: "mediumvioletred", hex: "#C71585" },
  { name: "midnightblue", hex: "#191970" },
  { name: "mintcream", hex: "#F5FFFA" },
  { name: "mistyrose", hex: "#FFE4E1" },
  { name: "moccasin", hex: "#FFE4B5" },
  { name: "navajowhite", hex: "#FFDEAD" },
  { name: "navy", hex: "#000080" },
  { name: "oldlace", hex: "#FDF5E6" },
  { name: "olive", hex: "#808000" },
  { name: "olivedrab", hex: "#6B8E23" },
  { name: "orange", hex: "#FFA500" },
  { name: "orangered", hex: "#FF4500" },
  { name: "orchid", hex: "#DA70D6" },
  { name: "palegoldenrod", hex: "#EEE8AA" },
  { name: "palegreen", hex: "#98FB98" },
  { name: "paleturquoise", hex: "#AFEEEE" },
  { name: "palevioletred", hex: "#DB7093" },
  { name: "papayawhip", hex: "#FFEFD5" },
  { name: "peachpuff", hex: "#FFDAB9" },
  { name: "peru", hex: "#CD853F" },
  { name: "pink", hex: "#FFC0CB" },
  { name: "plum", hex: "#DDA0DD" },
  { name: "powderblue", hex: "#B0E0E6" },
  { name: "purple", hex: "#800080" },
  { name: "rebeccapurple", hex: "#663399" },
  { name: "red", hex: "#FF0000" },
  { name: "rosybrown", hex: "#BC8F8F" },
  { name: "royalblue", hex: "#4169E1" },
  { name: "saddlebrown", hex: "#8B4513" },
  { name: "salmon", hex: "#FA8072" },
  { name: "sandybrown", hex: "#F4A460" },
  { name: "seagreen", hex: "#2E8B57" },
  { name: "seashell", hex: "#FFF5EE" },
  { name: "sienna", hex: "#A0522D" },
  { name: "silver", hex: "#C0C0C0" },
  { name: "skyblue", hex: "#87CEEB" },
  { name: "slateblue", hex: "#6A5ACD" },
  { name: "slategray", hex: "#708090" },
  { name: "snow", hex: "#FFFAFA" },
  { name: "springgreen", hex: "#00FF7F" },
  { name: "steelblue", hex: "#4682B4" },
  { name: "tan", hex: "#D2B48C" },
  { name: "teal", hex: "#008080" },
  { name: "thistle", hex: "#D8BFD8" },
  { name: "tomato", hex: "#FF6347" },
  { name: "turquoise", hex: "#40E0D0" },
  { name: "violet", hex: "#EE82EE" },
  { name: "wheat", hex: "#F5DEB3" },
  { name: "white", hex: "#FFFFFF" },
  { name: "whitesmoke", hex: "#F5F5F5" },
  { name: "yellow", hex: "#FFFF00" },
  { name: "yellowgreen", hex: "#9ACD32" },
];

/**
 * Check if EyeDropper API is available and functional at runtime
 * The EyeDropper API is available in Chrome 95+, Edge 95+, Opera 81+
 * Not available in Firefox, Safari, or Linux (Chromium limitation)
 *
 * Uses Google's recommended detection pattern:
 * https://developer.chrome.com/docs/capabilities/web-apis/eyedropper
 * @returns {{supported: boolean, reason: string|null}}
 */
function checkEyeDropperSupport() {
  // Check if API exists
  if (!("EyeDropper" in window)) {
    return { supported: false, reason: "browser" };
  }

  // EyeDropper API exists but doesn't work on Linux (Chromium bug #1348921)
  const isLinux = navigator.platform.toLowerCase().includes("linux");
  if (isLinux) {
    return { supported: false, reason: "linux" };
  }

  return { supported: true, reason: null };
}

/**
 * Create a colour picker component
 * @param {Object} options Configuration options
 * @param {string[]} options.palette - Array of hex colours for swatches (6 colours)
 * @param {boolean} options.allowTransparent - Show transparency swatch (default: false)
 * @param {boolean} options.allowCustom - Show custom colour picker (default: true)
 * @param {boolean} options.allowEyedropper - Show eyedropper button (default: true)
 * @param {string} options.value - Initial colour value
 * @param {string} options.storageKey - localStorage key for last custom colour (optional)
 * @param {Function} options.onChange - Callback when colour changes: (colour) => void
 * @returns {Object} { element: HTMLElement, setValue: (colour) => void, getValue: () => string, destroy: () => void }
 */
export function createColourPicker(options = {}) {
  const { label = null, palette = ["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00"], allowTransparent = false, allowCustom = true, allowEyedropper = true, value = "#FF0000", storageKey = null, onChange = () => {}, onHeightChange = null } = options;

  let currentColour = value;
  let lastCustomColour = storageKey ? localStorage.getItem(storageKey) || null : null;

  // Create container
  const container = document.createElement("div");
  container.className = "colour-picker-component";

  // Split palette into rows of 3
  const row1Colours = palette.slice(0, 3);
  const row2Colours = palette.slice(3, 6);

  // Build the picker HTML
  // Optional label + Row 1: 3 palette colours
  // Row 2: 3 palette colours + gap + last custom (if exists) + custom button + eyedropper
  container.innerHTML = `
    ${label ? `<div class="text-xs text-gray-400 mb-1">${label}</div>` : ""}
    <div class="colour-picker-grid">
      <!-- Row 1: First 3 palette colours -->
      <div class="flex gap-1 mb-1">
        ${row1Colours
          .map(
            (colour) => `
          <button type="button"
                  class="colour-swatch w-6 h-6 rounded border-2 border-gray-600 hover:border-gray-400 transition-colors"
                  data-colour="${colour}"
                  style="background-color: ${colour}"
                  title="${colour}">
          </button>
        `,
          )
          .join("")}
      </div>
      <!-- Row 2: Next 3 palette colours + gap + tools -->
      <div class="flex gap-1 items-center">
        ${row2Colours
          .map(
            (colour) => `
          <button type="button"
                  class="colour-swatch w-6 h-6 rounded border-2 border-gray-600 hover:border-gray-400 transition-colors"
                  data-colour="${colour}"
                  style="background-color: ${colour}"
                  title="${colour}">
          </button>
        `,
          )
          .join("")}
        ${
          allowTransparent
            ? `
          <button type="button"
                  class="colour-swatch colour-transparent w-6 h-6 rounded border-2 border-gray-600 hover:border-gray-400 transition-colors"
                  data-colour="transparent"
                  style="background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
                         linear-gradient(-45deg, #ccc 25%, transparent 25%),
                         linear-gradient(45deg, transparent 75%, #ccc 75%),
                         linear-gradient(-45deg, transparent 75%, #ccc 75%);
                         background-size: 8px 8px;
                         background-position: 0 0, 0 4px, 4px -4px, -4px 0px;"
                  title="Transparent">
          </button>
        `
            : ""
        }
        <!-- Gap to separate palette from custom tools -->
        <div class="w-1"></div>
        ${
          lastCustomColour
            ? `
          <button type="button"
                  class="colour-swatch colour-last-custom w-6 h-6 rounded border-2 border-gray-600 hover:border-gray-400 transition-colors"
                  data-colour="${lastCustomColour}"
                  style="background-color: ${lastCustomColour}"
                  title="Last custom: ${lastCustomColour}">
          </button>
        `
            : ""
        }
        ${
          allowCustom
            ? `
          <button type="button"
                  class="colour-swatch colour-custom w-6 h-6 rounded border-2 border-gray-600 hover:border-gray-400 transition-colors"
                  data-action="custom"
                  style="background: linear-gradient(135deg, red, yellow, green, cyan, blue, magenta, red)"
                  title="Custom colour">
          </button>
        `
            : ""
        }
        ${
          allowEyedropper
            ? `
          <button type="button"
                  class="colour-swatch colour-eyedropper w-6 h-6 rounded border-2 border-gray-600 hover:border-gray-400 transition-colors flex items-center justify-center bg-gray-700"
                  data-action="eyedropper"
                  title="Eyedropper - pick colour from screen">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </button>
        `
            : ""
        }
      </div>
    </div>
    ${
      allowCustom
        ? `
    <!-- Custom colour input panel (hidden by default) -->
    <div class="custom-colour-panel hidden mt-2 p-2 bg-gray-700 rounded border border-gray-600">
      <!-- Hex input row -->
      <div class="flex items-center gap-2 mb-2">
        <input type="color" class="colour-input-native w-8 h-8 rounded cursor-pointer border-0 p-0" value="${currentColour}">
        <input type="text" class="colour-input-hex flex-1 bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm font-mono"
               value="${currentColour}" placeholder="#FF0000" maxlength="7">
        <button type="button" class="colour-input-apply px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm">OK</button>
      </div>
      <!-- Named colours dropdown - opens upward to avoid overflow -->
      <div class="relative">
        <button type="button" class="named-colours-btn w-full flex items-center justify-between px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm hover:bg-gray-550">
          <span class="named-colours-label">Named colours...</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <div class="named-colours-dropdown hidden absolute left-0 right-0 bottom-full mb-1 bg-gray-700 border border-gray-600 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
          ${CSS_NAMED_COLOURS.map(
            (c) => `
            <button type="button" class="named-colour-option w-full flex items-center gap-2 px-2 py-1 hover:bg-gray-600 text-left text-sm"
                    data-colour="${c.hex}" data-name="${c.name}">
              <span class="w-4 h-4 rounded border border-gray-500 flex-shrink-0" style="background-color: ${c.hex}"></span>
              <span class="truncate">${c.name}</span>
            </button>
          `,
          ).join("")}
        </div>
      </div>
    </div>
    `
        : ""
    }
  `;

  // Get references to elements
  const swatches = container.querySelectorAll(".colour-swatch[data-colour]");
  const customBtn = container.querySelector('[data-action="custom"]');
  const eyedropperBtn = container.querySelector('[data-action="eyedropper"]');
  const customPanel = container.querySelector(".custom-colour-panel");
  const colourInputNative = container.querySelector(".colour-input-native");
  const colourInputHex = container.querySelector(".colour-input-hex");
  const applyBtn = container.querySelector(".colour-input-apply");
  const namedColoursBtn = container.querySelector(".named-colours-btn");
  const namedColoursDropdown = container.querySelector(".named-colours-dropdown");
  const namedColourOptions = container.querySelectorAll(".named-colour-option");

  /**
   * Update visual selection state
   */
  function updateSelection() {
    swatches.forEach((swatch) => {
      const isSelected = swatch.dataset.colour?.toUpperCase() === currentColour?.toUpperCase();
      swatch.classList.toggle("ring-2", isSelected);
      swatch.classList.toggle("ring-white", isSelected);
    });
  }

  /**
   * Set current colour and notify
   */
  function setColour(colour, notify = true) {
    currentColour = colour.toUpperCase();
    updateSelection();

    if (colourInputNative) colourInputNative.value = colour === "transparent" ? "#FFFFFF" : colour;
    if (colourInputHex) colourInputHex.value = colour.toUpperCase();

    if (notify) {
      onChange(colour);
    }
  }

  /**
   * Handle swatch click
   */
  function handleSwatchClick(e) {
    const swatch = e.target.closest(".colour-swatch[data-colour]");
    if (swatch) {
      setColour(swatch.dataset.colour);
      if (customPanel) customPanel.classList.add("hidden");
    }
  }

  /**
   * Handle custom colour button
   */
  function handleCustomClick() {
    if (customPanel) {
      customPanel.classList.toggle("hidden");
      if (!customPanel.classList.contains("hidden")) {
        colourInputHex.focus();
        colourInputHex.select();
      }
      // Notify about height change (for zoom recalculation)
      if (onHeightChange) {
        onHeightChange();
      }
    }
  }

  /**
   * Handle eyedropper - uses EyeDropper API for screen-wide picking
   * Falls back to canvas-only picking with warning toast if API unavailable
   */
  async function handleEyedropperClick() {
    // Check if EyeDropper API is supported at runtime
    const support = checkEyeDropperSupport();
    if (!support.supported) {
      // Fall back to canvas-based eyedropper with appropriate warning
      import("../../utils/toast.js").then((toast) => {
        const message = support.reason === "linux" ? "Screen-wide eyedropper not available on Linux. Picking from canvas only." : "Screen-wide eyedropper not supported. Picking from canvas only.";
        toast.showToast(message, "warning");
      });
      startCanvasEyedropper();
      return;
    }

    // Use native EyeDropper API for screen-wide colour picking
    try {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      const colour = result.sRGBHex.toUpperCase();

      // Save as last custom colour
      if (storageKey) {
        localStorage.setItem(storageKey, colour);
        lastCustomColour = colour;
        updateLastCustomSwatch();
      }

      setColour(colour);
    } catch (err) {
      // User cancelled (pressed Escape) or error - this is normal, don't show error
      if (err.name !== "AbortError") {
        console.log("Eyedropper error:", err);
      }
    }
  }

  /**
   * Start canvas-only eyedropper (fallback for browsers without EyeDropper API)
   */
  function startCanvasEyedropper() {
    const canvas = document.getElementById("main-canvas");
    if (!canvas) return;

    canvas.style.cursor = "crosshair";

    function pickColour(e) {
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const colour = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1].toString(16).padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`.toUpperCase();

      // Save as last custom colour
      if (storageKey) {
        localStorage.setItem(storageKey, colour);
        lastCustomColour = colour;
        updateLastCustomSwatch();
      }

      setColour(colour);
      canvas.style.cursor = "";
      canvas.removeEventListener("click", pickColour);
    }

    canvas.addEventListener("click", pickColour, { once: true });
  }

  /**
   * Update or create the last custom colour swatch
   */
  function updateLastCustomSwatch() {
    let lastSwatch = container.querySelector(".colour-last-custom");
    const row2 = container.querySelector(".colour-picker-grid > div:last-child");
    const gap = row2?.querySelector(".w-2");

    if (lastCustomColour) {
      if (!lastSwatch && row2 && gap) {
        // Create the swatch if it doesn't exist
        lastSwatch = document.createElement("button");
        lastSwatch.type = "button";
        lastSwatch.className = "colour-swatch colour-last-custom w-6 h-6 rounded border-2 border-gray-600 hover:border-gray-400 transition-colors";
        lastSwatch.addEventListener("click", handleSwatchClick);

        // Insert after the gap
        gap.after(lastSwatch);
      }

      if (lastSwatch) {
        lastSwatch.dataset.colour = lastCustomColour;
        lastSwatch.style.backgroundColor = lastCustomColour;
        lastSwatch.title = `Last custom: ${lastCustomColour}`;
      }
    }
  }

  /**
   * Handle custom colour apply
   */
  function handleApplyCustom() {
    let colour = colourInputHex.value.trim().toUpperCase();

    // Validate hex colour
    if (!colour.startsWith("#")) colour = "#" + colour;
    if (!/^#[0-9A-Fa-f]{6}$/.test(colour)) {
      colourInputHex.classList.add("border-red-500");
      return;
    }
    colourInputHex.classList.remove("border-red-500");

    // Save as last custom colour
    if (storageKey) {
      localStorage.setItem(storageKey, colour);
      lastCustomColour = colour;
      updateLastCustomSwatch();
    }

    setColour(colour);
    customPanel.classList.add("hidden");
  }

  /**
   * Handle native colour picker change
   */
  function handleNativeColourChange(e) {
    colourInputHex.value = e.target.value.toUpperCase();
  }

  /**
   * Handle hex input enter key
   */
  function handleHexKeydown(e) {
    if (e.key === "Enter") {
      handleApplyCustom();
    }
  }

  /**
   * Toggle named colours dropdown
   */
  function handleNamedColoursToggle() {
    namedColoursDropdown.classList.toggle("hidden");
  }

  /**
   * Handle named colour selection
   */
  function handleNamedColourSelect(e) {
    const option = e.target.closest(".named-colour-option");
    if (option) {
      const colour = option.dataset.colour.toUpperCase();
      colourInputHex.value = colour;
      colourInputNative.value = colour;
      namedColoursDropdown.classList.add("hidden");

      // Update the button label to show selected colour
      const label = container.querySelector(".named-colours-label");
      if (label) {
        label.textContent = option.dataset.name;
      }
    }
  }

  /**
   * Close named colours dropdown when clicking outside
   */
  function handleDocumentClick(e) {
    if (namedColoursDropdown && !namedColoursDropdown.classList.contains("hidden")) {
      if (!e.target.closest(".named-colours-btn") && !e.target.closest(".named-colours-dropdown")) {
        namedColoursDropdown.classList.add("hidden");
      }
    }
  }

  // Wire up event listeners
  swatches.forEach((swatch) => swatch.addEventListener("click", handleSwatchClick));
  if (customBtn) customBtn.addEventListener("click", handleCustomClick);
  if (eyedropperBtn) eyedropperBtn.addEventListener("click", handleEyedropperClick);
  if (applyBtn) applyBtn.addEventListener("click", handleApplyCustom);
  if (colourInputNative) colourInputNative.addEventListener("input", handleNativeColourChange);
  if (colourInputHex) colourInputHex.addEventListener("keydown", handleHexKeydown);
  if (namedColoursBtn) namedColoursBtn.addEventListener("click", handleNamedColoursToggle);
  if (namedColourOptions) {
    namedColourOptions.forEach((opt) => opt.addEventListener("click", handleNamedColourSelect));
  }
  document.addEventListener("click", handleDocumentClick);

  // Initial selection
  updateSelection();

  // Return the component interface
  return {
    element: container,

    setValue(colour) {
      setColour(colour, false);
    },

    getValue() {
      return currentColour;
    },

    destroy() {
      // Clean up event listeners
      swatches.forEach((swatch) => swatch.removeEventListener("click", handleSwatchClick));
      if (customBtn) customBtn.removeEventListener("click", handleCustomClick);
      if (eyedropperBtn) eyedropperBtn.removeEventListener("click", handleEyedropperClick);
      if (applyBtn) applyBtn.removeEventListener("click", handleApplyCustom);
      if (colourInputNative) colourInputNative.removeEventListener("input", handleNativeColourChange);
      if (colourInputHex) colourInputHex.removeEventListener("keydown", handleHexKeydown);
      if (namedColoursBtn) namedColoursBtn.removeEventListener("click", handleNamedColoursToggle);
      if (namedColourOptions) {
        namedColourOptions.forEach((opt) => opt.removeEventListener("click", handleNamedColourSelect));
      }
      document.removeEventListener("click", handleDocumentClick);
    },
  };
}
