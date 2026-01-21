/**
 * Tool-Specific Dialogs
 *
 * Dialogs for specific annotation tools: Steps Reset and Symbol Picker.
 * These provide configuration interfaces for the Steps and Symbols tools.
 *
 * Exports:
 * - initToolDialogs() - Initialize tool dialog event handlers
 * - showStepsResetDialog() - Show the steps counter reset dialog
 * - showSymbolPickerDialog() - Show the symbol selection dialog
 */

import { modules } from "../../state.js";
import { showToast } from "../../utils/toast.js";
import { getSymbols } from "../../utils/config.js";

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize tool-specific dialog event handlers
 */
export function initToolDialogs() {
  // Steps Reset dialog
  const stepsResetDialog = document.getElementById("dialog-steps-reset");
  const stepsResetInput = document.getElementById("steps-reset-number");

  // Handle Enter key to submit, ESC to cancel (ESC handled automatically by dialog)
  stepsResetInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleStepsResetSubmit(e);
    }
  });

  stepsResetDialog.addEventListener("submit", handleStepsResetSubmit);

  // Symbol Picker dialog - symbols are populated dynamically in showSymbolPickerDialog
  const symbolPickerDialog = document.getElementById("dialog-symbol-picker");
  symbolPickerDialog.addEventListener("submit", (e) => {
    e.preventDefault();
    symbolPickerDialog.close();
  });
}

// ============================================================================
// Steps Reset Dialog
// ============================================================================

/**
 * Show the steps counter reset dialog
 *
 * Allows users to change the current step number for the Steps tool.
 * Displays the current step symbol and updates preview as number changes.
 */
export function showStepsResetDialog() {
  const dialog = document.getElementById("dialog-steps-reset");
  const stepsResetInput = document.getElementById("steps-reset-number");
  const stepsCurrentSymbol = document.getElementById("steps-current-symbol");

  // Set to current step number and symbol
  if (modules.stepsTool) {
    stepsResetInput.value = modules.stepsTool.currentStep;
    stepsResetInput.max = modules.stepsTool.steps.length;
    stepsCurrentSymbol.value = modules.stepsTool.getCurrentStepSymbol();
  } else {
    stepsResetInput.value = 1;
    stepsCurrentSymbol.value = "①";
  }

  // Update symbol preview when number changes
  const updateSymbol = () => {
    if (modules.stepsTool) {
      const stepNum = parseInt(stepsResetInput.value, 10);
      if (stepNum >= 1 && stepNum <= modules.stepsTool.steps.length) {
        stepsCurrentSymbol.value = modules.stepsTool.steps[stepNum - 1];
      }
    }
  };
  stepsResetInput.addEventListener("input", updateSymbol);

  dialog.showModal();

  // Focus and select the number input for easy editing
  setTimeout(() => {
    stepsResetInput.focus();
    stepsResetInput.select();
  }, 100);

  // Clean up event listener when dialog closes
  dialog.addEventListener(
    "close",
    () => {
      stepsResetInput.removeEventListener("input", updateSymbol);
    },
    { once: true },
  );
}

/**
 * Handle steps reset dialog form submission
 * Updates the steps tool counter to the specified number
 */
function handleStepsResetSubmit(e) {
  e.preventDefault();
  const stepNumber = parseInt(document.getElementById("steps-reset-number").value);

  // Access the steps tool and reset its counter
  if (modules.stepsTool) {
    const maxSteps = modules.stepsTool.steps.length;
    // Validate step number
    if (stepNumber >= 1 && stepNumber <= maxSteps) {
      modules.stepsTool.currentStep = stepNumber;

      // Show toast notification with the step symbol
      const symbol = modules.stepsTool.getCurrentStepSymbol();
      showToast(`Step counter set to ${symbol}`, "success");

      console.log(`Step counter reset to ${stepNumber}`);
    }
  }

  document.getElementById("dialog-steps-reset").close();

  // Refocus canvas to keep steps tool active
  setTimeout(() => {
    document.getElementById("main-canvas").focus();
  }, 50);
}

// ============================================================================
// Symbol Picker Dialog
// ============================================================================

/**
 * Show the symbol selection dialog
 *
 * Displays a grid of available symbols from config.
 * Clicking a symbol selects it for the Symbols tool.
 */
export function showSymbolPickerDialog() {
  const dialog = document.getElementById("dialog-symbol-picker");
  const grid = document.getElementById("symbol-picker-grid");

  // Get symbols from config
  const symbols = getSymbols();

  // Handle empty symbols array
  if (symbols.length === 0) {
    showToast("No symbols configured in .env", "error");
    return;
  }

  // Clear existing buttons
  grid.innerHTML = "";

  // Adjust grid columns based on number of symbols
  // Max 5 columns for better layout with up to 20 symbols
  const cols = Math.min(5, Math.ceil(Math.sqrt(symbols.length)));
  grid.className = `grid gap-2`;
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

  // Create button for each symbol
  symbols.forEach((symbol) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "w-16 h-16 text-3xl rounded bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center";
    button.textContent = symbol;
    button.addEventListener("click", () => {
      // Set the symbol on the tool
      if (modules.symbolsTool) {
        modules.symbolsTool.currentSymbol = symbol;
        console.log("Symbol selected:", symbol);

        // Show toast notification
        showToast(`Symbol set to ${symbol}`, "success");
      }
      dialog.close();
    });
    grid.appendChild(button);
  });

  dialog.showModal();
}
