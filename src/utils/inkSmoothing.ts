import { InkPoint, InkStroke, InkToolType } from '../types/note';

/**
 * Filter out duplicate or excessively close points that cause digitizer jitter.
 */
export function filterJitterPoints(points: InkPoint[], minDistance = 1.8): InkPoint[] {
  if (points.length <= 2) return points;
  const filtered: InkPoint[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = points[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const distSq = dx * dx + dy * dy;

    // Always keep last point to preserve stroke termination
    if (distSq >= minDistance * minDistance || i === points.length - 1) {
      filtered.push(curr);
    }
  }
  return filtered;
}

/**
 * Weighted moving average smoothing to eliminate micro-hand tremors
 * while strictly preserving stroke trajectory and pressure dynamics.
 */
export function smoothRawPoints(rawPoints: InkPoint[]): InkPoint[] {
  const points = filterJitterPoints(rawPoints);
  if (points.length <= 2) return points;

  const smoothed: InkPoint[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];

    const press0 = p0.pressure ?? 0.5;
    const press1 = p1.pressure ?? 0.5;
    const press2 = p2.pressure ?? 0.5;

    smoothed.push({
      x: 0.2 * p0.x + 0.6 * p1.x + 0.2 * p2.x,
      y: 0.2 * p0.y + 0.6 * p1.y + 0.2 * p2.y,
      pressure: 0.2 * press0 + 0.6 * press1 + 0.2 * press2,
    });
  }

  smoothed.push(points[points.length - 1]);
  return smoothed;
}

/**
 * Calculate dynamic calligraphic stroke width based on stylus pressure,
 * stroke direction angle (fountain pen nib physics), and entry/exit tapering.
 */
export function calculateDynamicWidth(
  curr: InkPoint,
  prev: InkPoint,
  baseWidth: number,
  tool: InkToolType,
  index: number,
  totalPoints: number
): number {
  if (tool === 'highlighter') {
    return baseWidth;
  }

  const rawPressure = curr.pressure !== undefined ? curr.pressure : 0.5;
  
  // Non-linear power mapping for expressive stylus response:
  // Light touch creates delicate hairlines, firm press produces rich ink flow.
  const pressureFactor = Math.pow(Math.max(0.05, Math.min(1.0, rawPressure)), 1.25) * 1.8 + 0.3;

  // Entry and exit soft taper (fountain pen lift and touch down)
  let taper = 1.0;
  if (index < 4) {
    taper = 0.25 + (index / 4) * 0.75;
  } else if (index > totalPoints - 4) {
    taper = 0.25 + ((totalPoints - index) / 4) * 0.75;
  }

  // Calligraphic angle variation for 'pen' mode:
  // Simulates a 45-degree angled stub/fountain nib.
  // Strokes along the nib angle are thin; strokes perpendicular are bold.
  let calligraphicFactor = 1.0;
  if (tool === 'pen') {
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.5) {
      const angle = Math.atan2(dy, dx);
      const nibAngle = Math.PI / 4; // 45 degrees
      // Sin squared variation between 0.6 and 1.4
      const diff = angle - nibAngle;
      calligraphicFactor = Math.pow(Math.sin(diff), 2) * 0.75 + 0.65;
    }
  }

  const calculated = baseWidth * pressureFactor * taper * calligraphicFactor;
  return Math.max(0.8, calculated);
}

/**
 * Render a complete smooth Bezier curve stroke onto a 2D canvas context.
 * Uses continuous variable-width ribbon polygons with rounded Bezier endcaps
 * to give handwriting an authentic, calligraphic, and expressive aesthetic.
 */
export function renderBezierStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke
): void {
  const rawPoints = stroke.points;
  if (!rawPoints || rawPoints.length === 0) return;

  const points = smoothRawPoints(rawPoints);
  const total = points.length;

  ctx.save();
  ctx.fillStyle = stroke.color;
  ctx.strokeStyle = stroke.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = stroke.opacity || 0.38;
    ctx.globalCompositeOperation = 'multiply';
  } else if (stroke.tool === 'pencil') {
    ctx.globalAlpha = 0.72;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.globalAlpha = stroke.opacity || 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }

  const baseWidth = stroke.width;

  // Single point dot
  if (total === 1) {
    const p = points[0];
    const w = calculateDynamicWidth(p, p, baseWidth, stroke.tool, 0, 1);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, w / 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Two points line
  if (total === 2) {
    const p0 = points[0];
    const p1 = points[1];
    const w = calculateDynamicWidth(p1, p0, baseWidth, stroke.tool, 1, 2);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Multi-point stroke: compute normal offsets for each point
  // to construct a smooth calligraphic ribbon polygon
  const leftPoints: { x: number; y: number }[] = [];
  const rightPoints: { x: number; y: number }[] = [];
  const widths: number[] = [];

  for (let i = 0; i < total; i++) {
    const curr = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(total - 1, i + 1)];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;

    // Normal vector perpendicular to trajectory
    const nx = -dy / len;
    const ny = dx / len;

    const w = calculateDynamicWidth(curr, prev, baseWidth, stroke.tool, i, total);
    widths.push(w);
    const halfW = w / 2;

    leftPoints.push({
      x: curr.x + nx * halfW,
      y: curr.y + ny * halfW,
    });
    rightPoints.push({
      x: curr.x - nx * halfW,
      y: curr.y - ny * halfW,
    });
  }

  // Draw continuous variable-width filled calligraphic ribbon
  ctx.beginPath();
  
  // Left edge: curve from first point to last point via midpoints
  ctx.moveTo(leftPoints[0].x, leftPoints[0].y);
  for (let i = 0; i < leftPoints.length - 1; i++) {
    const midX = (leftPoints[i].x + leftPoints[i + 1].x) / 2;
    const midY = (leftPoints[i].y + leftPoints[i + 1].y) / 2;
    ctx.quadraticCurveTo(leftPoints[i].x, leftPoints[i].y, midX, midY);
  }
  ctx.lineTo(leftPoints[leftPoints.length - 1].x, leftPoints[leftPoints.length - 1].y);

  // End cap: round arc at tip
  const lastPoint = points[total - 1];
  const lastRadius = Math.max(0.5, widths[widths.length - 1] / 2);
  ctx.arc(lastPoint.x, lastPoint.y, lastRadius, 0, Math.PI * 2, false);

  // Right edge: curve from last point back to first point
  ctx.moveTo(rightPoints[rightPoints.length - 1].x, rightPoints[rightPoints.length - 1].y);
  for (let i = rightPoints.length - 1; i > 0; i--) {
    const midX = (rightPoints[i].x + rightPoints[i - 1].x) / 2;
    const midY = (rightPoints[i].y + rightPoints[i - 1].y) / 2;
    ctx.quadraticCurveTo(rightPoints[i].x, rightPoints[i].y, midX, midY);
  }
  ctx.lineTo(rightPoints[0].x, rightPoints[0].y);

  // Start cap: round arc at beginning
  const firstPoint = points[0];
  const firstRadius = Math.max(0.5, widths[0] / 2);
  ctx.arc(firstPoint.x, firstPoint.y, firstRadius, 0, Math.PI * 2, false);

  ctx.fill();

  // Also stroke the spine lightly for smooth anti-aliased edge blending
  ctx.lineWidth = Math.min(1.5, baseWidth * 0.5);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < total - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  ctx.lineTo(points[total - 1].x, points[total - 1].y);
  ctx.stroke();

  ctx.restore();
}

/**
 * Live drawing renderer: draws smooth quadratic Bezier curve for active live strokes
 * with dynamic pressure-sensitive width and calligraphic shaping.
 */
export function renderLiveBezierSegment(
  ctx: CanvasRenderingContext2D,
  currentPoints: InkPoint[],
  tool: InkToolType,
  color: string,
  baseWidth: number,
  opacity: number = 1.0
): void {
  const len = currentPoints.length;
  if (len < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'highlighter') {
    ctx.globalAlpha = opacity || 0.38;
    ctx.globalCompositeOperation = 'multiply';
  } else if (tool === 'pencil') {
    ctx.globalAlpha = 0.72;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.globalAlpha = opacity || 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }

  const pCurr = currentPoints[len - 1];
  const pPrev = currentPoints[len - 2];
  
  // Real-time dynamic calligraphic width calculation
  const width = calculateDynamicWidth(pCurr, pPrev, baseWidth, tool, len, len + 1);
  ctx.lineWidth = width;

  if (len >= 3) {
    const pPrevPrev = currentPoints[len - 3];
    const mid1 = { x: (pPrevPrev.x + pPrev.x) / 2, y: (pPrevPrev.y + pPrev.y) / 2 };
    const mid2 = { x: (pPrev.x + pCurr.x) / 2, y: (pPrev.y + pCurr.y) / 2 };

    ctx.beginPath();
    ctx.moveTo(mid1.x, mid1.y);
    ctx.quadraticCurveTo(pPrev.x, pPrev.y, mid2.x, mid2.y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(pPrev.x, pPrev.y);
    ctx.lineTo(pCurr.x, pCurr.y);
    ctx.stroke();
  }

  ctx.restore();
}
