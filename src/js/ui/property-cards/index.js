/**
 * Property Cards Manager
 *
 * Manages the display and lifecycle of tool property cards.
 * Features:
 * - Show/hide cards with slide animation
 * - Auto-hide when clicking canvas
 * - Draggable cards (can be repositioned)
 * - Position persistence
 *
 * Tools without property cards: select, crop, cut, fade-edges, borders, combine
 */

import { ArrowCard } from "./arrow-card.js";
import { LineCard } from "./line-card.js";
import { TextCard } from "./text-card.js";
import { StepsCard } from "./steps-card.js";
import { SymbolsCard } from "./symbols-card.js";
import { ShapeCard } from "./shape-card.js";
import { HighlightCard } from "./highlight-card.js";
import { BordersCard } from "./borders-card.js";

// Card registry - maps tool name to card class
const cardRegistry = {
  arrow: ArrowCard,
  line: LineCard,
  text: TextCard,
  steps: StepsCard,
  symbols: SymbolsCard,
  shape: ShapeCard,
  highlight: HighlightCard,
  borders: BordersCard,
};

// Tools that don't have property cards
const NO_CARD_TOOLS = ["select", "crop", "cut", "fade-edges", "combine"];

// Module state
let container = null;
let contentWrapper = null;
let currentCard = null;
let currentTool = null;
let isVisible = false;
let isDragging = false;
let isDetached = false; // True when card has been dragged away from default position
let dragOffset = { x: 0, y: 0 };

// Default position (below toolbar)
const DEFAULT_POSITION = { attached: true };

/**
 * Initialize the property cards system
 * Call this once during app startup
 */
export function initPropertyCards() {
  // Create container element
  container = document.createElement("div");
  container.id = "property-card-container";
  // Use bg-gray-700 for better contrast with toolbar (bg-gray-800) and body (bg-gray-900)
  container.className = "bg-gray-700 border-b border-gray-600 overflow-hidden transition-all duration-200 ease-out";
  container.style.maxHeight = "0";
  container.style.opacity = "0";

  contentWrapper = document.createElement("div");
  contentWrapper.id = "property-card-content";
  contentWrapper.className = "px-4 py-2 overflow-x-auto";
  contentWrapper.style.minWidth = "0"; // Allow shrinking for overflow
  container.appendChild(contentWrapper);

  // Insert after toolbar header
  const header = document.querySelector("header");
  if (header && header.nextSibling) {
    header.parentNode.insertBefore(container, header.nextSibling);
  } else {
    document.body.insertBefore(container, document.body.firstChild);
  }

  // Setup drag functionality
  setupDragHandlers();

  // Setup keyboard handler
  setupKeyboardHandler();
}

/**
 * Show property card for a tool
 * @param {string} toolName - Tool name
 */
export function showPropertyCard(toolName) {
  // Hide current card first if different tool
  if (currentTool !== toolName && currentCard) {
    hidePropertyCard(false); // Don't animate, immediate switch
  }

  // Check if tool has a property card
  if (NO_CARD_TOOLS.includes(toolName) || !cardRegistry[toolName]) {
    hidePropertyCard();
    return;
  }

  currentTool = toolName;

  // Create card instance
  const CardClass = cardRegistry[toolName];
  currentCard = new CardClass();
  currentCard.onCloseRequest = () => hidePropertyCard();

  // Render and add to container
  const cardElement = currentCard.render();
  contentWrapper.innerHTML = "";
  contentWrapper.appendChild(cardElement);

  // Reset position if was detached
  if (isDetached) {
    resetPosition();
  }

  // Show with animation
  isVisible = true;
  container.style.maxHeight = "400px"; // Accommodate expanded custom colour panel
  container.style.opacity = "1";

  // Recalculate zoom after card is shown (viewport space changed)
  // Use autoFitIfNeeded=true to trigger fit mode if image now exceeds viewport
  setTimeout(() => {
    import("../../utils/zoom.js").then((zoom) => zoom.recalculateZoom(true));
  }, 210); // After animation completes (200ms)
}

/**
 * Hide the property card
 * @param {boolean} animate - Whether to animate (default: true)
 */
export function hidePropertyCard(animate = true) {
  if (!isVisible && !currentCard) return;

  isVisible = false;

  if (animate) {
    container.style.maxHeight = "0";
    container.style.opacity = "0";

    // Cleanup after animation
    setTimeout(() => {
      if (currentCard) {
        currentCard.destroy();
        currentCard = null;
      }
      contentWrapper.innerHTML = "";
      currentTool = null;

      // Recalculate zoom after card is hidden (viewport space changed)
      import("../../utils/zoom.js").then((zoom) => zoom.recalculateZoom());
    }, 200);
  } else {
    container.style.maxHeight = "0";
    container.style.opacity = "0";

    if (currentCard) {
      currentCard.destroy();
      currentCard = null;
    }
    contentWrapper.innerHTML = "";
    currentTool = null;

    // Recalculate zoom (viewport space changed)
    import("../../utils/zoom.js").then((zoom) => zoom.recalculateZoom());
  }
}

/**
 * Force hide - immediate, no animation
 */
export function forceHidePropertyCard() {
  hidePropertyCard(false);
}

/**
 * Check if property card is currently visible
 * @returns {boolean}
 */
export function isPropertyCardVisible() {
  return isVisible;
}

/**
 * Get current tool's card
 * @returns {BasePropertyCard|null}
 */
export function getCurrentCard() {
  return currentCard;
}

// Canvas click handler removed - card closes via Escape or × button only
// This avoids confusion from canvas moving when card collapses

/**
 * Setup drag handlers for card repositioning
 */
function setupDragHandlers() {
  document.addEventListener("mousedown", handleDragStart);
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);
}

/**
 * Handle drag start
 */
function handleDragStart(e) {
  if (!isVisible) return;

  const handle = e.target.closest("[data-drag-handle]");
  if (!handle || !container.contains(handle)) return;

  // Don't start drag if clicking close button
  if (e.target.closest(".property-card-close")) return;

  isDragging = true;
  e.preventDefault();

  // Calculate offset from container position
  const rect = container.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;

  // Switch to fixed positioning for dragging
  if (!isDetached) {
    detachCard();
  }

  container.style.cursor = "grabbing";
}

/**
 * Handle drag move
 */
function handleDragMove(e) {
  if (!isDragging) return;

  e.preventDefault();

  // Calculate new position
  let newX = e.clientX - dragOffset.x;
  let newY = e.clientY - dragOffset.y;

  // Constrain to viewport
  const rect = container.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width;
  const maxY = window.innerHeight - rect.height;

  newX = Math.max(0, Math.min(newX, maxX));
  newY = Math.max(0, Math.min(newY, maxY));

  container.style.left = `${newX}px`;
  container.style.top = `${newY}px`;
}

/**
 * Handle drag end
 */
function handleDragEnd(e) {
  if (!isDragging) return;

  isDragging = false;
  container.style.cursor = "";

  // Save position
  const rect = container.getBoundingClientRect();
  localStorage.setItem(
    "ssce_propertyCardPosition",
    JSON.stringify({
      x: rect.left,
      y: rect.top,
      detached: true,
    }),
  );
}

/**
 * Detach card from normal flow to fixed positioning
 */
function detachCard() {
  const rect = container.getBoundingClientRect();

  isDetached = true;
  container.style.position = "fixed";
  container.style.left = `${rect.left}px`;
  container.style.top = `${rect.top}px`;
  container.style.width = `${rect.width}px`;
  container.style.maxHeight = "none";
  container.style.zIndex = "100";
  container.style.borderRadius = "0.5rem";
  container.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.5)";
  container.classList.add("detached");
}

/**
 * Reset card to default attached position
 */
function resetPosition() {
  isDetached = false;
  container.style.position = "";
  container.style.left = "";
  container.style.top = "";
  container.style.width = "";
  container.style.zIndex = "";
  container.style.borderRadius = "";
  container.style.boxShadow = "";
  container.classList.remove("detached");

  localStorage.removeItem("ssce_propertyCardPosition");
}

/**
 * Setup keyboard handler for Escape key
 */
function setupKeyboardHandler() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isVisible) {
      hidePropertyCard();
    }
  });
}

/**
 * Refresh the current card (re-render with current values)
 * Useful when external state changes
 */
export function refreshPropertyCard() {
  if (currentTool && isVisible) {
    showPropertyCard(currentTool);
  }
}
