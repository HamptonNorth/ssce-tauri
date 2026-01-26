/**
 * SSCE - Export Utilities
 *
 * Handles printing and download (fallback).
 * File saving is now handled via tauri-bridge.js
 */

/**
 * Generate print HTML content (shared by print and debug export)
 * @param {string} imageDataUrl - Base64 image data URL
 * @param {Object} options - Print options
 * @returns {Object} { styles, container } - The style content and HTML content
 */
function generatePrintContent(imageDataUrl, options) {
  const { orientation = "portrait", paperSize = "a4", paddingVertical = 10, paddingHorizontal = 10, filename = "" } = options;

  // Paper size CSS value
  const paperSizeValue = paperSize === "letter" ? "letter" : "A4";

  const styles = `
        @media print {
            @page {
                size: ${paperSizeValue} ${orientation};
                margin: 0;
            }

            /* Hide everything in body */
            body > * {
                display: none !important;
            }

            /* Show only print container */
            #print-container {
                display: flex !important;
                flex-direction: column !important;
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                padding: ${paddingVertical}mm ${paddingHorizontal}mm !important;
                margin: 0 !important;
                background: white !important;
                z-index: 99999 !important;
                box-sizing: border-box !important;
            }

            #print-image-wrapper {
                flex: 1 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-height: 0 !important;
                overflow: hidden !important;
            }

            #print-container img {
                max-width: 100% !important;
                max-height: 100% !important;
                width: auto !important;
                height: auto !important;
                object-fit: contain !important;
            }

            #print-footer {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                font-family: Arial, sans-serif !important;
                font-size: 11px !important;
                color: #888888 !important;
                padding-top: 2mm !important;
                flex-shrink: 0 !important;
            }

            #print-footer-filename {
                text-align: left !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
                max-width: 70% !important;
            }

            #print-footer-page {
                text-align: right !important;
                white-space: nowrap !important;
            }
        }
    `;

  const container = `
    <div id="print-container">
      <div id="print-image-wrapper">
        <img src="${imageDataUrl}" />
      </div>
      <div id="print-footer">
        <span id="print-footer-filename">${filename || ""}</span>
        <span id="print-footer-page">Page 1/1</span>
      </div>
    </div>
  `;

  return { styles, container, paperSizeValue, orientation, paddingVertical, paddingHorizontal };
}

/**
 * Print the canvas
 * @param {CanvasManager} canvasManager
 * @param {Object} options - Print options
 * @param {string} options.orientation - 'portrait' or 'landscape'
 * @param {string} options.paperSize - 'a4' or 'letter'
 * @param {number} options.paddingVertical - Top/bottom padding in mm
 * @param {number} options.paddingHorizontal - Left/right padding in mm
 * @param {string} options.filename - Full file path to display in footer
 */
export function printImage(canvasManager, options = {}) {
  // Capture image data BEFORE any DOM manipulation
  const imageDataUrl = canvasManager.toDataURL();

  const { styles, container, paddingVertical, paddingHorizontal } = generatePrintContent(imageDataUrl, options);

  // Create a print-specific stylesheet with BOTH screen and print styles
  const printStyles = document.createElement("style");
  printStyles.id = "ssce-print-styles";
  printStyles.textContent = `
    /* Screen styles - hide container but keep it rendered */
    #print-container {
      position: fixed;
      left: -9999px;
      top: 0;
      width: 100vw;
      height: 100vh;
      padding: ${paddingVertical}mm ${paddingHorizontal}mm;
      background: white;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    #print-image-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
      overflow: hidden;
    }

    #print-container img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
    }

    #print-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #888888;
      padding-top: 2mm;
      flex-shrink: 0;
    }

    /* Print styles */
    ${styles}
  `;
  document.head.appendChild(printStyles);

  // Create print container from HTML
  const printContainer = document.createElement("div");
  printContainer.innerHTML = container;
  const containerEl = printContainer.firstElementChild;
  document.body.appendChild(containerEl);

  // Wait for image to load and DOM to update before printing
  const img = containerEl.querySelector("img");
  const doPrint = () => {
    // Small delay to ensure styles are applied
    requestAnimationFrame(() => {
      window.print();

      // Cleanup after print dialog closes
      setTimeout(() => {
        containerEl.remove();
        printStyles.remove();
      }, 1000);
    });
  };

  if (img.complete) {
    doPrint();
  } else {
    img.onload = doPrint;
  }
}

/**
 * Export print layout as HTML file and open in browser
 * @param {CanvasManager} canvasManager
 * @param {Object} options - Print options (same as printImage)
 */
export async function exportPrintDebugHtml(canvasManager, options = {}) {
  // Capture image data
  const imageDataUrl = canvasManager.toDataURL();

  const { styles, container, paperSizeValue, orientation, paddingVertical, paddingHorizontal } = generatePrintContent(imageDataUrl, options);

  // Create full HTML document with separate screen and print styles
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Print Preview - ${options.filename || "untitled"}</title>
  <style>
    /* ========== SCREEN STYLES ========== */
    body {
      margin: 0;
      padding: 20px;
      background: #666;
      display: flex;
      justify-content: center;
    }

    /* A4: 210mm x 297mm, Letter: 215.9mm x 279.4mm */
    .page-preview {
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      ${paperSizeValue === "A4" ? (orientation === "portrait" ? "width: 210mm; min-height: 297mm;" : "width: 297mm; min-height: 210mm;") : orientation === "portrait" ? "width: 215.9mm; min-height: 279.4mm;" : "width: 279.4mm; min-height: 215.9mm;"}
      padding: ${paddingVertical}mm ${paddingHorizontal}mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    .page-preview .image-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
      overflow: hidden;
    }

    .page-preview img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
    }

    .page-preview .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #888888;
      padding-top: 2mm;
      flex-shrink: 0;
    }

    .page-preview .footer-filename {
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 70%;
    }

    .page-preview .footer-page {
      text-align: right;
      white-space: nowrap;
    }

    /* ========== PRINT STYLES ========== */
    @media print {
      @page {
        size: ${paperSizeValue} ${orientation};
        margin: 0;
      }

      body {
        margin: 0;
        padding: 0;
        background: white;
      }

      .page-preview {
        width: 100vw;
        height: 100vh;
        box-shadow: none;
        padding: ${paddingVertical}mm ${paddingHorizontal}mm;
        box-sizing: border-box;
      }
    }
  </style>
</head>
<body>
  <div class="page-preview">
    <div class="image-wrapper">
      <img src="${imageDataUrl}" />
    </div>
    <div class="footer">
      <span class="footer-filename">${options.filename || ""}</span>
      <span class="footer-page">Page 1/1</span>
    </div>
  </div>
</body>
</html>`;

  // Try to save and open via Tauri, fall back to download
  if (window.__TAURI__) {
    try {
      const invoke = window.__TAURI__.core.invoke;

      // Get temp directory and save file
      const homeDir = await invoke("get_home_dir");
      const filePath = `${homeDir}/.ssce-temp/print-preview.html`;

      // Ensure temp directory exists and write file
      await invoke("save_autosave", {
        data: html,
        filename: "print-preview.html",
        directory: ".ssce-temp",
      });

      // Open in default browser using Rust command
      await invoke("open_in_default_app", { path: filePath });
    } catch (err) {
      console.error("Failed to open in browser:", err);
      // Fall back to download
      downloadHtmlFile(html);
    }
  } else {
    downloadHtmlFile(html);
  }
}

/**
 * Download HTML as file (fallback)
 */
function downloadHtmlFile(html) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "print-preview.html";
  link.click();
  URL.revokeObjectURL(url);
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
