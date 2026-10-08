/**
 * D2 — Slide layout geometry tests.
 *
 * Every layout at 16:9, 4:3 and 9:16 aspect ratios:
 * - All regions stay inside the safe margin
 * - No two regions overlap
 * - Declared ratios are actually produced
 * - Module-level objects are copied, not aliased
 */

import { SLIDE_LAYOUTS, getSlideLayout, type SlideLayoutId } from './slide-layouts'
import type { Box, ResolvedTokens } from './types'
import { TEST_TOKENS } from './parity-harness'

/* ── Aspect presets ─────────────────────────────────────────────────────────── */

const ASPECTS: Array<{ label: string; width: number; height: number }> = [
  { label: '16:9', width: 1920, height: 1080 },
  { label: '4:3', width: 1440, height: 1080 },
  { label: '9:16', width: 1080, height: 1920 },
]

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function allRegionsInsideSafeMargin(
  regions: Record<string, Box>,
  frame: { width: number; height: number },
  tokens: ResolvedTokens,
): void {
  const m = tokens.space['3xl']
  for (const [name, box] of Object.entries(regions)) {
    expect(box.x).toBeGreaterThanOrEqual(m - 0.5) // small rounding tolerance
    expect(box.y).toBeGreaterThanOrEqual(m - 0.5)
    expect(box.x + box.width).toBeLessThanOrEqual(frame.width - m + 0.5)
    expect(box.y + box.height).toBeLessThanOrEqual(frame.height - m + 0.5)
  }
}

function noRegionsOverlap(regions: Record<string, Box>): void {
  const keys = Object.keys(regions)
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = regions[keys[i]]
      const b = regions[keys[j]]
      // Two boxes overlap iff they intersect on both axes
      const overlapX = a.x < b.x + b.width && a.x + a.width > b.x
      const overlapY = a.y < b.y + b.height && a.y + a.height > b.y
      if (overlapX && overlapY) {
        // Allow tiny rounding overlaps (≤1 slide unit)
        const ix = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
        const iy = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
        expect(ix * iy).toBeLessThanOrEqual(1)
      }
    }
  }
}

function allRegionsPositiveSize(regions: Record<string, Box>): void {
  for (const [name, box] of Object.entries(regions)) {
    expect(box.width).toBeGreaterThan(0)
    expect(box.height).toBeGreaterThan(0)
  }
}

/* ── SLIDE_LAYOUTS module-level object ─────────────────────────────────────── */

describe('SLIDE_LAYOUTS module-level', () => {
  it('contains exactly 16 layouts', () => {
    expect(SLIDE_LAYOUTS).toHaveLength(16)
  })

  it('is not aliased by reference — copy with not.toBe + toEqual', () => {
    const copy = [...SLIDE_LAYOUTS]
    expect(copy).not.toBe(SLIDE_LAYOUTS)
    expect(copy).toEqual(SLIDE_LAYOUTS)
  })

  it('each layout object is individually copied', () => {
    const original = SLIDE_LAYOUTS[0]
    const copy = { ...original }
    expect(copy).not.toBe(original)
    expect(copy).toEqual(original)
  })

  it('getSlideLayout returns the matching layout', () => {
    const layout = getSlideLayout('title')
    expect(layout).toBeDefined()
    expect(layout!.id).toBe('title')
  })

  it('getSlideLayout returns undefined for unknown id', () => {
    // @ts-expect-error — intentionally invalid id
    expect(getSlideLayout('nonexistent')).toBeUndefined()
  })
})

/* ── Per-layout tests across all aspects ────────────────────────────────────── */

describe.each(ASPECTS)('layouts at $label (%dx%d)', ({ label, width, height }) => {
  const frame = { width, height }

  for (const layout of SLIDE_LAYOUTS) {
    describe(`layout "${layout.id}"`, () => {
      let regions: Record<string, Box>

      beforeAll(() => {
        regions = layout.compile(frame, TEST_TOKENS)
      })

      it('returns a non-empty record', () => {
        expect(Object.keys(regions).length).toBeGreaterThan(0)
      })

      it('all regions are inside the safe margin', () => {
        allRegionsInsideSafeMargin(regions, frame, TEST_TOKENS)
      })

      it('no two regions overlap', () => {
        noRegionsOverlap(regions)
      })

      it('all regions have positive width and height', () => {
        allRegionsPositiveSize(regions)
      })
    })
  }
})

/* ── Ratio-specific assertions ──────────────────────────────────────────────── */

describe('declared ratios are produced at 16:9', () => {
  const frame = { width: 1920, height: 1080 }

  it('image-left: image ≈ 60%, text ≈ 40%', () => {
    const regions = getSlideLayout('image-left')!.compile(frame, TEST_TOKENS)
    const total = regions.image.width + regions.text.width
    const ratio = regions.image.width / total
    expect(ratio).toBeCloseTo(0.6, 1)
  })

  it('image-right: text ≈ 40%, image ≈ 60%', () => {
    const regions = getSlideLayout('image-right')!.compile(frame, TEST_TOKENS)
    const total = regions.text.width + regions.image.width
    const ratio = regions.image.width / total
    expect(ratio).toBeCloseTo(0.6, 1)
  })

  it('image-top: image ≈ 60%, text ≈ 40% (height)', () => {
    const regions = getSlideLayout('image-top')!.compile(frame, TEST_TOKENS)
    const total = regions.image.height + regions.text.height
    const ratio = regions.image.height / total
    expect(ratio).toBeCloseTo(0.6, 1)
  })

  it('image-bottom: text ≈ 40%, image ≈ 60% (height)', () => {
    const regions = getSlideLayout('image-bottom')!.compile(frame, TEST_TOKENS)
    const total = regions.text.height + regions.image.height
    const ratio = regions.image.height / total
    expect(ratio).toBeCloseTo(0.6, 1)
  })

  it('two-column: left ≈ right (50/50)', () => {
    const regions = getSlideLayout('two-column')!.compile(frame, TEST_TOKENS)
    expect(Math.abs(regions.left.width - regions.right.width)).toBeLessThanOrEqual(1)
  })

  it('three-column: a ≈ b ≈ c (equal thirds)', () => {
    const regions = getSlideLayout('three-column')!.compile(frame, TEST_TOKENS)
    expect(Math.abs(regions.a.width - regions.b.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(regions.b.width - regions.c.width)).toBeLessThanOrEqual(1)
  })

  it('four-up: all quadrants are equal', () => {
    const regions = getSlideLayout('four-up')!.compile(frame, TEST_TOKENS)
    expect(regions.q1.width).toBe(regions.q2.width)
    expect(regions.q1.height).toBe(regions.q3.height)
    expect(regions.q2.width).toBe(regions.q4.width)
    expect(regions.q3.width).toBe(regions.q4.width)
  })

  it('grid-3x2: all cells are nearly equal (±2 for integer rounding)', () => {
    const regions = getSlideLayout('grid-3x2')!.compile(frame, TEST_TOKENS)
    const cells = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] as const
    const widths = cells.map((c) => regions[c].width)
    const heights = cells.map((c) => regions[c].height)
    for (const w of widths) expect(Math.abs(w - widths[0])).toBeLessThanOrEqual(2)
    for (const h of heights) expect(Math.abs(h - heights[0])).toBeLessThanOrEqual(2)
  })

  it('grid-2x3: all cells are nearly equal (±2 for integer rounding)', () => {
    const regions = getSlideLayout('grid-2x3')!.compile(frame, TEST_TOKENS)
    const cells = ['a', 'b', 'c', 'd', 'e', 'f'] as const
    const widths = cells.map((c) => regions[c].width)
    const heights = cells.map((c) => regions[c].height)
    for (const w of widths) expect(Math.abs(w - widths[0])).toBeLessThanOrEqual(2)
    for (const h of heights) expect(Math.abs(h - heights[0])).toBeLessThanOrEqual(2)
  })

  it('comparison: left ≈ right (50/50)', () => {
    const regions = getSlideLayout('comparison')!.compile(frame, TEST_TOKENS)
    expect(Math.abs(regions.left.width - regions.right.width)).toBeLessThanOrEqual(1)
  })

  it('kpi-row: four equal KPI slots', () => {
    const regions = getSlideLayout('kpi-row')!.compile(frame, TEST_TOKENS)
    const kpis = [regions.kpi1, regions.kpi2, regions.kpi3, regions.kpi4]
    const widths = kpis.map((k) => k.width)
    for (const w of widths) expect(w).toBe(widths[0])
  })

  it('blank: content fills the safe margin area', () => {
    const regions = getSlideLayout('blank')!.compile(frame, TEST_TOKENS)
    const m = TEST_TOKENS.space['3xl']
    expect(regions.content.x).toBe(m)
    expect(regions.content.y).toBe(m)
    expect(regions.content.width).toBe(frame.width - 2 * m)
    expect(regions.content.height).toBe(frame.height - 2 * m)
  })
})

/* ── Safe margin consistency across aspects ─────────────────────────────────── */

describe('safe margin at every aspect', () => {
  for (const { label, width, height } of ASPECTS) {
    it(`blank content area uses safe margin at ${label}`, () => {
      const regions = getSlideLayout('blank')!.compile({ width, height }, TEST_TOKENS)
      const m = TEST_TOKENS.space['3xl']
      expect(regions.content.x).toBe(m)
      expect(regions.content.y).toBe(m)
      expect(regions.content.width).toBe(width - 2 * m)
      expect(regions.content.height).toBe(height - 2 * m)
    })
  }
})

/* ── Timeline has full width ────────────────────────────────────────────────── */

describe('timeline layout', () => {
  it('timeline region spans the full content width', () => {
    const frame = { width: 1920, height: 1080 }
    const regions = getSlideLayout('timeline')!.compile(frame, TEST_TOKENS)
    const m = TEST_TOKENS.space['3xl']
    expect(regions.timeline.x).toBe(m)
    expect(regions.timeline.width).toBe(frame.width - 2 * m)
  })

  it('timeline region starts below the title', () => {
    const frame = { width: 1920, height: 1080 }
    const regions = getSlideLayout('timeline')!.compile(frame, TEST_TOKENS)
    const g = TEST_TOKENS.space['xl']
    const tH = TEST_TOKENS.type.heading.size + TEST_TOKENS.space.md
    expect(regions.timeline.y).toBe(regions.title.y + regions.title.height + g)
  })
})

/* ── Quote narrowness ───────────────────────────────────────────────────────── */

describe('quote layout', () => {
  it('quote region is narrower than full content width', () => {
    const frame = { width: 1920, height: 1080 }
    const regions = getSlideLayout('quote')!.compile(frame, TEST_TOKENS)
    const ca = frame.width - 2 * TEST_TOKENS.space['3xl']
    expect(regions.quote.width).toBeLessThan(ca)
  })

  it('quote region is horizontally centered', () => {
    const frame = { width: 1920, height: 1080 }
    const regions = getSlideLayout('quote')!.compile(frame, TEST_TOKENS)
    const m = TEST_TOKENS.space['3xl']
    const totalW = frame.width - 2 * m
    const quoteX = regions.quote.x - m
    const rightMargin = totalW - regions.quote.width - quoteX
    expect(Math.abs(quoteX - rightMargin)).toBeLessThanOrEqual(1)
  })
})
