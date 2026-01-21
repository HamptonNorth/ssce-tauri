/**
 * Base Property Card
 *
 * Abstract base class for tool property cards.
 * Provides common functionality:
 * - Header with tool name and close button
 * - Drag handle
 * - Show/hide animations
 * - Event cleanup
 *
 * Subclasses should override:
 * - renderContent() - Return HTML string or element for card body
 * - setupEventListeners() - Wire up control events
 * - cleanupEventListeners() - Remove control events
 */

export class BasePropertyCard {
  /**
   * @param {string} toolName - Internal tool name (arrow, line, etc.)
   * @param {string} displayName - Human-readable name for header
   */
  constructor(toolName, displayName) {
    this.toolName = toolName;
    this.displayName = displayName;
    this.element = null;
    this.contentElement = null;
    this.components = []; // Track child components for cleanup
  }

  /**
   * Render the complete card
   * @returns {HTMLElement}
   */
  render() {
    this.element = document.createElement("div");
    this.element.className = "property-card";
    this.element.dataset.tool = this.toolName;

    this.element.innerHTML = `
      <div class="property-card-header flex justify-between items-center mb-2 cursor-move select-none" data-drag-handle>
        <span class="font-medium text-sm text-gray-200">${this.displayName}</span>
        <button type="button" class="property-card-close text-gray-400 hover:text-white leading-none px-1" style="font-size: 1.5rem;" title="Close (Escape)">
          &times;
        </button>
      </div>
      <div class="property-card-body flex flex-nowrap gap-4 pr-4" style="min-width: max-content;">
        <!-- Content rendered by subclass -->
      </div>
    `;

    this.contentElement = this.element.querySelector(".property-card-body");

    // Render subclass content
    const content = this.renderContent();
    if (typeof content === "string") {
      this.contentElement.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.contentElement.appendChild(content);
    }

    // Setup close button
    const closeBtn = this.element.querySelector(".property-card-close");
    this._handleClose = () => this.onCloseRequest();
    closeBtn.addEventListener("click", this._handleClose);

    // Setup subclass events
    this.setupEventListeners();

    return this.element;
  }

  /**
   * Override in subclass - render the card body content
   * @returns {string|HTMLElement}
   */
  renderContent() {
    return '<p class="text-gray-400">No properties</p>';
  }

  /**
   * Override in subclass - setup event listeners for controls
   */
  setupEventListeners() {
    // Override in subclass
  }

  /**
   * Override in subclass - cleanup event listeners
   */
  cleanupEventListeners() {
    // Override in subclass
  }

  /**
   * Called when close button clicked - override or set callback
   */
  onCloseRequest() {
    // Will be set by card manager
  }

  /**
   * Register a component for cleanup
   * @param {Object} component - Component with destroy() method
   */
  registerComponent(component) {
    this.components.push(component);
  }

  /**
   * Create a section wrapper for grouping controls
   * @param {string} title - Section title
   * @param {HTMLElement|string} content - Section content
   * @returns {HTMLElement}
   */
  createSection(title, content) {
    const section = document.createElement("div");
    section.className = "property-card-section flex flex-col gap-2";

    const titleEl = document.createElement("div");
    titleEl.className = "text-xs text-gray-400 font-medium";
    titleEl.textContent = title;
    section.appendChild(titleEl);

    if (typeof content === "string") {
      const contentEl = document.createElement("div");
      contentEl.innerHTML = content;
      section.appendChild(contentEl);
    } else if (content instanceof HTMLElement) {
      section.appendChild(content);
    }

    return section;
  }

  /**
   * Cleanup and destroy the card
   */
  destroy() {
    // Cleanup close button
    const closeBtn = this.element?.querySelector(".property-card-close");
    if (closeBtn && this._handleClose) {
      closeBtn.removeEventListener("click", this._handleClose);
    }

    // Cleanup subclass events
    this.cleanupEventListeners();

    // Destroy registered components
    this.components.forEach((component) => {
      if (component.destroy) component.destroy();
    });
    this.components = [];

    // Remove element
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.contentElement = null;
  }
}
