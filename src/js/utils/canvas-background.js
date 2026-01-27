/**
 * Canvas Container Background Toggle
 *
 * Allows user to switch between light and dark backgrounds for better contrast
 * when editing images. Dark screenshots (e.g., terminal, dark mode apps) can be
 * hard to see against the default dark UI.
 *
 * Usage:
 * - Right-click on the background area (not the canvas) to toggle
 * - Auto-detection: Shows a toast tip when a dark image is loaded
 *
 * The contrast detection samples pixels along the canvas edges and calculates
 * average luminance. If the image edges are dark and the background is dark,
 * a helpful tip is shown (once per session).
 *
 * @module canvas-background
 */

import { showToast } from "./toast.js";

let isLightBackground = false;
let hasShownContrastTip = false;

// Luminance threshold (0-255) - below this is considered "dark"
// 60 works well for detecting dark screenshots while ignoring photos
const DARK_THRESHOLD = 60;

/**
 * Initialize the canvas background toggle
 * Adds right-click context menu to toggle between light and dark
 */
export function initCanvasBackgroundToggle() {
  const container = document.getElementById("canvas-container");
  if (!container) return;

  // Prevent default context menu and show toggle option
  container.addEventListener("contextmenu", (e) => {
    // Only handle right-click on the container background, not on canvas
    if (e.target.id === "canvas-container") {
      e.preventDefault();
      toggleBackground();
    }
  });
}

/**
 * Toggle between light and dark background
 */
export function toggleBackground() {
  const container = document.getElementById("canvas-container");
  if (!container) return;

  isLightBackground = !isLightBackground;

  if (isLightBackground) {
    container.classList.remove("bg-dark");
    container.classList.add("bg-light");
  } else {
    container.classList.remove("bg-light");
    container.classList.add("bg-dark");
  }
}

/**
 * Set background to light
 */
export function setLightBackground() {
  const container = document.getElementById("canvas-container");
  if (!container) return;

  isLightBackground = true;
  container.classList.remove("bg-dark");
  container.classList.add("bg-light");
}

/**
 * Set background to dark
 */
export function setDarkBackground() {
  const container = document.getElementById("canvas-container");
  if (!container) return;

  isLightBackground = false;
  container.classList.remove("bg-light");
  container.classList.add("bg-dark");
}

/**
 * Get current background state
 * @returns {boolean} True if light background is active
 */
export function isLight() {
  return isLightBackground;
}

/**
 * Check canvas edge contrast and show tip if dark image on dark background
 * Call this after loading an image
 * @param {HTMLCanvasElement} canvas - The canvas to check
 */
export function checkContrastAndNotify(canvas) {
  // Only check if we haven't shown the tip and background is dark
  if (hasShownContrastTip || isLightBackground) return;

  const avgLuminance = getEdgeLuminance(canvas);

  // If image edges are dark and background is dark, show tip after a delay
  // (so it appears after the "loaded successfully" toast)
  if (avgLuminance < DARK_THRESHOLD) {
    hasShownContrastTip = true;
    setTimeout(() => {
      showToast("Dark image detected. Right-click background to switch to light mode.", 10000);
    }, 2000);
  }
}

/**
 * Calculate average luminance of canvas edge pixels
 * @param {HTMLCanvasElement} canvas
 * @returns {number} Average luminance 0-255
 */
function getEdgeLuminance(canvas) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  if (width === 0 || height === 0) return 255;

  // Sample pixels along all four edges
  const samples = [];
  const sampleCount = 20; // Samples per edge

  // Top edge
  for (let i = 0; i < sampleCount; i++) {
    const x = Math.floor((i / sampleCount) * width);
    samples.push(getPixelLuminance(ctx, x, 0));
  }

  // Bottom edge
  for (let i = 0; i < sampleCount; i++) {
    const x = Math.floor((i / sampleCount) * width);
    samples.push(getPixelLuminance(ctx, x, height - 1));
  }

  // Left edge
  for (let i = 0; i < sampleCount; i++) {
    const y = Math.floor((i / sampleCount) * height);
    samples.push(getPixelLuminance(ctx, 0, y));
  }

  // Right edge
  for (let i = 0; i < sampleCount; i++) {
    const y = Math.floor((i / sampleCount) * height);
    samples.push(getPixelLuminance(ctx, width - 1, y));
  }

  // Calculate average
  const sum = samples.reduce((a, b) => a + b, 0);
  return sum / samples.length;
}

/**
 * Get luminance of a single pixel
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @returns {number} Luminance 0-255
 */
function getPixelLuminance(ctx, x, y) {
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  // Standard luminance formula (ITU-R BT.709)
  return 0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2];
}
