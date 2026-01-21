/**
 * Snapshot Carousel Component
 *
 * A Lit-based web component for viewing snapshots with navigation.
 * Displays snapshot image, title, summary, and date with prev/next controls.
 *
 * Usage:
 *   <ssce-snapshot-carousel .snapshots=${snapshotsArray}></ssce-snapshot-carousel>
 *
 * Props:
 *   - snapshots: Array of snapshot objects [{id, frontMatter: {title, summary, created}, image}]
 *   - animated: Boolean for fade transitions (default: true)
 */

import { LitElement, html, css } from "https://cdn.jsdelivr.net/npm/lit@3.1.0/+esm";

export class SnapshotCarousel extends LitElement {
  static properties = {
    snapshots: { type: Array },
    animated: { type: Boolean },
    currentIndex: { type: Number, state: true },
  };

  static styles = css`
    :host {
      display: block;
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
      color: #e5e7eb;
    }

    .carousel-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 100%;
    }

    .image-container {
      position: relative;
      background: #1f2937;
      border-radius: 0.5rem;
      overflow: hidden;
      min-height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .snapshot-image {
      max-width: 100%;
      max-height: 60vh;
      object-fit: contain;
      transition: opacity 0.3s ease-in-out;
    }

    .snapshot-image.fade-out {
      opacity: 0;
    }

    .snapshot-image.fade-in {
      opacity: 1;
    }

    .metadata {
      padding: 1rem;
      background: #374151;
      border-radius: 0.5rem;
    }

    .title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: #f3f4f6;
    }

    .summary {
      font-size: 0.875rem;
      color: #9ca3af;
      margin: 0 0 0.5rem 0;
      white-space: pre-wrap;
    }

    .date {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      border: none;
      background: #4b5563;
      color: #e5e7eb;
      cursor: pointer;
      transition: background 0.2s;
    }

    .nav-btn:hover:not(:disabled) {
      background: #6b7280;
    }

    .nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .nav-btn svg {
      width: 1.25rem;
      height: 1.25rem;
    }

    .counter {
      font-size: 0.875rem;
      color: #9ca3af;
      min-width: 4rem;
      text-align: center;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #6b7280;
      text-align: center;
    }

    .empty-state svg {
      width: 3rem;
      height: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }
  `;

  constructor() {
    super();
    this.snapshots = [];
    this.animated = true;
    this.currentIndex = 0;
    this._boundKeyHandler = this._handleKeydown.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("keydown", this._boundKeyHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this._boundKeyHandler);
  }

  _handleKeydown(e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      this._prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this._next();
    }
  }

  _prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  _next() {
    if (this.currentIndex < this.snapshots.length - 1) {
      this.currentIndex++;
    }
  }

  _formatDate(isoString) {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  }

  render() {
    if (!this.snapshots || this.snapshots.length === 0) {
      return html`
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p>No snapshots available</p>
          <p style="font-size: 0.75rem; margin-top: 0.5rem;">Use File → Snapshot to capture annotated states</p>
        </div>
      `;
    }

    const snapshot = this.snapshots[this.currentIndex];
    const fm = snapshot.frontMatter || {};

    return html`
      <div class="carousel-container">
        <div class="image-container">
          <img class="snapshot-image ${this.animated ? "fade-in" : ""}" src="${snapshot.image}" alt="${fm.title || `Snapshot ${snapshot.id}`}" />
        </div>

        <div class="metadata">
          <h3 class="title">${fm.title || `Snapshot ${snapshot.id}`}</h3>
          ${fm.summary ? html`<p class="summary">${fm.summary}</p>` : ""}
          <p class="date">${this._formatDate(fm.created)}</p>
        </div>

        <div class="controls">
          <button class="nav-btn" @click=${this._prev} ?disabled=${this.currentIndex === 0} title="Previous (←)">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span class="counter">${this.currentIndex + 1} / ${this.snapshots.length}</span>

          <button class="nav-btn" @click=${this._next} ?disabled=${this.currentIndex === this.snapshots.length - 1} title="Next (→)">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }
}

// Register the custom element
customElements.define("ssce-snapshot-carousel", SnapshotCarousel);
