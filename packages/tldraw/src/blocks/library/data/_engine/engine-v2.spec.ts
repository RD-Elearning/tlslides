/**
 * P0.6 — chart engine v2: golden-number specs for each helper, plus a byte-identity check of
 * `arcPath` against the original inline donut implementation.
 */
import { arcPath, wedgePath } from './arc-path'
import { linePath, areaPath } from './line-path'
import { formatValue } from './format-value'
import { multiSeriesDomain, bandScale } from './multi-series'
import { layoutLegend } from './legend'
import { directLabel } from './direct-label'
import { ringArcPath } from '../_chart/kit'
import { layout as donutLayout } from '../tls-d-donut/layout'
import { makeCtx } from '../../layout/test-helpers'

describe('arcPath / wedgePath', () => {
  it('quarter wedge, golden string', () => {
    expect(wedgePath(0, 0, 10, 0, Math.PI / 2, 0)).toBe(
      `M 0 0 L 10 0 A 10 10 0 0 1 ${10 * Math.cos(Math.PI / 2)} ${10 * Math.sin(Math.PI / 2)} Z`
    )
  })

  it('rInner <= 0 gives just the outer wedge', () => {
    expect(arcPath(5, 5, 4, 0, 0, 1)).toBe(wedgePath(5, 5, 4, 0, 1, 0, 1))
  })

  it('ring = outer wedge (sweep 1) + inner wedge (sweep 0)', () => {
    const d = arcPath(0, 0, 10, 4, 0, 1)
    expect(d).toBe(`${wedgePath(0, 0, 10, 0, 1, 0, 1)} ${wedgePath(0, 0, 4, 0, 1, 0, 0)}`)
    expect(d.match(/A/g)).toHaveLength(2)
  })

  it('large-arc flag follows the span, and an explicit span wins', () => {
    expect(arcPath(0, 0, 10, 0, 0, Math.PI * 1.5)).toContain('A 10 10 0 1 1')
    expect(arcPath(0, 0, 10, 0, 0, Math.PI)).toContain('A 10 10 0 0 1')
    expect(arcPath(0, 0, 10, 0, Math.PI / 2, Math.PI * 1.5 + 1e-15, Math.PI)).toContain('A 10 10 0 0 1')
  })

  it('donut layout draws each slice as ONE ringArcPath outline', () => {
    // History: this test used to pin the donut to the pre-refactor `arcPath` output (an outer wedge
    // plus a second, opposite-sweep wedge for the hole). That geometry was WRONG: SVG resolves the
    // inner wedge's reversed sweep on the mirror circle, so the hole bowed the wrong way and a
    // large or full slice rendered as a blob. The donut now uses `ringArcPath` (a single outline),
    // so the golden numbers below are the corrected geometry, not the legacy ones.
    const cases: Array<{ values: number[]; total: number; W: number; H: number }> = [
      { values: [25, 50, 25], total: 100, W: 400, H: 300 }, // exactly-half slice at a non-zero start
      { values: [10, 20, 30, 15, 25], total: 100, W: 480, H: 270 },
      { values: [33.3, 33.3, 33.4], total: 100, W: 321, H: 777 },
      { values: [70, 20], total: 100, W: 1000, H: 1000 },
      { values: [1, 2, 3, 4], total: 7, W: 250, H: 250 },
      { values: [100], total: 100, W: 300, H: 300 }, // a closed ring
    ]
    for (const c of cases) {
      const ctx = makeCtx({ width: c.W, height: c.H })
      const node = donutLayout(
        { slices: c.values.map((value, i) => ({ label: `s${i}`, value })), total: c.total } as any,
        ctx
      )
      if (node.k !== 'group') throw new Error('expected group')
      const radius = Math.min(c.W, c.H) / 2 - 10
      let a = 0
      const want = c.values.map((v) => {
        const span = (v / c.total) * Math.PI * 2
        const d = ringArcPath(c.W / 2, c.H / 2, radius, radius * 0.4, a, a + span)
        a += span
        return d
      })
      const got = node.children.map((ch) => (ch.k === 'path' ? ch.d : ''))
      expect(got).toEqual(want)
      // Single outline: no second wedge from the centre (no "M cx cy" move).
      for (const d of got) expect(d).not.toContain(`M ${c.W / 2} ${c.H / 2}`)
    }
    // The half slice keeps the small-arc flag on both arcs (large = 0), inner arc reversed.
    const half = donutLayout({ slices: [{ value: 50 }, { value: 50 }], total: 100 } as any, makeCtx({ width: 200, height: 200 }))
    if (half.k !== 'group' || half.children[0].k !== 'path') throw new Error('expected path')
    expect(half.children[0].d).toMatch(/A 90 90 0 0 1 .* A 36 36 0 0 0 /)
  })
})

describe('linePath / areaPath', () => {
  it('linear golden', () => {
    expect(linePath([{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 2.555 }])).toBe('M0 0L10 5L20 2.56')
  })
  it('empty and single point', () => {
    expect(linePath([])).toBe('')
    expect(linePath([{ x: 1, y: 2 }])).toBe('M1 2')
  })
  it('monotone with 3 collinear points keeps the control points on the line', () => {
    expect(linePath([{ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 6, y: 6 }], 'monotone')).toBe(
      'M0 0C1 1 2 2 3 3C4 4 5 5 6 6'
    )
  })
  it('monotone never overshoots a plateau', () => {
    const d = linePath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }, { x: 30, y: 0 }], 'monotone')
    // Flat middle segment: both tangents are 0, so its control points keep y = 10.
    expect(d).toContain('C13.33 10 16.67 10 20 10')
  })
  it('area walks the bottom edge back and closes', () => {
    expect(
      areaPath([{ x: 0, y: 0 }, { x: 10, y: 5 }], [{ x: 0, y: 20 }, { x: 10, y: 20 }])
    ).toBe('M0 0L10 5L10 20L0 20Z')
  })
  it('monotone area reverses control points on the bottom edge', () => {
    const d = areaPath(
      [{ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 6, y: 6 }],
      [{ x: 0, y: 10 }, { x: 3, y: 10 }, { x: 6, y: 10 }],
      'monotone'
    )
    expect(d).toBe('M0 0C1 1 2 2 3 3C4 4 5 5 6 6L6 10C5 10 4 10 3 10C2 10 1 10 0 10Z')
  })
})

describe('formatValue', () => {
  it.each([
    [1234567, 'compact', '1.2M'],
    [2500, 'compact', '2.5K'],
    [3.14159, 'compact', '3.1'],
    [3.14159, 'percent', '3.1%'],
    [1234.5, 'currency', '$1,235'],
    [42, 'plain', '42'],
    [42, undefined, '42'],
  ])('%p as %p -> %p', (v, f, out) => {
    expect(formatValue(v as number, f as string | undefined)).toBe(out)
  })
  it('currency symbol option', () => {
    expect(formatValue(1000, 'currency', { currency: 'EUR ' })).toBe('EUR 1,000')
  })
})

describe('multiSeriesDomain', () => {
  const s = [{ values: [3, -2, 5] }, { values: [4, -1, 2] }]
  it('grouped includes zero and every extreme', () => {
    expect(multiSeriesDomain(s, 'grouped')).toEqual([-2, 5])
  })
  it('stacked sums positives and negatives per category', () => {
    expect(multiSeriesDomain(s, 'stacked')).toEqual([-3, 7])
  })
  it('percent is 0..100', () => {
    expect(multiSeriesDomain(s, 'percent')).toEqual([0, 100])
  })
  it('all-positive grouped still starts at zero', () => {
    expect(multiSeriesDomain([{ values: [5, 8] }])).toEqual([0, 8])
  })
  it('empty / all-null gives [0, 1] and nulls are skipped', () => {
    expect(multiSeriesDomain([])).toEqual([0, 1])
    expect(multiSeriesDomain([{ values: [null, undefined, NaN] }])).toEqual([0, 1])
    expect(multiSeriesDomain([{ values: [null, 4] }], 'stacked')).toEqual([0, 4])
  })
})

describe('bandScale', () => {
  it('4 categories over [0,100], padding 0.2', () => {
    const b = bandScale(['a', 'b', 'c', 'd'], [0, 100], 0.2)
    expect(b.step).toBe(25)
    expect(b.bandwidth).toBe(20)
    expect(b.starts).toEqual([2.5, 27.5, 52.5, 77.5])
    expect(b.center(0)).toBe(12.5)
  })
  it('padding 0 fills the step; non-zero range origin shifts everything', () => {
    const b = bandScale(['a', 'b'], [10, 30], 0)
    expect(b.bandwidth).toBe(10)
    expect(b.starts).toEqual([10, 20])
  })
  it('no categories is safe', () => {
    const b = bandScale([], [0, 100])
    expect(b.step).toBe(0)
    expect(b.starts).toEqual([])
  })
})

describe('layoutLegend', () => {
  const ctx = makeCtx({ width: 600, height: 400 })
  const items = [
    { label: 'North', color: '#111111' },
    { label: 'South', color: '#222222' },
    { label: 'East', color: '#333333' },
  ]
  const box = { x: 0, y: 0, width: 600, height: 400 }

  it('none returns the box unchanged and no nodes', () => {
    const r = layoutLegend(items, box, ctx, 'none')
    expect(r.nodes).toEqual([])
    expect(r.plotBox).toEqual(box)
  })

  it('top: one row, swatch + label per item, plot box shrinks from the top', () => {
    const r = layoutLegend(items, box, ctx, 'top')
    expect(r.nodes.filter((n) => n.part?.startsWith('legend/swatch'))).toHaveLength(3)
    expect(r.nodes.filter((n) => n.part?.startsWith('legend/label'))).toHaveLength(3)
    const ys = new Set(r.nodes.map((n) => (n.k === 'text' ? n.box.y : null)).filter((y) => y !== null))
    expect(ys.size).toBe(1)
    expect(r.plotBox.y).toBeGreaterThan(0)
    expect(r.plotBox.y + r.plotBox.height).toBe(400)
    expect(r.plotBox.width).toBe(600)
  })

  it('bottom: plot box shrinks from the bottom and the legend sits under it', () => {
    const r = layoutLegend(items, box, ctx, 'bottom')
    expect(r.plotBox.y).toBe(0)
    const legendTop = Math.min(...r.nodes.map((n) => n.box.y))
    expect(legendTop).toBeGreaterThanOrEqual(r.plotBox.y + r.plotBox.height)
  })

  it('right: stacked column at the right edge, plot box shrinks in width', () => {
    const r = layoutLegend(items, box, ctx, 'right')
    const labelYs = r.nodes.filter((n) => n.k === 'text').map((n) => n.box.y)
    expect(new Set(labelYs).size).toBe(3)
    expect(r.plotBox.width).toBeLessThan(600)
    const legendLeft = Math.min(...r.nodes.map((n) => n.box.x))
    expect(legendLeft).toBeGreaterThanOrEqual(r.plotBox.x + r.plotBox.width)
    const legendRight = Math.max(...r.nodes.map((n) => n.box.x + n.box.width))
    expect(legendRight).toBeLessThanOrEqual(600 + 1e-9)
  })

  it('wraps to a second row when the box is narrow', () => {
    const narrow = { x: 0, y: 0, width: 140, height: 200 }
    const r = layoutLegend(items, narrow, ctx, 'top')
    const rows = new Set(r.nodes.filter((n) => n.k === 'text').map((n) => n.box.y))
    expect(rows.size).toBeGreaterThan(1)
    for (const n of r.nodes) expect(n.box.x + n.box.width).toBeLessThanOrEqual(140 + 1e-9)
  })

  it('swatches carry the item colour', () => {
    const r = layoutLegend(items, box, ctx, 'top')
    const sw = r.nodes.find((n) => n.part === 'legend/swatch-1')
    expect(sw && sw.k === 'rect' && sw.fill).toEqual({ type: 'solid', color: '#222222' })
  })
})

describe('directLabel', () => {
  const box = { x: 0, y: 0, width: 100, height: 100 }
  it('leaves well-separated labels at their anchors', () => {
    expect(directLabel([{ y: 10 }, { y: 50 }, { y: 90 }], box, { labelHeight: 10, gap: 0 })).toEqual([10, 50, 90])
  })
  it('nudges colliding labels apart, keeping order', () => {
    const ys = directLabel([{ y: 50 }, { y: 52 }, { y: 51 }], box, { labelHeight: 10, gap: 2 })
    // sorted by anchor: 50 (idx0), 51 (idx2), 52 (idx1) -> 50, 62, 74
    expect(ys).toEqual([50, 74, 62])
  })
  it('keeps labels inside the box (shifts back up at the bottom edge)', () => {
    const ys = directLabel([{ y: 95 }, { y: 96 }], box, { labelHeight: 10, gap: 0 })
    expect(ys).toEqual([80, 90])
  })
  it('packs evenly when they cannot fit', () => {
    const ys = directLabel([{ y: 1 }, { y: 2 }, { y: 3 }], { x: 0, y: 0, width: 10, height: 20 }, { labelHeight: 10, gap: 0 })
    expect(ys).toEqual([0, 5, 10])
  })
  it('empty', () => {
    expect(directLabel([], box, { labelHeight: 10 })).toEqual([])
  })
})
