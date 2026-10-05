// Flag-drawing similarity scoring — pure, client-side.
//
// The browser downscales both the player's drawing and the real flag to the
// SAME small grid (GRID×GRID), then passes the two RGBA pixel arrays here.
// Downscaling is the whole trick: big colour regions dominate, fine detail
// (stars, crests, text) washes out — matching Vexle's "big regions matter,
// tiny detail doesn't". No image libs, no ML.

// ponytail: 24×24 grid. Coarse enough that detail is ignored, fine enough to
// tell a tricolour's stripe order apart. Bump if scoring feels too forgiving.
export const GRID = 24;

const MAX_DIST = Math.sqrt(3 * 255 * 255); // white↔black, the worst case

/**
 * Score a drawing against the target flag. Both arrays are RGBA, length
 * GRID*GRID*4, same length. Returns an integer 0–100 (mean per-pixel colour
 * similarity). Unpainted canvas pixels (alpha 0) are treated as white, since
 * the drawing canvas starts white.
 */
export function scoreDrawing(drawn: Uint8ClampedArray, target: Uint8ClampedArray): number {
  if (drawn.length === 0 || drawn.length !== target.length || drawn.length % 4 !== 0) {
    throw new Error("flag-scoring: arrays must be non-empty, equal length, RGBA (len % 4 === 0)");
  }
  const pixels = drawn.length / 4;
  let sum = 0;
  for (let i = 0; i < drawn.length; i += 4) {
    const [dr, dg, db] = flatten(drawn[i], drawn[i + 1], drawn[i + 2], drawn[i + 3]);
    const [tr, tg, tb] = flatten(target[i], target[i + 1], target[i + 2], target[i + 3]);
    const dist = Math.sqrt((dr - tr) ** 2 + (dg - tg) ** 2 + (db - tb) ** 2);
    sum += 1 - dist / MAX_DIST;
  }
  return Math.round((sum / pixels) * 100);
}

// Never trust the client's reported score — clamp to a 0–100 integer before
// it's persisted. (The score is computed in the browser, so it's user input.)
export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Composite a pixel over white, so transparent (unpainted) reads as white and
// semi-transparent strokes blend the way the eye sees them on the canvas.
function flatten(r: number, g: number, b: number, a: number): [number, number, number] {
  const alpha = a / 255;
  return [r * alpha + 255 * (1 - alpha), g * alpha + 255 * (1 - alpha), b * alpha + 255 * (1 - alpha)];
}
