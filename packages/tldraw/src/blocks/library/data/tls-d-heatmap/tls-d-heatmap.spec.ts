/**
 * tls.d.heatmap — ramps, grid geometry, value labels, empty cells, legend, capacity.
 */

import { tlsDHeatmap } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, isNoData, layoutOf, textsOf } from '../_chart/chart-test'
import { relativeLuminance, tryHexToRgb } from '../../../color-math'
import { assertExampleFits } from '../_chart/chart-test'

const SZ = { width: 900, height: 420 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDHeatmap, props, size)
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const fill = (t: any, part: string) => (exact(t, part).node as any).fill?.color as string
const lum = (hex: string) => relativeLuminance(tryHexToRgb(hex)!)

standardBlockSuite(tlsDHeatmap, { overflowProps: { rows: Array.from({ length: 13 }, (_, i) => `R${i}`), values: [] } })

describe('tls.d.heatmap', () => {
  it('no values or no labels render "No data"', () => {
    expect(isNoData(lay({ values: [] }))).toBe(true)
    expect(isNoData(lay({ rows: [], cols: ['a'], values: [[1]] }))).toBe(true)
    expect(isNoData(lay({ rows: ['a', 'b'], cols: ['x', 'y'], values: [['n', 'a']] }))).toBe(true)
  })

  it('the cell grid is rows by columns: aligned columns, aligned rows, no overlap', () => {
    const t = lay({})
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const a = exact(t, `cell[${i}].c${j}`)
      expect(a.x).toBeCloseTo(exact(t, `cell[0].c${j}`).x, 3)
      expect(a.y).toBeCloseTo(exact(t, `cell[${i}].c0`).y, 3)
      if (j > 0) expect(a.x).toBeGreaterThan(exact(t, `cell[${i}].c${j - 1}`).x + exact(t, `cell[${i}].c${j - 1}`).width - 0.01)
    }
    // column labels are centred over their cells, row labels end right before the grid
    const col = exact(t, 'col[2]')
    const cell = exact(t, 'cell[0].c2')
    expect(Math.abs(col.x + col.width / 2 - (cell.x + cell.width / 2))).toBeLessThan(1.5)
    const row = exact(t, 'row[0]')
    expect(row.x + row.width).toBeLessThanOrEqual(exact(t, 'cell[0].c0').x + 0.5)
  })

  it('accent ramp: a higher value is a stronger colour; max is the accent itself', () => {
    const ctx = chartCtx(SZ)
    const t = lay({ rows: ['a', 'b'], cols: ['x', 'y'], values: [[0, 50], [100, 25]] })
    expect(lum(fill(t, 'cell[1].c0'))).toBeLessThan(lum(fill(t, 'cell[0].c1')))
    expect(lum(fill(t, 'cell[0].c1'))).toBeLessThan(lum(fill(t, 'cell[0].c0')))
    expect(fill(t, 'cell[1].c0').toLowerCase()).toBe(ctx.resolveColor('accent').color.toLowerCase())
  })

  it('diverging ramp: negative leans negative-role, positive leans positive-role, zero is quiet', () => {
    const ctx = chartCtx(SZ)
    const t = lay({ rows: ['a', 'b'], cols: ['x', 'y'], values: [[-10, 0], [10, 5]], ramp: 'diverging' })
    expect(fill(t, 'cell[0].c0').toLowerCase()).toBe(ctx.resolveColor('negative').color.toLowerCase())
    expect(fill(t, 'cell[1].c0').toLowerCase()).toBe(ctx.resolveColor('positive').color.toLowerCase())
    expect(fill(t, 'cell[0].c1')).not.toBe(fill(t, 'cell[0].c0'))
    expect(fill(t, 'cell[0].c1')).not.toBe(fill(t, 'cell[1].c0'))
  })

  it('values print inside cells, formatted, readable on their fill; showValues: false removes them', () => {
    const t = lay({ rows: ['a', 'b'], cols: ['x', 'y'], values: [[1200, 50], [100, 25]], format: 'compact' })
    expect(textsOf(t)).toContain('1.2K')
    expect(exact(t, 'cell[0].c0.v')).toBeDefined()
    const off = lay({ showValues: false })
    expect(absoluteLeaves(off).some((l) => l.part?.endsWith('.v'))).toBe(false)
  })

  it('values are dropped when they would not fit the cells', () => {
    const rows = Array.from({ length: 12 }, (_, i) => `R${i}`)
    const cols = Array.from({ length: 12 }, (_, i) => `C${i}`)
    const t = lay({ rows, cols, values: rows.map(() => cols.map(() => 123456)) }, { width: 400, height: 300 })
    expect(absoluteLeaves(t).some((l) => l.part?.endsWith('.v'))).toBe(false)
    assertChartSane(t, { width: 400, height: 300 })
  })

  it('a missing or non-numeric value is an empty outlined cell, never NaN', () => {
    const t = lay({ rows: ['a', 'b'], cols: ['x', 'y'], values: [[1, 'n/a'], [null]] })
    expect((exact(t, 'cell[0].c1').node as any).fill).toBeUndefined()
    expect((exact(t, 'cell[0].c1').node as any).stroke).toBeDefined()
    expect(exact(t, 'cell[1].c1')).toBeDefined()
    assertChartSane(t, SZ)
  })

  it('long labels are clipped, not overflowing', () => {
    const t = lay({ rows: ['An exceptionally long row label', 'b'], cols: ['A very long column heading', 'y'], values: [[1, 2], [3, 4]] })
    assertChartSane(t, SZ)
  })

  it('legend: min, five swatches and max when tall enough; none in a short box', () => {
    const t = lay({})
    expect(exact(t, 'legend.min')).toBeDefined()
    expect(exact(t, 'legend.max')).toBeDefined()
    expect(absoluteLeaves(t).filter((l) => /^legend\.s\d$/.test(l.part ?? '')).length).toBe(5)
    expect(exact(lay({}, { width: 900, height: 200 }), 'legend.min')).toBeUndefined()
  })

  it('capacity: more than 12 rows or columns fails', () => {
    const ctx = chartCtx(SZ)
    expect(tlsDHeatmap.capacity!({ rows: Array.from({ length: 13 }, () => 'r'), cols: ['a', 'b'] } as any, SZ, ctx).fits).toBe(false)
    expect(tlsDHeatmap.capacity!({ rows: ['a', 'b'], cols: Array.from({ length: 13 }, () => 'c') } as any, SZ, ctx).fits).toBe(false)
  })
})

describe('RV05 — example fits its box (review G05)', () => {
  it('the example fits size.preferred and size.min, every label as wide as its glyphs', () => {
    assertExampleFits(tlsDHeatmap)
  })
})
