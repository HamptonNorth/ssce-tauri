/**
 * SSCE - Zoom Management
 * Handles zooming canvas to fit viewport
 */

import { state } from "../state.js";

/**
 * Calculate if zoom is needed and what scale to use
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @returns {{needed: boolean, scale: number}} Zoom info
 */
export function calculateZoomToFit(canvasWidth, canvasHeight) {
  // Get viewport dimensions - use window height minus header, footer, and property card
  const header = document.querySelector("header");
  const footer = document.querySelector("footer");
  const propertyCard = document.getElementById("property-card-container");
  const container = document.getElementById("canvas-container");

  const headerHeight = header ? header.offsetHeight : 0;
  const footerHeight = footer ? footer.offsetHeight : 0;
  const propertyCardHeight = propertyCard ? propertyCard.offsetHeight : 0;

  // Available viewport height = window height - header - property card - footer - padding
  // Available viewport width = container width - padding
  const viewportHeight = window.innerHeight - headerHeight - propertyCardHeight - footerHeight - 32; // 32px for padding
  const viewportWidth = container.offsetWidth - 32; // 32px for padding (16px each side)

  // Check if canvas exceeds viewport
  const exceedsWidth = canvasWidth > viewportWidth;
  const exceedsHeight = canvasHeight > viewportHeight;
  const needed = exceedsWidth || exceedsHeight;

  if (!needed) {
    return { needed: false, scale: 1.0 };
  }

  // Calculate scale to fit both dimensions
  const scaleX = viewportWidth / canvasWidth;
  const scaleY = viewportHeight / canvasHeight;

  // Use the smaller scale to ensure entire canvas fits
  const scale = Math.min(scaleX, scaleY);

  return { needed: true, scale };
}

/**
 * Apply zoom to canvas wrapper
 * @param {number} scale - Scale factor (1.0 = 100%)
 */
export function applyZoom(scale) {
  const wrapper = document.getElementById("canvas-wrapper");
  const canvas = document.getElementById("main-canvas");

  if (scale === 1.0) {
    // Reset to 100% - remove inline styles to use canvas natural size
    canvas.style.width = "";
    canvas.style.height = "";
    wrapper.style.width = `${canvas.width}px`;
    wrapper.style.height = `${canvas.height}px`;
  } else {
    // Apply zoom by scaling the canvas element directly via CSS
    // This approach doesn't create layout overflow issues
    const scaledWidth = Math.floor(canvas.width * scale);
    const scaledHeight = Math.floor(canvas.height * scale);

    canvas.style.width = `${scaledWidth}px`;
    canvas.style.height = `${scaledHeight}px`;
    wrapper.style.width = `${scaledWidth}px`;
    wrapper.style.height = `${scaledHeight}px`;
  }

  state.zoomScale = scale;
}

/**
 * Toggle between fit and 100% zoom
 * @param {Function} updateUI - Callback to update UI elements
 */
export function toggleZoom(updateUI) {
  import("../state.js").then(({ modules }) => {
    const canvasManager = modules.canvasManager;
    if (!canvasManager) return;

    // Read actual canvas element size (handles preview states)
    const canvas = canvasManager.getCanvas();
    const width = canvas.width;
    const height = canvas.height;
    const zoomInfo = calculateZoomToFit(width, height);

    if (!zoomInfo.needed) {
      // Image fits viewport, no zoom needed
      return;
    }

    if (state.zoomMode === "100%") {
      // Switch to fit mode
      state.zoomMode = "fit";
      applyZoom(zoomInfo.scale);
    } else {
      // Switch to 100% mode
      state.zoomMode = "100%";
      applyZoom(1.0);
    }

    if (updateUI) {
      updateUI();
    }
  });
}

/**
 * Update canvas wrapper centering based on size
 */
function updateCanvasCentering(canvasWidth, canvasHeight) {
  const wrapper = document.getElementById("canvas-wrapper");
  const container = document.getElementById("canvas-container");
  if (!wrapper || !container) return;

  // Get viewport dimensions
  const header = document.querySelector("header");
  const footer = document.querySelector("footer");
  const propertyCard = document.getElementById("property-card-container");
  const headerHeight = header ? header.offsetHeight : 0;
  const footerHeight = footer ? footer.offsetHeight : 0;
  const propertyCardHeight = propertyCard ? propertyCard.offsetHeight : 0;
  const viewportHeight = window.innerHeight - headerHeight - propertyCardHeight - footerHeight - 32;
  const viewportWidth = container.offsetWidth - 32;

  // Check overflow on each axis independently
  const exceedsWidth = canvasWidth > viewportWidth;
  const exceedsHeight = canvasHeight > viewportHeight;

  // Update classes for CSS
  container.classList.toggle("overflows-x", exceedsWidth);
  container.classList.toggle("overflows-y", exceedsHeight);
  container.classList.toggle("overflows", exceedsWidth || exceedsHeight);

  if (exceedsWidth || exceedsHeight) {
    wrapper.classList.remove("fits-viewport");
    wrapper.classList.add("overflows-viewport");
  } else {
    wrapper.classList.remove("overflows-viewport");
    wrapper.classList.add("fits-viewport");
  }
}

/**
 * Update zoom button state and visibility
 */
export function updateZoomButton() {
  // Import modules directly to avoid state.modules timing issues
  import("../state.js").then(({ modules }) => {
    const canvasManager = modules.canvasManager;
    if (!canvasManager) return;

    const { width, height } = canvasManager.getSize();
    updateCanvasCentering(width, height);
    performZoomButtonUpdate(canvasManager);
  });
}

function performZoomButtonUpdate(canvasManager) {
  const { width, height } = canvasManager.getSize();
  const zoomInfo = calculateZoomToFit(width, height);

  const zoomBtn = document.getElementById("zoom-toggle-btn");
  const zoomLabel = document.getElementById("zoom-label");
  const zoomScale = document.getElementById("zoom-scale");

  if (!zoomBtn) return;

  // Show/hide button based on whether zoom is needed
  if (zoomInfo.needed) {
    zoomBtn.classList.remove("hidden");
    state.canZoom = true;
  } else {
    zoomBtn.classList.add("hidden");
    state.canZoom = false;
    // Reset to 100% if button is hidden
    if (state.zoomMode === "fit") {
      state.zoomMode = "100%";
      applyZoom(1.0);
    }
    return;
  }

  // Update button text and scale display
  // Show current state, not what button will do
  if (state.zoomMode === "100%") {
    zoomLabel.textContent = "100%";
    zoomScale.textContent = "";
  } else {
    const scalePercent = Math.round(zoomInfo.scale * 100);
    zoomLabel.textContent = `${scalePercent}%`;
    zoomScale.textContent = "(Fit)";
  }
}

/**
 * Re-calculate and apply current zoom after canvas size change
 * @param {boolean} autoFitIfNeeded - If true, auto-switch to fit mode for large images
 */
export function recalculateZoom(autoFitIfNeeded = false) {
  import("../state.js").then(({ modules }) => {
    const canvasManager = modules.canvasManager;
    if (!canvasManager) return;

    // Read actual canvas element size (handles preview states where canvas
    // is resized directly without updating canvasManager's stored size)
    const canvas = canvasManager.getCanvas();
    const width = canvas.width;
    const height = canvas.height;
    const zoomInfo = calculateZoomToFit(width, height);

    // Auto-fit large images on initial load
    if (autoFitIfNeeded && zoomInfo.needed && state.zoomMode === "100%") {
      state.zoomMode = "fit";
      applyZoom(zoomInfo.scale);
    } else if (state.zoomMode === "fit") {
      if (zoomInfo.needed) {
        applyZoom(zoomInfo.scale);
      } else {
        // Image no longer exceeds viewport, reset to 100%
        state.zoomMode = "100%";
        applyZoom(1.0);
      }
    }

    updateZoomButton();
  });
}

/**
 * Initialize window resize listener for zoom recalculation
 */
export function initZoomResizeListener() {
  let resizeTimeout;
  window.addEventListener("resize", () => {
    // Debounce to avoid excessive recalculations during drag resize
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      recalculateZoom();
    }, 150);
  });
}
