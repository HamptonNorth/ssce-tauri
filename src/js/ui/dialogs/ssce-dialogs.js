/**
 * SSCE File Format Dialogs
 *
 * Dialogs related to the .ssce file format: Front Matter and View Snapshots.
 * These support non-destructive editing with metadata and snapshot history.
 *
 * Exports:
 * - initSsceDialogs() - Initialize .ssce dialog event handlers
 * - showFrontMatterDialog(options) - Show front matter editing dialog
 * - showViewSnapshotsDialog() - Show the snapshot carousel dialog
 * - updateViewSnapshotsButton() - Update snapshot menu button states
 */

import { state } from "../../state.js";
import { showToast } from "../../utils/toast.js";
import { getDefaultInitials } from "../../utils/config.js";
import { getFrontMatter, getSnapshots } from "../../ssce-file-ops.js";

// Session-level initials tracking (persists across dialogs within a session)
// This allows users to set their initials once and have them remembered
let sessionInitials = null;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize .ssce-related dialog event handlers
 */
export function initSsceDialogs() {
  // Front Matter dialog
  const frontMatterDialog = document.getElementById("dialog-front-matter");
  document.getElementById("front-matter-cancel").addEventListener("click", () => {
    frontMatterDialog.close();
    state.frontMatterResolve?.(false);
  });
  frontMatterDialog.addEventListener("submit", handleFrontMatterSubmit);
  frontMatterDialog.addEventListener("cancel", () => {
    state.frontMatterResolve?.(false);
  });

  // View Snapshots dialog
  const viewSnapshotsDialog = document.getElementById("dialog-view-snapshots");
  document.getElementById("view-snapshots-close").addEventListener("click", () => {
    viewSnapshotsDialog.close();
  });
  viewSnapshotsDialog.addEventListener("cancel", () => {
    // Handle Escape key
    viewSnapshotsDialog.close();
  });
}

// ============================================================================
// Front Matter Dialog
// ============================================================================

/**
 * Show front matter dialog for editing file metadata
 *
 * Front matter includes:
 * - Title: Brief title for the screenshot/document
 * - Summary: Description of what the screenshot shows
 * - Initials: Author identifier (persisted within session)
 * - Date: Creation/modification timestamps
 *
 * @param {Object} options - Dialog configuration
 * @param {string} options.title - Dialog title (e.g., "File Information", "Snapshot Details")
 * @param {Object} options.frontMatter - Existing front matter to populate (optional)
 * @param {string} options.mode - Dialog mode: "save" (for new save) or "edit" (editing existing)
 * @returns {Promise<Object|false>} Front matter object if confirmed, false if cancelled
 *
 * @example
 * const metadata = await showFrontMatterDialog({
 *   title: "Snapshot Details",
 *   frontMatter: { title: "Step 1" },
 *   mode: "save"
 * });
 */
export function showFrontMatterDialog({ title = "File Information", frontMatter = {}, mode = "edit" } = {}) {
  return new Promise((resolve) => {
    const dialog = document.getElementById("dialog-front-matter");
    const dialogTitle = document.getElementById("front-matter-title");
    const titleInput = document.getElementById("front-matter-file-title");
    const summaryInput = document.getElementById("front-matter-summary");
    const initialsInput = document.getElementById("front-matter-initials");
    const dateInput = document.getElementById("front-matter-date");

    // Set dialog title
    dialogTitle.textContent = title;

    // Get current front matter or defaults
    const current = frontMatter || getFrontMatter() || {};

    // Populate fields
    titleInput.value = current.title || "";
    summaryInput.value = current.summary || "";

    // Initials priority: session > front matter > config > "ABC"
    // This ensures user's preferred initials are used consistently
    let initialsValue = "";
    if (sessionInitials) {
      // Use session initials if user changed them during this session
      initialsValue = sessionInitials;
    } else if (current.initials) {
      // Use front matter initials from file
      initialsValue = current.initials;
    } else {
      // Fall back to config default, then "ABC" if blank
      const configInitials = getDefaultInitials();
      initialsValue = configInitials || "ABC";
    }
    initialsInput.value = initialsValue;

    // Format date for display (human-readable)
    const dateToShow = current.created || new Date().toISOString();
    const formattedDate = new Date(dateToShow).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    dateInput.value = formattedDate;

    // Store resolve function and mode in state for the submit handler
    state.frontMatterResolve = resolve;
    state.frontMatterMode = mode;
    state.frontMatterOriginalCreated = current.created;

    dialog.showModal();

    // Focus the title input
    setTimeout(() => titleInput.focus(), 50);
  });
}

/**
 * Handle front matter dialog form submission
 * Builds front matter object and resolves the promise
 */
function handleFrontMatterSubmit(e) {
  e.preventDefault();

  const titleInput = document.getElementById("front-matter-file-title");
  const summaryInput = document.getElementById("front-matter-summary");
  const initialsInput = document.getElementById("front-matter-initials");

  const now = new Date().toISOString();
  const newInitials = initialsInput.value.trim().toUpperCase();

  // Track initials change for session persistence
  // This ensures subsequent dialogs use the user's updated initials
  if (newInitials) {
    sessionInitials = newInitials;
  }

  // Build front matter object
  const frontMatter = {
    title: titleInput.value.trim(),
    summary: summaryInput.value.trim(),
    initials: newInitials,
    created: state.frontMatterOriginalCreated || now,
    modified: now,
  };

  // Close dialog
  document.getElementById("dialog-front-matter").close();

  // Resolve promise with front matter
  state.frontMatterResolve?.(frontMatter);
  state.frontMatterResolve = null;
}

// ============================================================================
// View Snapshots Dialog
// ============================================================================

/**
 * Show the View Snapshots carousel dialog
 *
 * Displays all captured snapshots in a navigable carousel.
 * Users can view snapshot history, restore previous states, or delete snapshots.
 */
export function showViewSnapshotsDialog() {
  const snapshots = getSnapshots();

  if (snapshots.length === 0) {
    showToast("No snapshots to view", "info");
    return;
  }

  const dialog = document.getElementById("dialog-view-snapshots");
  const container = document.getElementById("snapshots-carousel-container");

  // Create or update the carousel component (Lit-based web component)
  let carousel = container.querySelector("ssce-snapshot-carousel");
  if (!carousel) {
    carousel = document.createElement("ssce-snapshot-carousel");
    container.appendChild(carousel);
  }

  // Set snapshots data
  carousel.snapshots = snapshots;
  carousel.currentIndex = 0;

  dialog.showModal();
}

/**
 * Update the View Snapshots menu button state
 * Called after snapshots are added/removed or file is loaded.
 * Disables the button when no snapshots exist.
 */
export function updateViewSnapshotsButton() {
  const snapshots = getSnapshots();
  const hasSnapshots = snapshots.length > 0;

  const viewBtn = document.getElementById("menu-view-snapshots");
  if (viewBtn) {
    viewBtn.disabled = !hasSnapshots;
  }

  const exportBtn = document.getElementById("menu-export-snapshot-viewer");
  if (exportBtn) {
    exportBtn.disabled = !hasSnapshots;
  }
}
