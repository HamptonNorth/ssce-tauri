/**
 * Smart Guides - Alignment detection and snap guides for dragging objects
 *
 * Pure logic + rendering. No state management — caller passes everything needed.
 */

import { getTextSize, getTextLineHeight } from "./config.js";

/**
 * Get bounding box for a layer in canvas coordinates
 * @param {Object} layer - Layer object
 * @param {CanvasRenderingContext2D} ctx - Canvas context (needed for font metrics)
 * @returns {{ left: number, top: number, right: number, bottom: number, centerX: number, centerY: number }}
 */
export function getLayerBounds(layer, ctx) {
  let left, top, right, bottom;

  if (layer.type === "arrow" || layer.type === "line") {
    left = Math.min(layer.data.startX, layer.data.endX);
    top = Math.min(layer.data.startY, layer.data.endY);
    right = Math.max(layer.data.startX, layer.data.endX);
    bottom = Math.max(layer.data.startY, layer.data.endY);
  } else if (layer.type === "text") {
    const sizeConfig = getTextSize(layer.data.size);
    ctx.font = `${sizeConfig.fontWeight} ${sizeConfig.fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = "alphabetic";

    const lines = layer.data.text.split("\n");
    const lineHeightMult = getTextLineHeight();
    const firstMetrics = ctx.measureText(lines[0] || "X");
    const glyphTop = firstMetrics.fontBoundingBoxAscent - firstMetrics.actualBoundingBoxAscent;

    let maxWidth = firstMetrics.width;
    for (let i = 1; i < lines.length; i++) {
      const w = ctx.measureText(lines[i]).width;
      if (w > maxWidth) maxWidth = w;
    }

    const lastMetrics = lines.length > 1 ? ctx.measureText(lines[lines.length - 1]) : firstMetrics;
    const height = firstMetrics.actualBoundingBoxAscent + (lines.length - 1) * sizeConfig.fontSize * lineHeightMult + lastMetrics.actualBoundingBoxDescent;

    left = layer.data.x;
    top = layer.data.y + glyphTop;
    right = left + maxWidth;
    bottom = top + height;
  } else if (layer.type === "step") {
    const sizeConfig = getTextSize(layer.data.size);
    ctx.font = `${sizeConfig.fontWeight} ${sizeConfig.fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText(layer.data.symbol);
    const glyphTop = metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent;

    left = layer.data.x;
    top = layer.data.y + glyphTop;
    right = left + metrics.width;
    bottom = top + metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  } else if (layer.type === "symbol") {
    const sizeConfig = getTextSize(layer.data.size);
    const baseSize = 20;
    const scale = sizeConfig.fontSize / baseSize;
    ctx.font = `${sizeConfig.fontWeight} ${baseSize}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText(layer.data.symbol);
    const glyphTop = (metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent) * scale;
    const width = metrics.width * scale;
    const height = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) * scale;

    left = layer.data.x;
    top = layer.data.y + glyphTop;
    right = left + width;
    bottom = top + height;
  } else if (layer.type === "shape" || layer.type === "highlight") {
    left = layer.data.x;
    top = layer.data.y;
    right = left + layer.data.width;
    bottom = top + layer.data.height;
  } else if (layer.type === "image") {
    left = layer.data.x || 0;
    top = layer.data.y || 0;
    right = left + (layer.data.width || layer.data.image?.width || 0);
    bottom = top + (layer.data.height || layer.data.image?.height || 0);
  } else {
    return null;
  }

  return {
    left,
    top,
    right,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

/**
 * Combine multiple bounding boxes into one
 * @param {Array} boundsList - Array of bounds objects
 * @returns {{ left, top, right, bottom, centerX, centerY }}
 */
export function getCombinedBounds(boundsList) {
  if (boundsList.length === 0) return null;

  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const b of boundsList) {
    if (b.left < left) left = b.left;
    if (b.top < top) top = b.top;
    if (b.right > right) right = b.right;
    if (b.bottom > bottom) bottom = b.bottom;
  }

  return {
    left,
    top,
    right,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

/**
 * Build alignment candidate lines from all non-selected layers + canvas centre
 * @param {Array} layers - All layers
 * @param {number[]} excludeIndices - Indices to exclude (selected layers)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {{ horizontals: Array<{value: number, type: string}>, verticals: Array<{value: number, type: string}> }}
 */
export function getAlignmentCandidates(layers, excludeIndices, ctx, canvasWidth, canvasHeight) {
  const horizontals = []; // y-axis values (top, bottom, centerY)
  const verticals = [];   // x-axis values (left, right, centerX)

  const excludeSet = new Set(excludeIndices);

  for (let i = 0; i < layers.length; i++) {
    if (excludeSet.has(i)) continue;
    // Skip base image layer (index 0)
    if (i === 0) continue;

    const bounds = getLayerBounds(layers[i], ctx);
    if (!bounds) continue;

    verticals.push({ value: bounds.left, type: "edge" });
    verticals.push({ value: bounds.right, type: "edge" });
    verticals.push({ value: bounds.centerX, type: "center" });
    horizontals.push({ value: bounds.top, type: "edge" });
    horizontals.push({ value: bounds.bottom, type: "edge" });
    horizontals.push({ value: bounds.centerY, type: "center" });
  }

  // Canvas centre
  verticals.push({ value: canvasWidth / 2, type: "canvas-center" });
  horizontals.push({ value: canvasHeight / 2, type: "canvas-center" });

  return { horizontals, verticals };
}

/**
 * Detect alignments and compute snap deltas
 * @param {{ left, top, right, bottom, centerX, centerY }} draggingBounds - Current bounds of dragged selection
 * @param {{ horizontals: Array, verticals: Array }} candidates - Alignment candidates
 * @param {number} threshold - Snap threshold in canvas pixels
 * @returns {{ snapDx: number, snapDy: number, guides: Array<{axis: string, position: number, type: string}> }}
 */
export function detectAlignments(draggingBounds, candidates, threshold) {
  let snapDx = 0;
  let snapDy = 0;
  const guides = [];

  // Check vertical alignments (x-axis): left, right, centerX of dragging bounds
  const dragXEdges = [
    { value: draggingBounds.left, label: "left" },
    { value: draggingBounds.right, label: "right" },
    { value: draggingBounds.centerX, label: "centerX" },
  ];

  let bestVDist = Infinity;
  for (const edge of dragXEdges) {
    for (const cand of candidates.verticals) {
      const dist = Math.abs(edge.value - cand.value);
      if (dist <= threshold && dist < bestVDist) {
        bestVDist = dist;
        snapDx = cand.value - edge.value;
      }
    }
  }

  // Collect all guides at the snapped position
  if (bestVDist <= threshold) {
    for (const edge of dragXEdges) {
      for (const cand of candidates.verticals) {
        if (Math.abs((edge.value + snapDx) - cand.value) < 0.5) {
          // Avoid duplicate guide positions
          if (!guides.some((g) => g.axis === "vertical" && Math.abs(g.position - cand.value) < 0.5)) {
            guides.push({ axis: "vertical", position: cand.value, type: cand.type });
          }
        }
      }
    }
  }

  // Check horizontal alignments (y-axis): top, bottom, centerY
  const dragYEdges = [
    { value: draggingBounds.top, label: "top" },
    { value: draggingBounds.bottom, label: "bottom" },
    { value: draggingBounds.centerY, label: "centerY" },
  ];

  let bestHDist = Infinity;
  for (const edge of dragYEdges) {
    for (const cand of candidates.horizontals) {
      const dist = Math.abs(edge.value - cand.value);
      if (dist <= threshold && dist < bestHDist) {
        bestHDist = dist;
        snapDy = cand.value - edge.value;
      }
    }
  }

  if (bestHDist <= threshold) {
    for (const edge of dragYEdges) {
      for (const cand of candidates.horizontals) {
        if (Math.abs((edge.value + snapDy) - cand.value) < 0.5) {
          if (!guides.some((g) => g.axis === "horizontal" && Math.abs(g.position - cand.value) < 0.5)) {
            guides.push({ axis: "horizontal", position: cand.value, type: cand.type });
          }
        }
      }
    }
  }

  return { snapDx, snapDy, guides };
}

/**
 * Render guide lines on the canvas
 * Draws in screen space after the canvas transform so lines stay 1px crisp at any zoom
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array<{axis: string, position: number, type: string}>} guides - Guide definitions in canvas coords
 * @param {number} canvasWidth - Canvas width (canvas coords)
 * @param {number} canvasHeight - Canvas height (canvas coords)
 */
export function renderGuides(ctx, guides, canvasWidth, canvasHeight) {
  if (!guides || guides.length === 0) return;

  ctx.save();
  ctx.strokeStyle = "#FF00FF";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  for (const guide of guides) {
    ctx.beginPath();
    if (guide.axis === "vertical") {
      ctx.moveTo(guide.position, 0);
      ctx.lineTo(guide.position, canvasHeight);
    } else {
      ctx.moveTo(0, guide.position);
      ctx.lineTo(canvasWidth, guide.position);
    }
    ctx.stroke();
  }

  ctx.restore();
}
