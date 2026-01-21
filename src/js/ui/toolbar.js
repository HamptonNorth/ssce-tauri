/**
 * Toolbar Event Handling
 * Manages toolbar button clicks, dropdowns, and tool switching
 */

import { state, modules, persistState } from "../state.js";
import { showPropertyCard } from "./property-cards/index.js";

// ============================================================================
// Constants
// ============================================================================

// List of tools that appear in the "More Tools" dropdown
const MORE_TOOLS = ["cut", "crop", "steps", "symbols", "combine", "highlight", "fade-edges", "borders"];

// ============================================================================
// Toolbar Events
// ============================================================================

/**
 * Set up toolbar button event listeners
 * @param {Object} handlers - Object containing all handler functions
 */
export function initToolbarEvents(handlers) {
  const { newCanvas, openFile, handleSave, handleSaveAs, handlePrint, toggleSaveToDefault, handleUndo, handleRedo, showResizeDialog, handleFileSelect } = handlers;

  // File dropdown menu
  const fileMenuBtn = document.getElementById("file-menu-btn");
  const fileMenu = document.getElementById("file-menu");
  fileMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileMenu.classList.toggle("hidden");
  });

  document.getElementById("menu-new").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    newCanvas();
  });
  document.getElementById("menu-open").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    openFile();
  });
  document.getElementById("menu-save").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    handleSave();
  });
  document.getElementById("menu-saveas").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    handleSaveAs();
  });
  document.getElementById("menu-paste").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    handlers.handlePasteFromClipboard();
  });
  document.getElementById("menu-copy").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    handlers.handleCopyToClipboard();
  });
  document.getElementById("menu-flatten").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    handlers.handleFlatten();
  });
  document.getElementById("menu-flatten-selected").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    handlers.handleFlattenSelected();
  });
  document.getElementById("menu-snapshot").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    handlers.handleSnapshot();
  });
  document.getElementById("menu-view-snapshots").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    handlers.handleViewSnapshots();
  });
  document.getElementById("menu-print").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    handlePrint();
  });

  document.getElementById("menu-save-to-default").addEventListener("click", () => {
    toggleSaveToDefault();
    fileMenu.classList.add("hidden");
  });

  document.getElementById("menu-set-save-dir").addEventListener("click", async () => {
    fileMenu.classList.add("hidden");
    // Switch save directory to Downloads
    const { useSaveToDownloads } = await import("../file-operations.js");
    await useSaveToDownloads();
  });

  // .ssce file format menu items
  document.getElementById("menu-export-png").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    handlers.handleExportPng();
  });

  document.getElementById("menu-export-snapshot-viewer").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    handlers.handleExportSnapshotViewer();
  });

  document.getElementById("menu-edit-file-info").addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    handlers.handleEditFileInfo();
  });

  // Line style dropdown menu
  const lineStyleBtn = document.getElementById("line-style-btn");
  const lineStyleMenu = document.getElementById("line-style-menu");
  lineStyleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    lineStyleMenu.classList.toggle("hidden");
  });

  document.querySelectorAll("#line-style-menu button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const style = btn.dataset.style;
      state.lineStyle = style;
      persistState("lineStyle", style);
      document.getElementById("current-line-style").textContent = style.charAt(0).toUpperCase() + style.slice(1);
      lineStyleMenu.classList.add("hidden");
    });
  });

  // Text size dropdown menu
  const textSizeBtn = document.getElementById("text-size-btn");
  const textSizeMenu = document.getElementById("text-size-menu");
  textSizeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    textSizeMenu.classList.toggle("hidden");
  });

  document.querySelectorAll("#text-size-menu button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const size = btn.dataset.size;
      state.textSize = size;
      persistState("textSize", size);
      document.getElementById("current-text-size").textContent = size.toUpperCase();
      textSizeMenu.classList.add("hidden");
    });
  });

  // More Tools dropdown menu
  const moreToolsBtn = document.getElementById("btn-more-tools");
  const moreToolsMenu = document.getElementById("more-tools-menu");
  moreToolsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    moreToolsMenu.classList.toggle("hidden");
  });

  // More tools selection - each tool logs to console and moves to main toolbar
  document.querySelectorAll("#more-tools-menu button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const toolName = btn.dataset.tool;
      console.log(`More tool clicked: ${toolName}`);
      moreToolsMenu.classList.add("hidden");

      // Move the clicked tool to the "currently selected more tool" slot
      moveMoreToolToMainToolbar(btn);

      // Activate the tool (placeholder - just log for now)
      setActiveTool(toolName);
    });
  });

  // Corner style dropdown menu
  const cornerStyleBtn = document.getElementById("corner-style-btn");
  const cornerStyleMenu = document.getElementById("corner-style-menu");
  if (cornerStyleBtn && cornerStyleMenu) {
    cornerStyleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      cornerStyleMenu.classList.toggle("hidden");
    });

    document.querySelectorAll("#corner-style-menu button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const corner = btn.dataset.corner;
        state.shapeCornerStyle = corner;
        persistState("shapeCornerStyle", corner);
        const indicator = document.getElementById("current-corner-style");
        if (indicator) {
          indicator.textContent = corner.charAt(0).toUpperCase() + corner.slice(1);
        }
        cornerStyleMenu.classList.add("hidden");
      });
    });
  }

  // Shape fill color button
  const shapeFillBtn = document.getElementById("shape-fill-btn");
  if (shapeFillBtn) {
    shapeFillBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Import dialogs dynamically to show the shape fill picker
      import("./dialogs/index.js").then((dialogs) => {
        dialogs.showShapeFillPickerDialog();
      });
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener("click", () => {
    fileMenu.classList.add("hidden");
    lineStyleMenu.classList.add("hidden");
    textSizeMenu.classList.add("hidden");
    moreToolsMenu.classList.add("hidden");
    if (cornerStyleMenu) cornerStyleMenu.classList.add("hidden");
  });

  // Undo/Redo
  document.getElementById("btn-undo").addEventListener("click", handleUndo);
  document.getElementById("btn-redo").addEventListener("click", handleRedo);

  // Tool selection
  document.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTool(btn.dataset.tool));
  });

  // Canvas resize button
  document.getElementById("btn-resize-canvas").addEventListener("click", () => {
    showResizeDialog();
  });

  // File input change handler
  document.getElementById("file-input").addEventListener("change", handleFileSelect);
}

/**
 * Set the active tool
 * @param {string} toolName - Tool name (select, arrow, line, text, combine, shape, etc.)
 */
export function setActiveTool(toolName) {
  // Deactivate current tool
  if (state.currentTool === "select") modules.selectTool.deactivate();
  if (state.currentTool === "arrow") modules.arrowTool.deactivate();
  if (state.currentTool === "line") modules.lineTool.deactivate();
  if (state.currentTool === "text") modules.textTool.deactivate();
  if (state.currentTool === "combine") modules.combineTool.deactivate();
  if (state.currentTool === "steps") modules.stepsTool.deactivate();
  if (state.currentTool === "symbols") modules.symbolsTool.deactivate();
  if (state.currentTool === "shape") modules.shapeTool.deactivate();
  if (state.currentTool === "highlight") modules.highlightTool.deactivate();
  if (state.currentTool === "crop") modules.cropTool.deactivate();
  if (state.currentTool === "cut") modules.cutTool.deactivate();
  if (state.currentTool === "fade-edges") modules.fadeEdgesTool.deactivate();
  if (state.currentTool === "borders") modules.bordersTool.deactivate();

  state.currentTool = toolName;
  persistState("currentTool", toolName);

  // Show property card for tools that have one
  showPropertyCard(toolName);

  // If this is a "more tool", update the main toolbar button
  if (MORE_TOOLS.includes(toolName)) {
    const menuButton = document.querySelector(`#more-tools-menu button[data-tool="${toolName}"]`);
    if (menuButton) {
      updateSelectedMoreToolButton(toolName, menuButton);
    }
  }

  // Update toolbar UI - mark active button
  document.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tool === toolName);
  });

  // Show/hide line options (visible for shape tool only - arrow/line have property cards)
  document.getElementById("line-options").classList.toggle("hidden", toolName !== "shape");

  // Show/hide text options (visible for text, steps, symbols, and shape tools - they share size settings)
  document.getElementById("text-options").classList.toggle("hidden", toolName !== "text" && toolName !== "steps" && toolName !== "symbols" && toolName !== "shape");

  // Show/hide shape options (visible only for shape tool)
  const shapeOptions = document.getElementById("shape-options");
  if (shapeOptions) {
    shapeOptions.classList.toggle("hidden", toolName !== "shape");
  }

  // Update size dropdown labels based on tool
  updateSizeLabels(toolName);

  // Update canvas cursor
  const canvas = document.getElementById("main-canvas");
  canvas.className = `cursor-${toolName}`;

  // Activate new tool (if implementation exists)
  if (toolName === "select") modules.selectTool.activate();
  if (toolName === "arrow") modules.arrowTool.activate();
  if (toolName === "line") modules.lineTool.activate();
  if (toolName === "text") modules.textTool.activate();
  if (toolName === "combine") modules.combineTool.activate();
  if (toolName === "steps") modules.stepsTool.activate();
  if (toolName === "symbols") modules.symbolsTool.activate();
  if (toolName === "shape") modules.shapeTool.activate();
  if (toolName === "highlight") modules.highlightTool.activate();
  if (toolName === "crop") modules.cropTool.activate();
  if (toolName === "cut") modules.cutTool.activate();
  if (toolName === "fade-edges") modules.fadeEdgesTool.activate();
  if (toolName === "borders") modules.bordersTool.activate();
}

/**
 * Update the "currently selected more tool" button in the main toolbar
 * @param {string} toolName - The tool name
 * @param {HTMLElement} menuButton - The button from the more tools menu
 */
function updateSelectedMoreToolButton(toolName, menuButton) {
  const selectedMoreToolBtn = document.getElementById("btn-selected-more-tool");

  // Clone the icon from the menu button
  const icon = menuButton.querySelector("svg").cloneNode(true);

  // Update the selected more tool button
  selectedMoreToolBtn.innerHTML = "";
  selectedMoreToolBtn.appendChild(icon);
  selectedMoreToolBtn.dataset.tool = toolName;
  selectedMoreToolBtn.title = menuButton.querySelector("span").textContent;

  // Show the button (it's hidden by default)
  selectedMoreToolBtn.classList.remove("hidden");
}

/**
 * Move a more tool button to the main toolbar's "currently selected more tool" slot
 * @param {HTMLElement} menuButton - The button from the more tools menu
 */
function moveMoreToolToMainToolbar(menuButton) {
  const toolName = menuButton.dataset.tool;
  updateSelectedMoreToolButton(toolName, menuButton);
  console.log(`Moved ${toolName} to main toolbar`);
}

/**
 * Update size dropdown labels based on active tool
 * Shape tool shows border widths (1px, 2px, 4px, 8px)
 * Text/Steps/Symbols tools show text sizes (XS 12px, SM 16px, MD 20px, LG 28px)
 * @param {string} toolName - The active tool name
 */
function updateSizeLabels(toolName) {
  const sizeButtons = document.querySelectorAll("#text-size-menu button");

  if (toolName === "shape") {
    // Shape tool: show border widths with size labels
    const labels = {
      xs: "XS (1px)",
      sm: "SM (2px)",
      md: "MD (4px)",
      lg: "LG (8px)",
    };

    sizeButtons.forEach((btn) => {
      const size = btn.dataset.size;
      if (labels[size]) {
        btn.textContent = labels[size];
      }
    });

    // Update current size display
    const currentSizeDisplay = document.getElementById("current-text-size");
    if (currentSizeDisplay) {
      const widths = { xs: "1px", sm: "2px", md: "4px", lg: "8px" };
      currentSizeDisplay.textContent = widths[state.textSize] || "4px";
    }
  } else {
    // Text/Steps/Symbols tools: show text sizes
    const labels = {
      xs: "XS (12px)",
      sm: "SM (16px)",
      md: "MD (20px)",
      lg: "LG (28px)",
    };

    sizeButtons.forEach((btn) => {
      const size = btn.dataset.size;
      if (labels[size]) {
        btn.textContent = labels[size];
      }
    });

    // Update current size display
    const currentSizeDisplay = document.getElementById("current-text-size");
    if (currentSizeDisplay) {
      currentSizeDisplay.textContent = state.textSize.toUpperCase();
    }
  }
}
