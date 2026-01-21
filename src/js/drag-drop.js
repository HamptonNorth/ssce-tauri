/**
 * Drag and Drop File Handling
 * Handles image file drops onto the canvas
 */

import { modules } from "./state.js";
import { showChoiceModal } from "./ui/dialogs/index.js";

// ============================================================================
// Drag and Drop
// ============================================================================

/**
 * Initialize drag and drop for image files
 * @param {Function} loadImageFile - Callback to load an image file
 * @param {Function} setActiveTool - Callback to set active tool
 */
export function initDragAndDrop(loadImageFile, setActiveTool) {
  const container = document.getElementById("canvas-container");
  const dropZone = document.getElementById("drop-zone");

  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.remove("hidden");
  });

  container.addEventListener("dragleave", (e) => {
    if (!container.contains(e.relatedTarget)) {
      dropZone.classList.add("hidden");
    }
  });

  container.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropZone.classList.add("hidden");

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      if (modules.layerManager.hasLayers()) {
        // Ask if user wants to combine or replace
        const choice = await showChoiceModal("Image Dropped", "Do you want to combine this image with the current canvas, or replace the current image entirely?", [
          { label: "Combine Images", value: "combine", primary: true },
          { label: "Replace Current", value: "replace" },
        ]);
        if (choice === "combine") {
          setActiveTool("combine");
          modules.combineTool.loadSecondImage(file);
        } else if (choice === "replace") {
          loadImageFile(file);
        }
        // null = cancelled, do nothing
      } else {
        loadImageFile(file);
      }
    }
  });
}
