import Vec from '@tlslides/vec'
import { getStarPoints } from './starHelpers'

describe('getStarPoints', () => {
  it('returns 2 * points vertices', () => {
    expect(getStarPoints([100, 100], 5, 0.5)).toHaveLength(10)
    expect(getStarPoints([100, 100], 8, 0.5)).toHaveLength(16)
  })

  it('alternates outer and inner vertices — every other vertex is closer to the center', () => {
    const size = [100, 100]
    const points = getStarPoints(size, 5, 0.5)
    const center = [50, 50]
    for (let i = 0; i < points.length; i += 2) {
      const outerDist = Vec.dist(points[i], center)
      const innerDist = Vec.dist(points[i + 1], center)
      expect(innerDist).toBeLessThan(outerDist)
    }
  })

  it('clamps an extreme innerRadiusRatio into a sane range instead of degenerating', () => {
    const collapsed = getStarPoints([100, 100], 5, 0)
    const center = [50, 50]
    // Even at ratio 0, inner vertices sit at >0 distance from center (clamped to 0.05), not
    // exactly on top of it — a real, if sharp, star rather than a degenerate point-through-center.
    expect(Vec.dist(collapsed[1], center)).toBeGreaterThan(0)
  })
})
