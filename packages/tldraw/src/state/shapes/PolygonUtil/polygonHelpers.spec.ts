import { getPolygonPoints } from './polygonHelpers'

describe('getPolygonPoints', () => {
  it('returns exactly `sides` vertices', () => {
    expect(getPolygonPoints([100, 100], 6)).toHaveLength(6)
    expect(getPolygonPoints([100, 100], 3)).toHaveLength(3)
    expect(getPolygonPoints([100, 100], 12)).toHaveLength(12)
  })

  it('clamps below 3 sides up to a triangle', () => {
    expect(getPolygonPoints([100, 100], 2)).toHaveLength(3)
    expect(getPolygonPoints([100, 100], 0)).toHaveLength(3)
  })

  it('every vertex stays within the bounding box (within floating-point slop)', () => {
    const [w, h] = [200, 120]
    const points = getPolygonPoints([w, h], 7)
    points.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(-1e-9)
      expect(x).toBeLessThanOrEqual(w + 1e-9)
      expect(y).toBeGreaterThanOrEqual(-1e-9)
      expect(y).toBeLessThanOrEqual(h + 1e-9)
    })
  })

  it('the first vertex points straight up (matches getTrianglePoints for 3 sides)', () => {
    const [point] = getPolygonPoints([100, 100], 3)
    expect(point[0]).toBeCloseTo(50)
    expect(point[1]).toBeCloseTo(0)
  })
})
