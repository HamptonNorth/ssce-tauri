/**
 * SSCE - Toast Notification Utility
 *
 * Displays temporary toast notifications for user feedback.
 */

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast: 'success', 'error', or 'warning'
 * @param {number} duration - Duration in milliseconds (default 3000)
 */
export function showToast(message, type = "success", duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) {
    console.error("Toast container not found");
    return;
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // Create icon
  const icon = document.createElement("svg");
  icon.className = "toast-icon";
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("viewBox", "0 0 24 24");

  if (type === "success") {
    icon.style.color = "rgb(34, 197, 94)"; // green-500
    icon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M5 13l4 4L19 7" />
        `;
  } else if (type === "error") {
    icon.style.color = "rgb(239, 68, 68)"; // red-500
    icon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M6 18L18 6M6 6l12 12" />
        `;
  } else if (type === "warning") {
    icon.style.color = "rgb(234, 179, 8)"; // yellow-500
    icon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        `;
  }

  // Create message
  const messageEl = document.createElement("div");
  messageEl.className = "toast-message";
  messageEl.textContent = message;

  // Assemble toast
  toast.appendChild(icon);
  toast.appendChild(messageEl);

  // Add to container
  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s ease-out";
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, duration);
}
