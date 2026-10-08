import { scaleIconPath } from './scale-path'
import { ICONS } from './index'

describe('scaleIconPath', () => {
  it('scales absolute and relative coordinates uniformly', () => {
    expect(scaleIconPath('M0 0L12 12h6v-6z', 2)).toBe('M 0 0 L 24 24 h 12 v -12 z')
  })

  it('scales arc radii and endpoints but not rotation or flags', () => {
    expect(scaleIconPath('M1 1a2 3 30 1 0 4 5', 2)).toBe('M 2 2 a 4 6 30 1 0 8 10')
  })

  it('handles compact flags like "a1 1 0 11-2 0"', () => {
    expect(scaleIconPath('a1 1 0 11-2 0', 2)).toBe('a 2 2 0 1 1 -4 0')
  })

  it('keeps implicit repeated command groups separated', () => {
    expect(scaleIconPath('l1 2 3 4', 2)).toBe('l 2 4 6 8')
  })

  it('returns the input for factor 1, bad factors and malformed data', () => {
    expect(scaleIconPath('M1 1', 1)).toBe('M1 1')
    expect(scaleIconPath('M1 1', 0)).toBe('M1 1')
    expect(scaleIconPath('M1 1', NaN)).toBe('M1 1')
    expect(scaleIconPath('garbage', 2)).toBe('garbage')
    expect(scaleIconPath('M1', 2)).toBe('M1')
  })

  it('scales every icon in the set and keeps command letters intact', () => {
    for (const [name, icon] of Object.entries(ICONS)) {
      const scaled = scaleIconPath(icon.path, 2)
      expect([name, scaled.replace(/[^a-zA-Z]/g, '')]).toEqual([name, icon.path.replace(/[^a-zA-Z]/g, '')])
    }
  })
})
