import {
  applyDensity,
  ELEVATION_SCALE,
  generateCategoricalRamp,
  MOTION_SCALE,
  RADIUS_SCALE,
  SPACE_ORDER,
  SPACE_SCALE,
  TYPE_SCALE,
} from './scales'
import type { TypeToken } from './types'

describe('TYPE_SCALE', () => {
  it('has all 8 tokens from doc 02 §2.3, ascending in size', () => {
    const order: TypeToken[] = [
      'footnote',
      'caption',
      'body',
      'lead',
      'subheading',
      'heading',
      'title',
      'display',
    ]
    for (let i = 1; i < order.length; i++) {
      expect(TYPE_SCALE[order[i]].size).toBeGreaterThan(TYPE_SCALE[order[i - 1]].size)
    }
  })

  it('matches the doc literal values for a couple of anchor tokens', () => {
    expect(TYPE_SCALE.display).toEqual({ size: 152, lineHeight: 1.02 })
    expect(TYPE_SCALE.body).toEqual({ size: 28, lineHeight: 1.45 })
  })
})

describe('SPACE_SCALE', () => {
  it('has all 10 tokens from doc 02 §2.3 in the documented order', () => {
    expect(SPACE_ORDER.map((t) => SPACE_SCALE[t])).toEqual([4, 8, 12, 16, 24, 32, 48, 64, 96, 128])
  })
})

describe('RADIUS_SCALE', () => {
  it('matches doc 02 §2.3 exactly', () => {
    expect(RADIUS_SCALE).toEqual({ none: 0, sm: 8, md: 16, lg: 24, xl: 32, pill: 9999 })
  })
})

describe('ELEVATION_SCALE', () => {
  it('has exactly 3 levels, level 0 with no shadow', () => {
    expect(Object.keys(ELEVATION_SCALE)).toHaveLength(3)
    expect(ELEVATION_SCALE[0].shadow).toBe('none')
  })

  it('never uses a horizontal offset — one light source per slide', () => {
    expect(ELEVATION_SCALE[0].dx).toBe(0)
    expect(ELEVATION_SCALE[1].dx).toBe(0)
    expect(ELEVATION_SCALE[2].dx).toBe(0)
  })

  it('increases blur and vertical offset with level', () => {
    expect(ELEVATION_SCALE[2].dy).toBeGreaterThan(ELEVATION_SCALE[1].dy)
    expect(ELEVATION_SCALE[2].blur).toBeGreaterThan(ELEVATION_SCALE[1].blur)
  })
})

describe('MOTION_SCALE', () => {
  it('has fast < normal < slow durations', () => {
    expect(MOTION_SCALE.duration.fast).toBeLessThan(MOTION_SCALE.duration.normal)
    expect(MOTION_SCALE.duration.normal).toBeLessThan(MOTION_SCALE.duration.slow)
  })

  it('has a CSS easing function string for every token', () => {
    for (const ease of Object.values(MOTION_SCALE.ease)) {
      expect(typeof ease).toBe('string')
      expect(ease.length).toBeGreaterThan(0)
    }
  })
})

describe('applyDensity', () => {
  it('leaves the scale unchanged at default density', () => {
    const result = applyDensity(SPACE_SCALE, 'default')
    expect(result).toEqual(SPACE_SCALE)
    expect(result).not.toBe(SPACE_SCALE) // never a reference alias — see the module's hard rule
  })

  it('shifts every step down by one for compact', () => {
    const result = applyDensity(SPACE_SCALE, 'compact')
    // 'md' (index 4) now reads what 'sm' (index 3) used to be.
    expect(result.md).toBe(SPACE_SCALE.sm)
    expect(result.lg).toBe(SPACE_SCALE.md)
  })

  it('shifts every step up by one for roomy', () => {
    const result = applyDensity(SPACE_SCALE, 'roomy')
    expect(result.md).toBe(SPACE_SCALE.lg)
    expect(result.sm).toBe(SPACE_SCALE.md)
  })

  it('clamps at the ends of the scale rather than going out of range', () => {
    const compact = applyDensity(SPACE_SCALE, 'compact')
    expect(compact['3xs']).toBe(SPACE_SCALE['3xs']) // already the smallest step
    const roomy = applyDensity(SPACE_SCALE, 'roomy')
    expect(roomy['4xl']).toBe(SPACE_SCALE['4xl']) // already the largest step
  })

  it('composes with a custom (overridden) scale rather than only the default one', () => {
    const custom = { ...SPACE_SCALE, md: 999 }
    const result = applyDensity(custom, 'compact')
    expect(result.lg).toBe(999) // 'lg' now reads the custom 'md' value
  })
})

describe('generateCategoricalRamp', () => {
  it('produces exactly 6 hex colours', () => {
    const ramp = generateCategoricalRamp('#38BDF8', '#F472B6')
    expect(ramp).toHaveLength(6)
    for (const color of ramp) expect(color).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('is deterministic for the same inputs', () => {
    expect(generateCategoricalRamp('#38BDF8', '#F472B6')).toEqual(
      generateCategoricalRamp('#38BDF8', '#F472B6')
    )
  })

  it('produces 6 distinct colours (no accidental duplicate rotation)', () => {
    const ramp = generateCategoricalRamp('#38BDF8', '#F472B6')
    expect(new Set(ramp).size).toBe(6)
  })
})
