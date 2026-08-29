// Phase 8c — a `points`-pointed star: `points` outer vertices alternating with `points` inner
// vertices (2 * points total), inscribed in the shape's bounding box the same elliptical way
// `getPolygonPoints` is (independent x/y radii, so a stretched box stretches the star rather than
// clamping to a circle). The first vertex points straight up, same convention as
// `getPolygonPoints`/`getTrianglePoints`.
export function getStarPoints(size: number[], points: number, innerRadiusRatio: number): number[][] {
  const [w, h] = size
  const cx = w / 2
  const cy = h / 2
  const n = Math.max(3, Math.round(points))
  const ratio = Math.min(0.95, Math.max(0.05, innerRadiusRatio))
  const angleStep = Math.PI / n
  const start = -Math.PI / 2

  return Array.from({ length: n * 2 }, (_, i) => {
    const angle = start + angleStep * i
    const isOuter = i % 2 === 0
    const rx = isOuter ? cx : cx * ratio
    const ry = isOuter ? cy : cy * ratio
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]
  })
}
