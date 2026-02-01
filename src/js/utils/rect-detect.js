/**
 * Transparent Rectangle Detection
 *
 * Finds the largest contiguous transparent rectangle containing a given point.
 * Used by the Fill tool to detect fillable areas.
 */

/**
 * Alpha threshold below which a pixel is considered transparent
 */
const ALPHA_THRESHOLD = 10;

/**
 * Find the largest contiguous transparent rectangle containing the click point.
 *
 * Algorithm: Start at click point, expand outward in each direction while
 * all pixels in the expanded row/column are transparent.
 *
 * @param {ImageData} imageData - Canvas image data
 * @param {number} clickX - Click X coordinate (integer)
 * @param {number} clickY - Click Y coordinate (integer)
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 *   Rectangle bounds, or null if click point is not transparent
 */
export function findTransparentRect(imageData, clickX, clickY) {
  const { width, height, data } = imageData;

  clickX = Math.floor(clickX);
  clickY = Math.floor(clickY);

  // Bounds check
  if (clickX < 0 || clickX >= width || clickY < 0 || clickY >= height) {
    return null;
  }

  // Check if click point itself is transparent
  if (!isPixelTransparent(data, width, clickX, clickY)) {
    return null;
  }

  // Start with the click point as a 1x1 rect
  let left = clickX;
  let right = clickX;
  let top = clickY;
  let bottom = clickY;

  // Expand left
  while (left > 0 && isColumnTransparent(data, width, height, left - 1, top, bottom)) {
    left--;
  }

  // Expand right
  while (right < width - 1 && isColumnTransparent(data, width, height, right + 1, top, bottom)) {
    right++;
  }

  // Expand up
  while (top > 0 && isRowTransparent(data, width, left, right, top - 1)) {
    top--;
  }

  // Expand down
  while (bottom < height - 1 && isRowTransparent(data, width, left, right, bottom + 1)) {
    bottom++;
  }

  // Second pass: try expanding left/right again with the new top/bottom
  while (left > 0 && isColumnTransparent(data, width, height, left - 1, top, bottom)) {
    left--;
  }
  while (right < width - 1 && isColumnTransparent(data, width, height, right + 1, top, bottom)) {
    right++;
  }

  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

/**
 * Check if a single pixel is transparent
 */
function isPixelTransparent(data, width, x, y) {
  const idx = (y * width + x) * 4;
  return data[idx + 3] < ALPHA_THRESHOLD;
}

/**
 * Check if all pixels in a column segment are transparent
 */
function isColumnTransparent(data, width, height, x, yStart, yEnd) {
  for (let y = yStart; y <= yEnd; y++) {
    if (!isPixelTransparent(data, width, x, y)) return false;
  }
  return true;
}

/**
 * Check if all pixels in a row segment are transparent
 */
function isRowTransparent(data, width, xStart, xEnd, y) {
  for (let x = xStart; x <= xEnd; x++) {
    if (!isPixelTransparent(data, width, x, y)) return false;
  }
  return true;
}

export { ALPHA_THRESHOLD };
