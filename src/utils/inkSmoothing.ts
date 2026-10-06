import { InkPoint, InkStroke, InkToolType } from '../types/note';

/**
 * Post-processing step for canvas strokes that identifies and removes
 * duplicate path segments, event-loop latency micro-backtracks, and
 * zero-length coalesced points to guarantee fluid stroke continuity.
 */
export function postProcessStrokePoints(
  rawPoints: InkPoint[],
  minDistance = 1.5,
  collinearTolerance = 0.5
): InkPoint[] {
  if (!rawPoints || rawPoints.length <= 2) return rawPoints || [];

  // Step 1: Remove consecutive duplicate or near-duplicate micro-points (< minDistance)
  const deduplicated: InkPoint[] = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = deduplicated[deduplicated.length - 1];
    const curr = rawPoints[i];
    const distSq = (curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2;

    // Keep point if distance exceeds threshold or if it's the final stroke termination
    if (distSq >= minDistance * minDistance || i === rawPoints.length - 1) {
      deduplicated.push(curr);
    }
  }

  if (deduplicated.length <= 2) return deduplicated;

  // Step 2: Filter out event-loop latency micro-backtracks (A -> B -> A oscillations)
  const deOscillated: InkPoint[] = [deduplicated[0]];
  for (let i = 1; i < deduplicated.length - 1; i++) {
    const pPrev = deOscillated[deOscillated.length - 1];
    const pCurr = deduplicated[i];
    const pNext = deduplicated[i + 1];

    const distNextPrevSq = (pNext.x - pPrev.x) ** 2 + (pNext.y - pPrev.y) ** 2;
    const distCurrPrevSq = (pCurr.x - pPrev.x) ** 2 + (pCurr.y - pPrev.y) ** 2;

    // If pNext returned within 2.5px of pPrev, but pCurr jumped > 3.0px away, pCurr is a latency glitch spike
    const isBacktrackSpike = distNextPrevSq < 6.25 && distCurrPrevSq > 9.0;

    if (!isBacktrackSpike) {
      deOscillated.push(pCurr);
    }
  }
  deOscillated.push(deduplicated[deduplicated.length - 1]);

  if (deOscillated.length <= 2) return deOscillated;

  // Step 3: Collinear point pruning (Ramer-Douglas-Peucker & angle tolerance)
  const pruned: InkPoint[] = [deOscillated[0]];
  for (let i = 1; i < deOscillated.length - 1; i++) {
    const p0 = pruned[pruned.length - 1];
    const p1 = deOscillated[i];
    const p2 = deOscillated[i + 1];

    const dx = p2.x - p0.x;
    const dy = p2.y - p0.y;
    const lineLenSq = dx * dx + dy * dy;

    if (lineLenSq < 0.001) {
      continue;
    }

    const num = Math.abs(dy * p1.x - dx * p1.y + p2.x * p0.y - p2.y * p0.x);
    const perpDist = num / Math.sqrt(lineLenSq);

    if (perpDist >= collinearTolerance) {
      pruned.push(p1);
    }
  }
  pruned.push(deOscillated[deOscillated.length - 1]);

  return pruned;
}

/**
 * Filter out duplicate or excessively close points that cause digitizer jitter.
 */
export function filterJitterPoints(points: InkPoint[], minDistance = 1.8): InkPoint[] {
  return postProcessStrokePoints(points, minDistance);
}

/**
 * 5-point Gaussian pressure & coordinate smoothing algorithm.
 * Eliminates micro-hand tremors and digitizer quantization noise while
 * producing buttery smooth pressure transitions and calligraphic stroke continuity.
 */
export function smoothRawPoints(rawPoints: InkPoint[]): InkPoint[] {
  const points = postProcessStrokePoints(rawPoints);
  if (points.length <= 2) return points;

  const total = points.length;
  const smoothed: InkPoint[] = [points[0]];

  for (let i = 1; i < total - 1; i++) {
    const pPrev2 = points[Math.max(0, i - 2)];
    const pPrev1 = points[i - 1];
    const pCurr  = points[i];
    const pNext1 = points[Math.min(total - 1, i + 1)];
    const pNext2 = points[Math.min(total - 1, i + 2)];

    const pressPrev2 = pPrev2.pressure ?? 0.5;
    const pressPrev1 = pPrev1.pressure ?? 0.5;
    const pressCurr  = pCurr.pressure  ?? 0.5;
    const pressNext1 = pNext1.pressure ?? 0.5;
    const pressNext2 = pNext2.pressure ?? 0.5;

    // 5-point Gaussian kernel weights: [0.06, 0.24, 0.40, 0.24, 0.06]
    smoothed.push({
      x: 0.06 * pPrev2.x + 0.24 * pPrev1.x + 0.40 * pCurr.x + 0.24 * pNext1.x + 0.06 * pNext2.x,
      y: 0.06 * pPrev2.y + 0.24 * pPrev1.y + 0.40 * pCurr.y + 0.24 * pNext1.y + 0.06 * pNext2.y,
      pressure: 0.06 * pressPrev2 + 0.24 * pressPrev1 + 0.40 * pressCurr + 0.24 * pressNext1 + 0.06 * pressNext2,
    });
  }

  smoothed.push(points[total - 1]);
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

  // Calculate segment velocity / movement distance
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  const velocityDist = Math.hypot(dx, dy);

  // Touch & stylus hardware pressure mapping
  const rawPressure = curr.pressure !== undefined ? curr.pressure : 0.5;
  const pressureFactor = Math.pow(Math.max(0.05, Math.min(1.0, rawPressure)), 1.25) * 1.5 + 0.3;

  // Velocity-derived width scaling:
  // Swift strokes produce elegant hairline flicks; slow deliberate strokes deposit rich ink
  let velocityFactor = 1.0;
  if (velocityDist > 0) {
    const normSpeed = Math.min(1.0, velocityDist / 22);
    velocityFactor = 1.38 - normSpeed * 0.82; // Range: 1.38x (slow) down to 0.56x (fast)
  }

  // Soft entry and exit stroke tapering (natural pen touch-down and lift)
  let taper = 1.0;
  if (index < 4) {
    taper = 0.3 + (index / 4) * 0.7;
  } else if (index > totalPoints - 4) {
    taper = 0.3 + ((totalPoints - index) / 4) * 0.7;
  }

  // Calligraphic angle variation for 'pen' & 'fountain' modes (45-degree nib stub)
  let calligraphicFactor = 1.0;
  if (tool === 'pen' && velocityDist > 0.5) {
    const angle = Math.atan2(dy, dx);
    const nibAngle = Math.PI / 4; // 45 degrees
    const diff = angle - nibAngle;
    calligraphicFactor = Math.pow(Math.sin(diff), 2) * 0.65 + 0.7;
  }

  const calculated = baseWidth * pressureFactor * velocityFactor * taper * calligraphicFactor;
  return Math.max(0.7, Math.min(baseWidth * 3.2, calculated));
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

  // Multi-point stroke rendering using smooth quadratic Bezier curves
  if (stroke.tool === 'highlighter' || stroke.tool === 'pencil') {
    // Uniform stroke width pass with round line caps for smooth highlighters & pencils
    ctx.lineWidth = baseWidth;
    let prevMidX = (points[0].x + points[1].x) / 2;
    let prevMidY = (points[0].y + points[1].y) / 2;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(prevMidX, prevMidY);

    for (let i = 1; i < total - 1; i++) {
      const pCurr = points[i];
      const pNext = points[i + 1];
      const nextMidX = (pCurr.x + pNext.x) / 2;
      const nextMidY = (pCurr.y + pNext.y) / 2;

      ctx.quadraticCurveTo(pCurr.x, pCurr.y, nextMidX, nextMidY);

      prevMidX = nextMidX;
      prevMidY = nextMidY;
    }

    ctx.lineTo(points[total - 1].x, points[total - 1].y);
    ctx.stroke();
  } else {
    // Dynamic calligraphic & pressure-sensitive stroke
    let prevMidX = (points[0].x + points[1].x) / 2;
    let prevMidY = (points[0].y + points[1].y) / 2;

    const w0 = calculateDynamicWidth(points[0], points[0], baseWidth, stroke.tool, 0, total);
    ctx.lineWidth = w0;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(prevMidX, prevMidY);
    ctx.stroke();

    for (let i = 1; i < total - 1; i++) {
      const pCurr = points[i];
      const pNext = points[i + 1];
      const nextMidX = (pCurr.x + pNext.x) / 2;
      const nextMidY = (pCurr.y + pNext.y) / 2;

      const w = calculateDynamicWidth(pCurr, points[i - 1], baseWidth, stroke.tool, i, total);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(prevMidX, prevMidY);
      ctx.quadraticCurveTo(pCurr.x, pCurr.y, nextMidX, nextMidY);
      ctx.stroke();

      prevMidX = nextMidX;
      prevMidY = nextMidY;
    }

    const wLast = calculateDynamicWidth(points[total - 1], points[total - 2], baseWidth, stroke.tool, total - 1, total);
    ctx.lineWidth = wLast;
    ctx.beginPath();
    ctx.moveTo(prevMidX, prevMidY);
    ctx.lineTo(points[total - 1].x, points[total - 1].y);
    ctx.stroke();
  }

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

/**
 * Erase stroke segments that intersect the eraser point within eraserRadius,
 * splitting strokes into sub-strokes at the erased coordinates (like a real pencil eraser).
 */
export function eraseStrokesAtPoint(
  strokes: InkStroke[],
  eraserPoint: InkPoint,
  eraserRadius = 14
): InkStroke[] {
  if (!strokes || strokes.length === 0) return [];
  const newStrokes: InkStroke[] = [];
  let modified = false;

  for (const stroke of strokes) {
    const pts = stroke.points;
    if (!pts || pts.length === 0) continue;

    const threshold = eraserRadius + (stroke.width || 2.5) / 2;
    const thresholdSq = threshold * threshold;

    // Determine which points/segments fall within eraser radius
    const isErased: boolean[] = new Array(pts.length).fill(false);

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const dx = p.x - eraserPoint.x;
      const dy = p.y - eraserPoint.y;
      if (dx * dx + dy * dy <= thresholdSq) {
        isErased[i] = true;
      }
    }

    // Also check line segments between consecutive points
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const distSq = distanceToSegmentSq(eraserPoint.x, eraserPoint.y, p1.x, p1.y, p2.x, p2.y);
      if (distSq <= thresholdSq) {
        isErased[i] = true;
        isErased[i + 1] = true;
      }
    }

    const hasErasedPoints = isErased.some(e => e);
    if (!hasErasedPoints) {
      newStrokes.push(stroke);
      continue;
    }

    modified = true;

    // Split stroke into continuous sub-stroke segments
    let currentSegment: InkPoint[] = [];
    let segIndex = 0;

    for (let i = 0; i < pts.length; i++) {
      if (!isErased[i]) {
        currentSegment.push(pts[i]);
      } else {
        if (currentSegment.length > 0) {
          newStrokes.push({
            ...stroke,
            id: `${stroke.id}-seg-${Date.now()}-${segIndex++}`,
            points: currentSegment,
          });
          currentSegment = [];
        }
      }
    }

    if (currentSegment.length > 0) {
      newStrokes.push({
        ...stroke,
        id: `${stroke.id}-seg-${Date.now()}-${segIndex++}`,
        points: currentSegment,
      });
    }
  }

  return modified ? newStrokes : strokes;
}

function distanceToSegmentSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
  if (l2 === 0) return (px - ax) ** 2 + (py - ay) ** 2;
  let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * (bx - ax);
  const projY = ay + t * (by - ay);
  return (px - projX) ** 2 + (py - projY) ** 2;
}
