// Phase 8c — a rectangle with a fixed triangular tail notched into the bottom edge. `size` is the
// *full* bounding box (tail included, per the `SpeechBubbleShape` interface comment), so the tail
// is carved out of a `bodyHeight` that's always somewhat less than the full height, never added on
// top of it — that's what keeps `getBoundsRectangle`'s generic `{ point, size, rotation }` handling
// accurate with no shape-specific override.
//
// The tail's own size is proportional to the shape (capped in absolute pixels so it doesn't
// balloon on a huge slide background), and its position is fixed near the bottom-left — there is
// no drag handle to reposition it (see the Phase 8c report's scoping decision, the same "no
// per-instance geometry UI" cut `PolygonShape.sides`/`StarShape.points` make).
export function getSpeechBubblePoints(size: number[]): number[][] {
  const [w, h] = size
  const tailHeight = Math.min(h * 0.25, 40)
  // Never let the tail consume more than half the box — guards against a very short, wide bubble
  // producing an inverted (self-intersecting) outline.
  const bodyHeight = Math.max(h * 0.5, h - tailHeight)
  const tailWidth = Math.min(w * 0.2, 40)
  const tailStart = w * 0.15

  return [
    [0, 0],
    [w, 0],
    [w, bodyHeight],
    [tailStart + tailWidth, bodyHeight],
    [tailStart, h],
    [tailStart, bodyHeight],
    [0, bodyHeight],
  ]
}
