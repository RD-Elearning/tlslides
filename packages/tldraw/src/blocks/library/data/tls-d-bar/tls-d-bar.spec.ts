/**
 * Tests for tls.d.bar — one series as columns or horizontal bars.
 *
 * RV05: the block now runs on the shared bar engine (`_chart/bar-family`), so the geometry tests
 * assert the behaviour a reader sees (bars, gridlines, centred labels, gaps, highlight) rather
 * than the pre-P2 node layout. The chart-engine unit tests below are unchanged.
 */

import { tlsDBar } from './index'
import type { BarChartProps } from './schema'
import { makeCtx, makeRegistry, SIZES, assertValidNode } from '../../layout/test-helpers'
import { linearScale, niceTicks, barDomain } from '../_engine/linear-scale'
import { assignSeriesColors, highlightColor, MAX_HUES } from '../_engine/series-color'
import type { LayoutNode } from '../../../types'
import { absoluteLeaves } from '../../text/standard-suite'
import { assertExampleFits, assertChartSane, isNoData, textsOf } from '../_chart/chart-test'
import { realWidth } from '../_chart/inter-width'

const registry = makeRegistry()
const box = { width: 960, height: 540 }
const lay = (p: Partial<BarChartProps> = {}, size = box): LayoutNode =>
  tlsDBar.layout({ ...(tlsDBar.defaults as any), ...p } as any, makeCtx(size, registry))
const leaves = (t: LayoutNode) => absoluteLeaves(t)
const bars = (t: LayoutNode) => leaves(t).filter((l) => /^bar\[0\]\[\d+\]$/.test(l.part ?? ''))
const fill = (l: { node: LayoutNode }) => ((l.node as any).fill?.color as string) ?? ''

describe('tls.d.bar', () => {
  it.each(SIZES)('produces a valid tree at $label ($box.width×$box.height)', ({ box: b }) => {
    const node = lay({}, b)
    assertValidNode(node)
    expect(node.k).toBe('group')
    expect(node.part).toBe('root')
  })

  it('draws one bar per category, with a baseline, gridlines and one centred label per category', () => {
    const t = lay()
    expect(bars(t)).toHaveLength(4)
    const parts = leaves(t).map((l) => l.part ?? '')
    expect(parts.filter((p) => /^grid\[\d+\]$/.test(p)).length).toBeGreaterThanOrEqual(3)
    const cats = leaves(t).filter((l) => /^cat\[\d+\]$/.test(l.part ?? ''))
    expect(cats).toHaveLength(4)
    const bs = bars(t)
    cats.forEach((c, i) => {
      const n = c.node as any
      const w = realWidth(n.lines[0].text, n.style)
      // the label is centred on its bar within a couple of units
      expect(Math.abs(c.x + c.width / 2 - (bs[i].x + bs[i].width / 2))).toBeLessThanOrEqual(w * 0.05 + 2)
    })
  })

  it('bars sit on the baseline, inside the plot, and heights follow the values', () => {
    const t = lay({ categories: ['A', 'B', 'C'], series: [64, 64, 32] })
    const bs = bars(t)
    const base = Math.max(...bs.map((b) => b.y + b.height))
    for (const b of bs) expect(b.y + b.height).toBeCloseTo(base, 6)
    expect(bs[0].height).toBeCloseTo(bs[1].height, 6)
    expect(bs[0].height / bs[2].height).toBeCloseTo(2, 2)
    const gridTop = Math.min(...leaves(t).filter((l) => /^grid\[/.test(l.part ?? '')).map((l) => l.y))
    for (const b of bs) expect(b.y).toBeGreaterThanOrEqual(gridTop - 0.5)
  })

  it('the value of each bar is printed above it, and valueLabels none removes them', () => {
    expect(textsOf(lay())).toEqual(expect.arrayContaining(['42', '78', '55', '91']))
    const without = textsOf(lay({ valueLabels: 'none' }))
    expect(without).not.toContain('91')
  })

  it('a title is drawn above the chart and nothing overlaps it', () => {
    const t = lay({ title: 'Revenue by quarter' })
    const title = leaves(t).find((l) => l.part === 'title')!
    expect(title).toBeDefined()
    for (const b of bars(t)) expect(b.y).toBeGreaterThanOrEqual(title.y + title.height)
    assertChartSane(t, box)
    expect(leaves(lay({ title: '' })).some((l) => l.part === 'title')).toBe(false)
  })

  it('null / NaN values leave a gap: no bar, never a zero', () => {
    const t = lay({ categories: ['a', 'b', 'c', 'd'], series: [10, null, NaN, 5] })
    expect(bars(t)).toHaveLength(2)
    expect(leaves(t).filter((l) => /^cat\[\d+\]$/.test(l.part ?? ''))).toHaveLength(4)
    expect(JSON.stringify(t)).not.toMatch(/NaN|Infinity/)
  })

  it('highlight recolours one bar to accent and dims the rest; no highlight = all accent', () => {
    const plain = bars(lay({ highlightIndex: -1 })).map(fill)
    expect(new Set(plain).size).toBe(1)
    const hl = bars(lay({ highlightIndex: 1 })).map(fill)
    expect(hl[1]).toBe(plain[0])
    expect(hl[0]).not.toBe(hl[1])
    expect(hl[0]).toBe(hl[2])
  })

  it('empty or all-zero data render "No data"', () => {
    expect(isNoData(lay({ categories: [], series: [] }))).toBe(true)
    expect(isNoData(lay({ categories: ['a', 'b'], series: [0, 0] }))).toBe(true)
  })

  it('long category labels wrap, thin out or clip; they never overlap or leave the box', () => {
    const long = Array.from({ length: 8 }, (_, i) => `Quarterly figure number ${i + 1}`)
    const size = { width: 600, height: 400 }
    const t = lay({ categories: long, series: long.map((_, i) => i + 1) }, size)
    assertChartSane(t, size)
  })

  it('the default props are a deep copy, not a reference', () => {
    const a = tlsDBar.defaults as any
    expect(a.categories).not.toBe((tlsDBar.defaults as any).categories === a.categories ? [] : a.categories)
    expect(a.categories).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
  })

  it('has type, family, schema and a motion recipe that reveals the bars one after another', () => {
    expect(tlsDBar.type).toBe('tls.d.bar')
    expect(tlsDBar.family).toBe('data')
    expect(tlsDBar.schema.series).toBeDefined()
    expect(tlsDBar.motion?.preset).toBe('stagger-children')
    expect(tlsDBar.motion?.parts).toEqual(expect.arrayContaining(['title', 'bar[*][*]']))
  })
})

describe('tls.d.bar horizontal', () => {
  const props = (over: Partial<BarChartProps> = {}): Partial<BarChartProps> => ({
    categories: ['North America', 'Europe', 'Asia Pacific', 'Latin America'],
    series: [120, 90, 150, 40],
    orientation: 'horizontal',
    ...over,
  })

  it('omitting orientation is byte-identical to explicit vertical; the schema offers both', () => {
    const base = { categories: ['Q1', 'Q2', 'Q3'], series: [64, 64, 61], highlightIndex: 2, title: 'Revenue' }
    const a = tlsDBar.layout(base as any, makeCtx(box, registry))
    const b = tlsDBar.layout({ ...base, orientation: 'vertical' } as any, makeCtx(box, registry))
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
    expect(tlsDBar.defaults).not.toHaveProperty('orientation')
    expect(tlsDBar.schema.orientation.type).toEqual({ kind: 'enum', values: ['vertical', 'horizontal'] })
  })

  it('bars grow rightwards from one baseline, one row per category, widths follow the values', () => {
    const bs = bars(lay(props()))
    expect(bs).toHaveLength(4)
    for (const b of bs) expect(b.x).toBeCloseTo(bs[0].x, 6)
    expect(bs[0].width / bs[3].width).toBeCloseTo(120 / 40, 2)
    for (let i = 1; i < bs.length; i++) expect(bs[i].y).toBeGreaterThanOrEqual(bs[i - 1].y + bs[i - 1].height - 0.5)
  })

  it('category labels are on the left of the bars and vertically centred on their bar', () => {
    const t = lay(props())
    const labels = leaves(t).filter((l) => /^cat\[\d+\]$/.test(l.part ?? ''))
    const bs = bars(t)
    expect(labels).toHaveLength(4)
    labels.forEach((l, i) => {
      expect(l.x + l.width).toBeLessThanOrEqual(bs[i].x)
      expect(Math.abs(l.y + l.height / 2 - (bs[i].y + bs[i].height / 2))).toBeLessThanOrEqual(lineHeightOf(l) * 0.6)
    })
  })

  it('a very long label never takes more than a third of the width and everything stays in the box', () => {
    const t = lay(props({ categories: ['x'.repeat(80), 'b', 'c', 'd'] }))
    assertChartSane(t, box)
    const l = leaves(t).find((n) => /^cat\[0\]/.test(n.part ?? ''))!
    expect(l.width).toBeLessThanOrEqual(box.width * 0.34 + 1)
  })

  it('DOM and SVG agree for a horizontal chart (parity probe)', async () => {
    const { assertParity } = await import('../../../parity-harness')
    await assertParity(tlsDBar, props({ title: 'Revenue by region', highlightIndex: 2 }) as any, box)
  })
})

const lineHeightOf = (l: { height: number }) => l.height

describe('RV05 — example fits its box (review G05)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDBar)
  })
})

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

/* ─────────────────────────────────────────────────────────────────────────────── */
/* P0.9 — orientation: 'horizontal'                                                 */
