// Phase 8c — a regular N-sided polygon, inscribed in the shape's bounding box (an ellipse with
// radii `[w/2, h/2]`, so a non-square box gives a stretched, not distorted-then-clamped, polygon —
// the same "just use the box as an ellipse to sample around" approach `EllipseUtil` itself already
// takes, generalized from 2 points sampled at every angle to `sides` points sampled at even
// angular steps). The first vertex points straight up (`-90°`), matching `getTrianglePoints`'
// apex-at-top convention, so a 3-sided `PolygonShape` looks identical to a `TriangleShape` of the
// same size — a deliberate consistency check, not a coincidence.
export function getPolygonPoints(size: number[], sides: number): number[][] {
  const [w, h] = size
  const cx = w / 2
  const cy = h / 2
  const n = Math.max(3, Math.round(sides))
  const angleStep = (Math.PI * 2) / n
  const start = -Math.PI / 2
  return Array.from({ length: n }, (_, i) => {
    const angle = start + angleStep * i
    return [cx + cx * Math.cos(angle), cy + cy * Math.sin(angle)]
  })
}
