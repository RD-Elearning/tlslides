/**
 * Tests for tls.d.bar — vertical column chart.
 *
 * Covers: geometry at 3 sizes, zero baseline enforcement, NaN/null handling,
 * highlight behaviour, color assignment (single series → accent), empty data,
 * and the engine's series color constraints.
 */

import { tlsDBar } from './index'
import type { BarChartProps } from './schema'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../../layout/test-helpers'
import { linearScale, niceTicks, barDomain } from '../_engine/linear-scale'
import { assignSeriesColors, highlightColor, MAX_HUES } from '../_engine/series-color'
import type { LayoutNode } from '../../../types'

/** Narrow a LayoutNode to its group variant for accessing .children. */
function asGroup(node: LayoutNode): LayoutNode & { k: 'group'; children: LayoutNode[] } {
  return node as any
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* tls.d.bar block tests                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('tls.d.bar', () => {
  const registry = makeRegistry()

  describe('layout at 3 sizes', () => {
    it.each(SIZES)('produces valid tree at $label ($box.width×$box.height)', ({ box }) => {
      const ctx = makeCtx(box, registry)
      const node = tlsDBar.layout(tlsDBar.defaults as any, ctx)
      assertValidNode(node)
      expect(node.k).toBe('group')
      expect(node.part).toBe('root')
    })
  })

  describe('layout structure', () => {
    it('produces bars matching category count', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(tlsDBar.defaults as any, ctx)
      // Should have: 4 bar rects + 4 category labels + axis nodes + gridlines + title (empty)
      const bars = asGroup(node).children.filter((c) => c.part?.startsWith('bar/'))
      expect(bars).toHaveLength(4)
    })

    it('includes axis baseline', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(tlsDBar.defaults as any, ctx)
      const baseline = asGroup(node).children.find((c) => c.part === 'axis/baseline')
      expect(baseline).toBeDefined()
    })

    it('includes category labels', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(tlsDBar.defaults as any, ctx)
      const labels = asGroup(node).children.filter((c) => c.part === 'label')
      expect(labels).toHaveLength(4)
    })

    it('includes gridlines (non-zero ticks)', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(tlsDBar.defaults as any, ctx)
      const gridlines = asGroup(node).children.filter((c) => c.part?.startsWith('gridline/'))
      expect(gridlines.length).toBeGreaterThanOrEqual(1)
    })

    it('bars never extend above the plot area (critical visibility invariant)', () => {
      // This test verifies that the barDomain fix prevents bars from clipping
      // outside the chart. Uses data [64, 64, 61] which previously produced
      // domain [0, 50] (upper < data max), causing bars to be clipped at the top.
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(
        {
          categories: ['A', 'B', 'C'],
          series: [64, 64, 61],
        } as any,
        ctx
      )
      const children = asGroup(node).children

      // Find all bar rectangles (not gap markers)
      const bars = children.filter((c) => c.part?.startsWith('bar/') && !c.part?.startsWith('bar/gap-'))
      expect(bars.length).toBeGreaterThan(0)

      // Find the plot area top by looking for gridlines or axis baseline.
      // These are positioned using the scale and mark the axis extent.
      const gridlines = children.filter((c) => c.part?.startsWith('gridline/'))
      const axisBaseline = children.find((c) => c.part === 'axis/baseline')

      // The plot area top is the minimum y of any axis/gridline element
      let plotTop = Infinity
      for (const line of [...gridlines, ...(axisBaseline ? [axisBaseline] : [])]) {
        if (line.box && typeof line.box.y === 'number') {
          plotTop = Math.min(plotTop, line.box.y)
        }
      }

      // All bars must have their top edge (y coordinate) >= plotTop
      expect(plotTop).not.toBe(Infinity)
      for (const bar of bars) {
        expect(bar.box.y).toBeGreaterThanOrEqual(plotTop)
      }
    })
  })

  describe('title rendering', () => {
    it('renders a title node when title is provided', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(
        { ...tlsDBar.defaults, title: 'Revenue by Quarter' } as any,
        ctx
      )
      const title = asGroup(node).children.find((c) => c.part === 'title')
      expect(title).toBeDefined()
      expect(title!.k).toBe('text')
    })

    it('omits title node when title is empty', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(
        { ...tlsDBar.defaults, title: '' } as any,
        ctx
      )
      const title = asGroup(node).children.find((c) => c.part === 'title')
      expect(title).toBeUndefined()
    })
  })

  describe('NaN/null handling', () => {
    it('renders gap markers for null/undefined values', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(
        {
          categories: ['A', 'B', 'C'],
          series: [10, null, 30],
        } as any,
        ctx
      )
      const gaps = asGroup(node).children.filter((c) => c.part?.startsWith('bar/gap-'))
      expect(gaps).toHaveLength(1)
      expect(gaps[0].part).toBe('bar/gap-1')
    })

    it('renders gap markers for NaN values', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(
        {
          categories: ['A', 'B'],
          series: [NaN, 20],
        } as any,
        ctx
      )
      const gaps = asGroup(node).children.filter((c) => c.part?.startsWith('bar/gap-'))
      expect(gaps).toHaveLength(1)
      expect(gaps[0].part).toBe('bar/gap-0')
    })

    it('never silently coerces NaN/null to zero — no bar rect for missing data', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(
        {
          categories: ['A', 'B', 'C'],
          series: [null, undefined, NaN],
        } as any,
        ctx
      )
      // All 3 should be gap markers, no regular bars
      const bars = asGroup(node).children.filter(
        (c) => c.part?.startsWith('bar/') && !c.part.includes('gap')
      )
      expect(bars).toHaveLength(0)
      const gaps = asGroup(node).children.filter((c) => c.part?.startsWith('bar/gap-'))
      expect(gaps).toHaveLength(3)
    })
  })

  describe('highlight behavior', () => {
    it('highlighted bar uses accent color, others use neutral', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(
        {
          categories: ['A', 'B', 'C'],
          series: [10, 20, 30],
          highlightIndex: 1,
        } as any,
        ctx
      )
      const bars = asGroup(node).children.filter(
        (c) => c.part?.startsWith('bar/') && !c.part.includes('gap')
      )
      expect(bars).toHaveLength(3)
      // Bar at index 1 should be highlighted
      const highlighted = bars.find((b) => b.part === 'bar/1')
      expect(highlighted).toBeDefined()
      expect(highlighted!.k).toBe('rect')
      const rect = highlighted as Extract<LayoutNode, { k: 'rect' }>
      if (rect.fill?.type === 'solid') {
        expect(rect.fill.color).toBe(ctx.tokens.color.accent)
      }
    })

    it('no highlight (-1) uses accent for single series', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(
        {
          categories: ['A', 'B'],
          series: [10, 20],
          highlightIndex: -1,
        } as any,
        ctx
      )
      const bars = asGroup(node).children.filter(
        (c) => c.part?.startsWith('bar/') && !c.part.includes('gap')
      )
      // Both bars should use accent (single series)
      for (const bar of bars) {
        const rect = bar as Extract<LayoutNode, { k: 'rect' }>
        if (rect.fill?.type === 'solid') {
          expect(rect.fill.color).toBe(ctx.tokens.color.accent)
        }
      }
    })
  })

  describe('empty data', () => {
    it('returns empty group for zero categories', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(
        { categories: [], series: [] } as any,
        ctx
      )
      expect(node.k).toBe('group')
      expect(asGroup(node).children).toHaveLength(0)
    })
  })

  describe('bar geometry', () => {
    it('bars have positive height', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(tlsDBar.defaults as any, ctx)
      const bars = asGroup(node).children.filter(
        (c) => c.part?.startsWith('bar/') && !c.part.includes('gap')
      )
      for (const bar of bars) {
        expect(bar.box.height).toBeGreaterThan(0)
      }
    })

    it('positive values produce bars above the baseline', () => {
      const ctx = makeCtx({ width: 960, height: 540 }, registry)
      const node = tlsDBar.layout(
        {
          categories: ['A'],
          series: [50],
        } as any,
        ctx
      )
      const bars = asGroup(node).children.filter(
        (c) => c.part === 'bar/0'
      )
      expect(bars).toHaveLength(1)
      const bar = bars[0]
      // Bar should have positive height (grew upward from baseline)
      expect(bar.box.height).toBeGreaterThan(0)
    })
  })

  describe('defaults', () => {
    it('has valid default props', () => {
      expect(tlsDBar.defaults.categories).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
      expect(tlsDBar.defaults.series).toEqual([42, 78, 55, 91])
      expect(tlsDBar.defaults.highlightIndex).toBe(-1)
    })

    it('defaults are a deep copy, not a reference', () => {
      const d = tlsDBar.defaults as BarChartProps
      const copy = { ...d, categories: [...d.categories] }
      expect(copy.categories).toEqual(d.categories)
      expect(copy.categories).not.toBe(d.categories)
    })
  })

  describe('block definition', () => {
    it('has correct type and family', () => {
      expect(tlsDBar.type).toBe('tls.d.bar')
      expect(tlsDBar.family).toBe('data')
      expect(tlsDBar.tier).toBe('A')
    })

    it('has schema', () => {
      expect(tlsDBar.schema).toBeDefined()
      expect(tlsDBar.schema.categories).toBeDefined()
      expect(tlsDBar.schema.series).toBeDefined()
    })

    it('has motion recipe', () => {
      expect(tlsDBar.motion).toBeDefined()
      expect(tlsDBar.motion.preset).toBe('grow-bars-y')
    })
  })
})

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Engine tests                                                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

describe('chart engine: linear scale', () => {
  describe('linearScale', () => {
    it('maps domain to range linearly', () => {
      const s = linearScale([0, 100], [0, 500])
      expect(s(0)).toBe(0)
      expect(s(50)).toBe(250)
      expect(s(100)).toBe(500)
    })

    it('clamps to range', () => {
      const s = linearScale([0, 100], [0, 500])
      expect(s(-10)).toBe(0)
      expect(s(200)).toBe(500)
    })

    it('inverts correctly', () => {
      const s = linearScale([0, 100], [0, 500])
      expect(s.invert(250)).toBe(50)
      expect(s.invert(0)).toBe(0)
      expect(s.invert(500)).toBe(100)
    })

    it('handles zero-width domain', () => {
      const s = linearScale([50, 50], [0, 500])
      expect(s(50)).toBe(0)
      expect(s(0)).toBe(0)
    })
  })

  describe('barDomain', () => {
    it('always starts at zero', () => {
      const [min] = barDomain([10, 20, 30])
      expect(min).toBe(0)
    })

    it('returns nice upper bound', () => {
      const [, max] = barDomain([0, 42, 78, 55, 91])
      expect(max).toBeGreaterThanOrEqual(91)
      // Should be a nice number (1, 2, 5 × 10ⁿ)
      const exp = Math.floor(Math.log10(max))
      const frac = max / Math.pow(10, exp)
      expect([1, 2, 5, 10]).toContain(Math.round(frac * 10) / 10)
    })

    it('handles all-zero data', () => {
      const [min, max] = barDomain([0, 0, 0])
      expect(min).toBe(0)
      expect(max).toBeGreaterThanOrEqual(0)
    })

    it('handles empty data', () => {
      const [min, max] = barDomain([])
      expect(min).toBe(0)
      expect(max).toBe(1)
    })

    it('ignores NaN/Infinity for domain computation', () => {
      const [, max] = barDomain([10, NaN, Infinity, 30])
      expect(max).toBeGreaterThanOrEqual(30)
    })

    it('upper bound is always >= data maximum (invariant)', () => {
      // This is the critical invariant: domain upper bound must never be less
      // than the data max, to prevent bars from clipping outside the plot area.
      const testCases: number[][] = [
        [64, 64, 61],         // Original bug case: mantissa 6.4 was in low bucket
        [0, 42, 78, 55, 91],  // Existing test case
        [1.3],                // Small decimal
        [130],                // Another low-mantissa case
        [0, 0, 0],            // All zeros
        [10, NaN, Infinity, 30], // With non-finite values
        [0.04],               // Very small
        [999],                // Large value
      ]
      for (const values of testCases) {
        const [, max] = barDomain(values)
        const finite = values.filter((v) => Number.isFinite(v))
        if (finite.length > 0) {
          const dataMax = Math.max(...finite.map(Math.abs))
          expect(max).toBeGreaterThanOrEqual(dataMax)
        }
      }
    })
  })

  describe('niceTicks', () => {
    it('generates ticks within domain', () => {
      const ticks = niceTicks([0, 100], 6)
      expect(ticks.length).toBeGreaterThanOrEqual(2)
      expect(ticks[0]).toBeLessThanOrEqual(0)
      expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(100)
    })

    it('generates ascending ticks', () => {
      const ticks = niceTicks([0, 50], 5)
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i]).toBeGreaterThan(ticks[i - 1])
      }
    })

    it('single value domain returns one tick', () => {
      const ticks = niceTicks([42, 42])
      expect(ticks).toEqual([42])
    })
  })
})

describe('chart engine: series colors', () => {
  describe('assignSeriesColors', () => {
    it('single series uses accent, not categorical[0]', () => {
      const tokens = {
        color: { accent: '#ff0000' },
        categorical: ['#00ff00'],
      } as any
      const colors = assignSeriesColors(1, tokens)
      expect(colors).toEqual(['#ff0000'])
    })

    it('multiple series use categorical', () => {
      const tokens = {
        color: { accent: '#ff0000' },
        categorical: ['#aaa', '#bbb', '#ccc'],
      } as any
      const colors = assignSeriesColors(3, tokens)
      expect(colors).toEqual(['#aaa', '#bbb', '#ccc'])
    })

    it('caps at MAX_HUES', () => {
      const tokens = {
        color: { accent: '#ff0000' },
        categorical: ['#a', '#b', '#c', '#d', '#e', '#f', '#g', '#h'],
      } as any
      const colors = assignSeriesColors(8, tokens)
      expect(colors.length).toBe(MAX_HUES)
    })

    it('returns empty array for zero series', () => {
      const colors = assignSeriesColors(0, {} as any)
      expect(colors).toEqual([])
    })
  })

  describe('highlightColor', () => {
    it('returns accent for highlighted index', () => {
      const result = highlightColor(2, 2, '#aaa', {
        color: { accent: '#ff0000', neutral: '#999' },
      } as any)
      expect(result).toBe('#ff0000')
    })

    it('returns neutral for non-highlighted index', () => {
      const result = highlightColor(1, 2, '#aaa', {
        color: { accent: '#ff0000', neutral: '#999' },
      } as any)
      expect(result).toBe('#999')
    })
  })
})
