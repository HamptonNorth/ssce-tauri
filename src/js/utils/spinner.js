/**
 * SSCE - Loading Spinner Utility
 *
 * Provides a simple loading overlay for file operations.
 */

let overlay = null;

/**
 * Initialize the loading overlay element
 */
function ensureOverlay() {
  if (overlay) return;

  overlay = document.getElementById("loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loading-overlay";
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
  }
}

/**
 * Show the loading spinner overlay
 */
export function showSpinner() {
  ensureOverlay();
  overlay.classList.add("visible");
}

/**
 * Hide the loading spinner overlay
 */
export function hideSpinner() {
  if (overlay) {
    overlay.classList.remove("visible");
  }
}

/**
 * Execute an async function with spinner shown during execution
 * @param {Function} asyncFn - Async function to execute
 * @returns {Promise<any>} Result of the async function
 */
export async function withSpinner(asyncFn) {
  showSpinner();
  try {
    return await asyncFn();
  } finally {
    hideSpinner();
  }
}
