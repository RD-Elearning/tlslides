/**
 * Tests for motion presets (05-motion-system.md §5.3).
 *
 * Verifies: all 35 presets exist, only ALLOWED_PROPERTIES used, duration/easing
 * tokens valid, chain refs point to existing presets, stagger values consistent.
 */

import {
  DURATION_TOKENS,
  EASING_TOKENS,
} from './tokens'
import { ALLOWED_PROPERTIES } from './driver'
import { MOTION_PRESETS, PRESET_IDS, getPreset } from './presets'
import type { MotionPreset } from './presets'

// ---------------------------------------------------------------------------
// Catalog completeness
// ---------------------------------------------------------------------------

describe('MOTION_PRESETS catalog', () => {
  it('contains exactly 35 presets (§5.3)', () => {
    expect(PRESET_IDS).toHaveLength(35)
  })

  it('includes every preset id from the §5.3 table', () => {
    const expected = [
      'none',
      'fade',
      'fade-up',
      'fade-down',
      'pop',
      'wipe-x',
      'wipe-y',
      'mask-reveal',
      'reveal-down',
      'stagger-lines',
      'stagger-children',
      'stagger-grid',
      'words-in',
      'quote-in',
      'count-up',
      'grow-bars-x',
      'grow-bars-y',
      'grow-segments',
      'draw-path',
      'draw-axis-then-nodes',
      'sweep',
      'sweep-nodes',
      'pop-points',
      'radiate',
      'grow-branches',
      'split-in',
      'field-in',
      'title-then-body',
      'title-then-split',
      'scrim-then-text',
      'ken-burns',
      'cover-in',
      'section-in',
      'dashboard-in',
      'closing-in',
    ]
    expect(PRESET_IDS).toEqual(expected)
  })

  it('each preset id equals its record key', () => {
    for (const id of PRESET_IDS) {
      expect(MOTION_PRESETS[id].id).toBe(id)
    }
  })

  it('getPreset returns a preset for every known id', () => {
    for (const id of PRESET_IDS) {
      expect(getPreset(id)).toBeDefined()
      expect(getPreset(id)!.id).toBe(id)
    }
  })

  it('getPreset returns undefined for an unknown id', () => {
    expect(getPreset('nonexistent')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Property allowlist
// ---------------------------------------------------------------------------

describe('preset properties', () => {
  const allowed = new Set(ALLOWED_PROPERTIES)

  it('every preset only uses ALLOWED_PROPERTIES', () => {
    for (const id of PRESET_IDS) {
      const preset = MOTION_PRESETS[id]
      for (const prop of preset.properties) {
        expect(allowed.has(prop)).toBe(true)
      }
    }
  })

  it('no preset property is in FORBIDDEN_PROPERTIES', () => {
    const forbidden = ['transform', 'width', 'height', 'top', 'left', 'box-shadow']
    for (const id of PRESET_IDS) {
      const preset = MOTION_PRESETS[id]
      for (const prop of preset.properties) {
        expect(forbidden).not.toContain(prop)
      }
    }
  })

  it('keyframes object keys are a subset of ALLOWED_PROPERTIES', () => {
    for (const id of PRESET_IDS) {
      const preset = MOTION_PRESETS[id]
      const kfKeys = Object.keys(preset.keyframes)
      for (const key of kfKeys) {
        // MotionKeyframes uses camelCase (clipPath, strokeDashoffset);
        // ALLOWED_PROPERTIES uses kebab-case (clip-path, stroke-dashoffset).
        // Both forms should be accounted for.
        const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        expect(allowed.has(key as any) || allowed.has(kebab as any)).toBe(true)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Duration tokens
// ---------------------------------------------------------------------------

describe('preset duration tokens', () => {
  const validDurations = new Set<string>(Object.keys(DURATION_TOKENS))

  it('every preset references a valid duration token', () => {
    for (const id of PRESET_IDS) {
      expect(validDurations.has(MOTION_PRESETS[id].duration)).toBe(true)
    }
  })

  it('"none" uses a valid duration', () => {
    expect(validDurations.has(MOTION_PRESETS.none.duration)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Easing tokens
// ---------------------------------------------------------------------------

describe('preset easing tokens', () => {
  const validEasings = new Set<string>(Object.keys(EASING_TOKENS))

  it('every preset references a valid easing token', () => {
    for (const id of PRESET_IDS) {
      expect(validEasings.has(MOTION_PRESETS[id].easing)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Chain references
// ---------------------------------------------------------------------------

describe('preset chain references', () => {
  it('chained presets have a non-empty chain array', () => {
    for (const id of PRESET_IDS) {
      const preset = MOTION_PRESETS[id]
      if (preset.isChained) {
        expect(preset.chain).toBeDefined()
        expect(preset.chain!.length).toBeGreaterThan(0)
      }
    }
  })

  it('every chain ref points to an existing preset', () => {
    const allIds = new Set(PRESET_IDS)
    for (const id of PRESET_IDS) {
      const preset = MOTION_PRESETS[id]
      if (preset.chain) {
        for (const ref of preset.chain) {
          expect(allIds.has(ref as any)).toBe(true)
        }
      }
    }
  })

  it('non-chained presets have no chain array', () => {
    for (const id of PRESET_IDS) {
      const preset = MOTION_PRESETS[id]
      if (!preset.isChained) {
        expect(preset.chain).toBeUndefined()
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Stagger
// ---------------------------------------------------------------------------

describe('preset stagger values', () => {
  it('stagger presets use the standard stagger token (40ms)', () => {
    for (const id of PRESET_IDS) {
      const preset = MOTION_PRESETS[id]
      if (preset.staggerMs !== undefined) {
        expect(preset.staggerMs).toBe(DURATION_TOKENS.stagger)
      }
    }
  })

  it('non-stagger presets have no staggerMs', () => {
    const nonStaggerIds = PRESET_IDS.filter(
      (id) => !MOTION_PRESETS[id].staggerMs
    )
    for (const id of nonStaggerIds) {
      expect(MOTION_PRESETS[id].staggerMs).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// Ambient
// ---------------------------------------------------------------------------

describe('preset ambient flag', () => {
  it('ken-burns is the only ambient preset', () => {
    const ambientIds = PRESET_IDS.filter((id) => MOTION_PRESETS[id].isAmbient)
    expect(ambientIds).toEqual(['ken-burns'])
  })

  it('ken-burns uses linear easing', () => {
    expect(MOTION_PRESETS['ken-burns'].easing).toBe('linear')
  })
})

// ---------------------------------------------------------------------------
// Chained presets are correctly identified
// ---------------------------------------------------------------------------

describe('chained presets', () => {
  it('quote-in, title-then-body, title-then-split, scrim-then-text, draw-axis-then-nodes, radiate, grow-branches, cover-in, section-in, dashboard-in, closing-in are chained', () => {
    const expectedChained = [
      'quote-in',
      'draw-axis-then-nodes',
      'radiate',
      'grow-branches',
      'title-then-body',
      'title-then-split',
      'scrim-then-text',
      'cover-in',
      'section-in',
      'dashboard-in',
      'closing-in',
    ]
    const chainedIds = PRESET_IDS.filter((id) => MOTION_PRESETS[id].isChained)
    expect(chainedIds.sort()).toEqual(expectedChained.sort())
  })
})

// ---------------------------------------------------------------------------
// Keyframe structure
// ---------------------------------------------------------------------------

describe('preset keyframes structure', () => {
  it('each keyframe property value is an array', () => {
    for (const id of PRESET_IDS) {
      const kf = MOTION_PRESETS[id].keyframes
      for (const [key, value] of Object.entries(kf)) {
        expect(Array.isArray(value)).toBe(true)
        if (Array.isArray(value)) {
          expect(value.length).toBeGreaterThanOrEqual(1)
        }
      }
    }
  })

  it('"none" has empty keyframes', () => {
    expect(Object.keys(MOTION_PRESETS.none.keyframes)).toHaveLength(0)
  })

  it('"fade" keyframes have opacity [0, 1]', () => {
    expect(MOTION_PRESETS.fade.keyframes.opacity).toEqual([0, 1])
  })

  it('"pop" keyframes have opacity and scale', () => {
    const kf = MOTION_PRESETS.pop.keyframes
    expect(kf.opacity).toEqual([0, 1])
    expect(kf.scale).toEqual([0.98, 1])
  })

  it('"draw-path" keyframes use stroke-dashoffset', () => {
    expect(MOTION_PRESETS['draw-path'].keyframes.strokeDashoffset).toEqual(['100%', '0%'])
  })
})

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

describe('preset immutability', () => {
  it('MOTION_PRESETS is frozen', () => {
    expect(Object.isFrozen(MOTION_PRESETS)).toBe(true)
  })

  it('individual presets are frozen', () => {
    for (const id of PRESET_IDS) {
      expect(Object.isFrozen(MOTION_PRESETS[id])).toBe(true)
    }
  })

  it('PRESET_IDS is frozen', () => {
    expect(Object.isFrozen(PRESET_IDS)).toBe(true)
  })
})
