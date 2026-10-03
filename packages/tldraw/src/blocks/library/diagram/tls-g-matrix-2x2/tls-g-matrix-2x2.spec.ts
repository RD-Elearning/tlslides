/**
 * tls.g.matrix-2x2 — quadrant geometry, axes, highlight, plotted items and their labels.
 */

import { tlsGMatrix2x2 } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within } from '../diagram-test'

const SZ = { width: 1100, height: 620 }
const MIN = { width: 600, height: 380 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGMatrix2x2, props, size)
const quads = (full = false) =>
  ['A', 'B', 'C', 'D'].map((k) => ({ label: full ? `Quadrant ${k} ` + 'x'.repeat(16) : `Quad ${k}`, text: full ? 'n'.repeat(100) : `Note ${k}` }))
const axis = (full = false) => ({ low: full ? 'l'.repeat(24) : 'Low', high: full ? 'h'.repeat(24) : 'High', title: full ? 't'.repeat(30) : 'Title' })
const lattice = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ label: `Item ${i + 1}`, x: [0.1, 0.35, 0.6, 0.88][i % 4], y: [0.2, 0.5, 0.82][Math.floor(i / 4) % 3] }))
const base = (extra: Record<string, unknown> = {}, full = false) => ({ xAxis: axis(full), yAxis: axis(full), quadrants: quads(full), items: [], ...extra })

standardBlockSuite(tlsGMatrix2x2, { overflowProps: { items: lattice(13) } })

describe('tls.g.matrix-2x2', () => {
  it.each([['tinted'], ['lines']])('%s: quadrants, labels and axis text lay out at preferred and min size without overlapping', (style) => {
    for (const size of [SZ, MIN]) {
      const t = lay(base({ style, highlight: 'BR' }, true), size)
      assertChartSane(t, size)
      const q = rectsOf(t, /^q\[\d\]$/)
      expect(q).toHaveLength(4)
      assertNoOverlap(q)
      assertNoOverlap(rectsOf(t, /^(qlabel|qtext|axis-label|axis-title)\[/))
      for (const l of rectsOf(t, /^(qlabel|qtext)\[/)) expect(within(l, q[Number(/\[(\d)\]/.exec(l.part)![1])], 1)).toBe(true)
    }
  })

  it('quadrants are ordered TL, TR, BL, BR', () => {
    const q = rectsOf(lay(base()), /^q\[\d\]$/)
    expect(q[0].x).toBeLessThan(q[1].x)
    expect(q[0].y).toBe(q[1].y)
    expect(q[2].y).toBeGreaterThan(q[0].y)
    expect(q[2].x).toBe(q[0].x)
    expect(q[3].x).toBe(q[1].x)
  })

  it('12 plotted items sit inside the grid at their coordinates; dots and labels never overlap', () => {
    for (const size of [SZ, MIN]) {
      const t = lay(base({ items: lattice(12) }), size)
      assertChartSane(t, size)
      const grid = rectsOf(t, /^q\[\d\]$/)
      const gx0 = Math.min(...grid.map((g) => g.x))
      const gx1 = Math.max(...grid.map((g) => g.x + g.width))
      const dots = rectsOf(t, /^item\[\d+\]$/)
      expect(dots).toHaveLength(12)
      for (const d of dots) expect(d.x).toBeGreaterThanOrEqual(gx0)
      for (const d of dots) expect(d.x + d.width).toBeLessThanOrEqual(gx1)
      assertNoOverlap([...dots, ...rectsOf(t, /^item-label\[/)], 1)
    }
  })

  it('x/y are 0..1 with y up: a higher y is drawn higher, a higher x further right', () => {
    const t = lay(base({ items: [{ label: 'a', x: 0.1, y: 0.1 }, { label: 'b', x: 0.9, y: 0.9 }] }))
    const [a, b] = rectsOf(t, /^item\[\d+\]$/)
    expect(b.x).toBeGreaterThan(a.x)
    expect(b.y).toBeLessThan(a.y)
  })

  it('long item labels stay clipped to the grid', () => {
    const items = lattice(12).map((it) => ({ ...it, label: 'L'.repeat(24) }))
    const t = lay(base({ items }), MIN)
    // Dense long labels may touch each other (a plotted point can't move), but never leave the block.
    for (const l of rectsOf(t, /^item-label\[/)) expect(within(l, { part: 'block', x: 0, y: 0, ...MIN }, 1)).toBe(true)
    expect(JSON.stringify(t)).not.toMatch(/NaN|Infinity/)
  })

  it('highlight outlines exactly one quadrant in tinted style; none highlights nothing', () => {
    const strokes = (hl: string) => {
      const t: any = lay(base({ highlight: hl }))
      return t.children.filter((n: any) => /^q\[/.test(n.part ?? '') && n.stroke).length
    }
    expect(strokes('TR')).toBe(1)
    expect(strokes('none')).toBe(0)
  })

  it('showItems:false removes the points, showAxisTitles:false removes the axis titles', () => {
    const items = lattice(3)
    expect(rectsOf(lay(base({ items, showItems: false })), /^item/)).toHaveLength(0)
    expect(rectsOf(lay(base({ items, showAxisTitles: false })), /^axis-title/)).toHaveLength(0)
    expect(rectsOf(lay(base({ items })), /^axis-title/).length).toBeGreaterThan(0)
  })

  it('missing quadrants or hostile axes never produce NaN', () => {
    for (const p of [{ quadrants: [{ label: 'a' }] }, { xAxis: null, yAxis: 4, quadrants: quads() }, { quadrants: quads(), items: [null, { label: 'x', x: 'a', y: NaN }, { label: 'ok', x: 5, y: -3 }] }]) {
      expect(JSON.stringify(lay(p as any))).not.toMatch(/NaN|Infinity/)
    }
  })

  it('capacity: 13 items fail with a remedy', () => {
    expect(tlsGMatrix2x2.capacity!(base({ items: lattice(13) }) as any, SZ, chartCtx(SZ)).fits).toBe(false)
    expect(tlsGMatrix2x2.capacity!(base({ items: lattice(12) }) as any, SZ, chartCtx(SZ)).fits).toBe(true)
  })
})
