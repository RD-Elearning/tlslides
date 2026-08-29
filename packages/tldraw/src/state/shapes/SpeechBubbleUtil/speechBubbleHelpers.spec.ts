import { getSpeechBubblePoints } from './speechBubbleHelpers'

describe('getSpeechBubblePoints', () => {
  it('returns a 7-vertex closed polygon (4 body corners + 3 tail points)', () => {
    expect(getSpeechBubblePoints([200, 140])).toHaveLength(7)
  })

  it('the tail dips below the body but never past the full box height (`size[1]`)', () => {
    const [, h] = [200, 140]
    const points = getSpeechBubblePoints([200, h])
    const maxY = Math.max(...points.map((p) => p[1]))
    expect(maxY).toBeCloseTo(h)
  })

  it('every vertex stays within the [0, w] horizontal range', () => {
    const [w] = [200]
    const points = getSpeechBubblePoints([w, 140])
    points.forEach(([x]) => {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(w)
    })
  })

  it('never lets the tail consume more than half the box, even for a very short bubble', () => {
    const points = getSpeechBubblePoints([200, 20])
    const bodyBottomY = points[2][1] // top-right's paired bottom-right corner
    expect(bodyBottomY).toBeGreaterThanOrEqual(10) // >= half of height 20
  })
})
