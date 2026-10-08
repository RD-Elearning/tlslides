import { levenshtein, nearestName } from './nearest-name'
import { compileSlide } from './slide-compiler'
import { resolveTokens } from './tokens'
import { activeDeckTheme } from '~state/shapes/shared/deck-theme'
import type { SlideSpec } from './types'

describe('levenshtein', () => {
  it('is 0 for identical strings and symmetric', () => {
    expect(levenshtein('left', 'left')).toBe(0)
    expect(levenshtein('lft', 'left')).toBe(levenshtein('left', 'lft'))
  })

  it('counts one edit per insertion, deletion and substitution', () => {
    expect(levenshtein('lft', 'left')).toBe(1) // insertion
    expect(levenshtein('lefft', 'left')).toBe(1) // deletion
    expect(levenshtein('laft', 'left')).toBe(1) // substitution
    expect(levenshtein('', 'left')).toBe(4)
  })
})

describe('nearestName', () => {
  it('finds the one-edit typo the old prefix scorer missed', () => {
    // "lft" and "left" share only a leading "l". The prefix scorer this replaced gave that
    // 1/4 = 0.25, below its own 0.3 cutoff, and returned nothing — for the single most likely
    // typo a model makes.
    expect(nearestName('lft', ['title', 'left', 'right'])).toBe('left')
  })

  it('matches typos in the middle and at the end of a name', () => {
    expect(nearestName('twocolum', ['two-column', 'three-column', 'blank'])).toBe('two-column')
    expect(nearestName('attributon', ['quote', 'attribution'])).toBe('attribution')
  })

  it('is case insensitive but returns the candidate spelling', () => {
    expect(nearestName('LEFT', ['title', 'left'])).toBe('left')
  })

  it('returns undefined rather than a misleading suggestion for an unrelated name', () => {
    expect(nearestName('sidebar-illustration', ['left', 'right'])).toBeUndefined()
  })

  it('returns undefined for empty input or no candidates', () => {
    expect(nearestName('', ['left'])).toBeUndefined()
    expect(nearestName('left', [])).toBeUndefined()
  })
})

describe('compileSlide region suggestions (the integration this refactor fixes)', () => {
  const tokens = resolveTokens(activeDeckTheme(undefined), undefined)
  const frame = { width: 1920, height: 1080 }

  function compileWithRegion(regionName: string) {
    const spec: SlideSpec = {
      id: 'sl_x',
      layout: 'two-column',
      regions: {
        [regionName]: [{ id: 'b1', type: 'tls.t.title', props: { text: 'Hi' } }],
      },
    }
    return compileSlide(spec, frame, tokens)
  }

  it('suggests "left" for "lft" — which it previously could not', () => {
    const finding = compileWithRegion('lft').findings.find((f) => f.rule === 'region/unknown')
    expect(finding).toBeDefined()
    expect(finding!.suggestion).toContain('left')
  })

  it('still suggests nothing for a region name that is not a typo of any real region', () => {
    const finding = compileWithRegion('zzzzzzzzzzzzzz').findings.find(
      (f) => f.rule === 'region/unknown'
    )
    expect(finding).toBeDefined()
    expect(finding!.suggestion).toBeUndefined()
  })
})
