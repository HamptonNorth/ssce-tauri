/**
 * Alert and Confirm Modal Dialogs
 *
 * Generic modal dialogs that replace browser's native alert() and confirm().
 * These provide consistent styling and better UX than native dialogs.
 *
 * Exports:
 * - showAlertModal(title, message, type) - Display an alert message
 * - showConfirmModal(title, message, options) - Ask for confirmation
 * - showChoiceModal(title, message, choices) - Present multiple choices
 */

// ============================================================================
// Alert Modal
// ============================================================================

/**
 * Show an alert modal (replaces browser alert())
 *
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message (supports newlines)
 * @param {string} type - Icon type: "error" | "warning" | "info" (default: "error")
 * @returns {Promise<void>} Resolves when dismissed
 *
 * @example
 * await showAlertModal("Error", "Failed to save file", "error");
 * await showAlertModal("Warning", "Large file detected", "warning");
 */
export function showAlertModal(title, message, type = "error") {
  return new Promise((resolve) => {
    const dialog = document.getElementById("dialog-alert");
    const titleEl = document.getElementById("alert-title");
    const messageEl = document.getElementById("alert-message");
    const iconEl = document.getElementById("alert-icon");
    const okBtn = document.getElementById("alert-ok");

    // Set content
    titleEl.textContent = title;
    messageEl.textContent = message;

    // Icon SVGs for different types
    const iconSvgs = {
      error: `<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`,
      warning: `<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>`,
      info: `<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`,
    };

    // Set icon style and SVG based on type
    const iconStyles = {
      error: { bg: "bg-red-500/20", text: "text-red-400" },
      warning: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
      info: { bg: "bg-blue-500/20", text: "text-blue-400" },
    };
    const style = iconStyles[type] || iconStyles.error;
    iconEl.className = `w-12 h-12 rounded-full flex items-center justify-center mb-4 ${style.bg} ${style.text}`;
    iconEl.innerHTML = iconSvgs[type] || iconSvgs.error;

    // Handle close
    const handleClose = () => {
      dialog.close();
      okBtn.removeEventListener("click", handleClose);
      dialog.removeEventListener("cancel", handleClose);
      resolve();
    };

    okBtn.addEventListener("click", handleClose);
    dialog.addEventListener("cancel", handleClose); // ESC key

    dialog.showModal();

    // Focus the OK button for standard UI behavior
    // Enter key will activate the focused button via native button behavior
    okBtn.focus();
  });
}

// ============================================================================
// Confirm Modal
// ============================================================================

/**
 * Show a confirm modal (replaces browser confirm())
 *
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message (supports newlines)
 * @param {Object} options - Optional configuration
 * @param {string} options.confirmText - Confirm button text (default: "Confirm")
 * @param {string} options.cancelText - Cancel button text (default: "Cancel")
 * @param {string} options.type - Icon type: "warning" | "danger" | "info" (default: "warning")
 * @param {boolean} options.danger - If true, confirm button is red (default: false)
 * @returns {Promise<boolean>} true if confirmed, false if cancelled
 *
 * @example
 * const confirmed = await showConfirmModal(
 *   "Delete Layer?",
 *   "This action cannot be undone.",
 *   { confirmText: "Delete", danger: true }
 * );
 */
export function showConfirmModal(title, message, options = {}) {
  return new Promise((resolve) => {
    const { confirmText = "Confirm", cancelText = "Cancel", type = "warning", danger = false } = options;

    const dialog = document.getElementById("dialog-confirm");
    const titleEl = document.getElementById("confirm-title");
    const messageEl = document.getElementById("confirm-message");
    const iconEl = document.getElementById("confirm-icon");
    const okBtn = document.getElementById("confirm-ok");
    const cancelBtn = document.getElementById("confirm-cancel");

    // Set content
    titleEl.textContent = title;
    messageEl.textContent = message;
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    // Set icon style based on type
    const iconStyles = {
      warning: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
      danger: { bg: "bg-red-500/20", text: "text-red-400" },
      info: { bg: "bg-blue-500/20", text: "text-blue-400" },
    };
    const style = iconStyles[type] || iconStyles.warning;
    iconEl.className = `flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.bg} ${style.text}`;

    // Set confirm button style
    if (danger) {
      okBtn.className = "px-4 py-2 rounded bg-red-600 hover:bg-red-500";
    } else {
      okBtn.className = "px-4 py-2 rounded bg-blue-600 hover:bg-blue-500";
    }

    // Cleanup function
    const cleanup = () => {
      okBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
      dialog.removeEventListener("cancel", handleCancel);
    };

    const handleConfirm = () => {
      dialog.close();
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      dialog.close();
      cleanup();
      resolve(false);
    };

    okBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);
    dialog.addEventListener("cancel", handleCancel); // ESC key

    dialog.showModal();

    // Focus the primary (confirm) button for standard UI behavior
    // Enter key will activate the focused button via native button behavior
    okBtn.focus();
  });
}

// ============================================================================
// Choice Modal
// ============================================================================

/**
 * Show a choice modal with multiple options (for decisions like combine/replace)
 *
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message (supports newlines)
 * @param {Array} choices - Array of choice objects
 * @param {string} choices[].label - Button label text
 * @param {string} choices[].value - Value returned when this choice is selected
 * @param {boolean} choices[].primary - If true, button is blue (default style)
 * @param {boolean} choices[].danger - If true, button is red
 * @returns {Promise<string|null>} The value of the chosen option, or null if cancelled
 *
 * @example
 * const choice = await showChoiceModal(
 *   "Image Already Loaded",
 *   "What would you like to do with the new image?",
 *   [
 *     { label: "Combine", value: "combine", primary: true },
 *     { label: "Replace", value: "replace", danger: true }
 *   ]
 * );
 */
export function showChoiceModal(title, message, choices) {
  return new Promise((resolve) => {
    const dialog = document.getElementById("dialog-choice");
    const titleEl = document.getElementById("choice-title");
    const messageEl = document.getElementById("choice-message");
    const buttonsEl = document.getElementById("choice-buttons");

    // Set content
    titleEl.textContent = title;
    messageEl.textContent = message;

    // Clear existing buttons
    buttonsEl.innerHTML = "";

    // Track button cleanup and primary button for focus
    const buttonHandlers = [];
    let primaryBtn = null;

    // Create buttons for each choice
    choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.textContent = choice.label;

      // Style based on primary/danger flags
      if (choice.danger) {
        btn.className = "w-full px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white";
      } else if (choice.primary) {
        btn.className = "w-full px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white";
        primaryBtn = btn;
      } else {
        btn.className = "w-full px-4 py-2 rounded bg-gray-700 hover:bg-gray-600";
      }

      // Track first button as fallback for focus
      if (!primaryBtn && buttonHandlers.length === 0) {
        primaryBtn = btn;
      }

      const handler = () => {
        dialog.close();
        cleanup();
        resolve(choice.value);
      };

      btn.addEventListener("click", handler);
      buttonHandlers.push({ btn, handler });
      buttonsEl.appendChild(btn);
    });

    // Add cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "w-full px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 mt-2";
    const cancelHandler = () => {
      dialog.close();
      cleanup();
      resolve(null);
    };
    cancelBtn.addEventListener("click", cancelHandler);
    buttonHandlers.push({ btn: cancelBtn, handler: cancelHandler });
    buttonsEl.appendChild(cancelBtn);

    // Cleanup function
    const cleanup = () => {
      buttonHandlers.forEach(({ btn, handler }) => {
        btn.removeEventListener("click", handler);
      });
      dialog.removeEventListener("cancel", cancelHandler);
    };

    dialog.addEventListener("cancel", cancelHandler); // ESC key

    dialog.showModal();

    // Focus the primary button (or first choice) for standard UI behavior
    if (primaryBtn) {
      primaryBtn.focus();
    }
  });
}
