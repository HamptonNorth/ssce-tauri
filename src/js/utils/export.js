/**
 * SSCE - Export Utilities
 *
 * Handles printing and download (fallback).
 * File saving is now handled via tauri-bridge.js
 */

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
  setTimeout(() => {
    printContainer.remove();
    printStyles.remove();
  }, 1000);
}

/**
 * Download image directly to browser (fallback if not in Tauri)
 * @param {string} imageData - PNG data URL
 * @param {string} filename
 */
export function downloadImage(imageData, filename = "screenshot.png") {
  const link = document.createElement("a");
  link.href = imageData;
  link.download = filename;
  link.click();
}
