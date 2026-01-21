/**
 * SSCE - Export Utilities
 *
 * Handles saving images to server and printing.
 */

import { showAlertModal } from "../ui/dialogs/index.js";

// Default timeout for save operations (5 seconds)
const SAVE_TIMEOUT_MS = 5000;

/**
 * Fetch with timeout support using Promise.race
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options, timeout = SAVE_TIMEOUT_MS) {
  const controller = new AbortController();
  let timeoutId;

  // Create timeout promise that rejects
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("Request timed out. The server may be unavailable."));
    }, timeout);
  });

  try {
    // Create fetch promise
    const fetchPromise = fetch(url, {
      ...options,
      signal: controller.signal,
    });

    // Race between fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    // Handle connection refused / network errors
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      throw new Error("Cannot connect to server. The server may be unavailable.");
    }
    throw err;
  }
}

/**
 * Save image to the server (overwrite original)
 * @param {string} imageData - PNG data URL
 * @returns {Promise<Object>} Result with success status
 */
export async function saveImage(imageData) {
  try {
    const response = await fetchWithTimeout("/api/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageData }),
    });

    const result = await response.json();

    if (result.success) {
      console.log("SSCE: Saved to", result.path);
    } else {
      console.error("SSCE: Save failed", result.error);
      await showAlertModal("Save Failed", "The file could not be saved.\n\nError: " + result.error, "error");
    }

    return result;
  } catch (err) {
    console.error("SSCE: Save error", err);
    await showAlertModal("Save Failed", "The file could not be saved.\n\nError: " + err.message, "error");
    return { success: false, error: err.message };
  }
}

/**
 * Save image with a new filename
 * @param {string} imageData - PNG data URL
 * @param {string} filename - New filename
 * @param {string} directory - Optional directory path
 * @returns {Promise<Object>} Result with success status
 */
export async function saveImageAs(imageData, filename, directory = null) {
  try {
    const response = await fetchWithTimeout("/api/saveas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageData,
        filename,
        directory,
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log("SSCE: Saved as", result.path);
    } else {
      console.error("SSCE: SaveAs failed", result.error);
      await showAlertModal("Save Failed", "The file could not be saved.\n\nError: " + result.error, "error");
    }

    return result;
  } catch (err) {
    console.error("SSCE: SaveAs error", err);
    await showAlertModal("Save Failed", "The file could not be saved.\n\nError: " + err.message, "error");
    return { success: false, error: err.message };
  }
}

/**
 * Print the canvas
 * @param {CanvasManager} canvasManager
 * @param {string} orientation - 'portrait' or 'landscape'
 */
export function printImage(canvasManager, orientation = "portrait") {
  // Create a print-specific stylesheet
  const printStyles = document.createElement("style");
  printStyles.id = "ssce-print-styles";
  printStyles.textContent = `
        @media print {
            @page {
                size: A4 ${orientation};
                margin: 10mm;
            }

            /* Hide everything in body */
            body > * {
                display: none !important;
            }

            /* Show only print container */
            #print-container {
                display: block !important;
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                padding: 0 !important;
                margin: 0 !important;
                background: white !important;
                z-index: 99999 !important;
            }

            #print-container img {
                max-width: 100% !important;
                max-height: 100% !important;
                width: auto !important;
                height: auto !important;
                object-fit: contain !important;
            }
        }
    `;

  document.head.appendChild(printStyles);

  // Create a container with the canvas image
  const printContainer = document.createElement("div");
  printContainer.id = "print-container";

  const img = document.createElement("img");
  img.src = canvasManager.toDataURL();
  printContainer.appendChild(img);

  document.body.appendChild(printContainer);

  // Trigger print
  window.print();

  // Cleanup after print dialog closes
  // Use a small delay to ensure print dialog has opened
  setTimeout(() => {
    printContainer.remove();
    printStyles.remove();
  }, 1000);
}

/**
 * Download image directly to browser (fallback if server save fails)
 * @param {string} imageData - PNG data URL
 * @param {string} filename
 */
export function downloadImage(imageData, filename = "screenshot.png") {
  const link = document.createElement("a");
  link.href = imageData;
  link.download = filename;
  link.click();
}
