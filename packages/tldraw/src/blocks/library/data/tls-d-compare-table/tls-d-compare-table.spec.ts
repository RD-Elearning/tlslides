/**
 * tls.d.compare-table — check / rating / text cells, winner column, fallbacks, capacity.
 */

import { tlsDCompareTable } from './index'
import { absoluteLeaves, allNodes, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, isNoData, layoutOf, textsOf } from '../_chart/chart-test'

const SZ = { width: 1100, height: 520 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDCompareTable, props, size)
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]

standardBlockSuite(tlsDCompareTable, {
  overflowProps: { criteria: Array.from({ length: 13 }, (_, i) => `C${i}`), cells: Array.from({ length: 13 }, () => ['yes', 'no', 'yes']) },
})

describe('tls.d.compare-table', () => {
  it('missing options or criteria render "No data"', () => {
    expect(isNoData(lay({ options: [], criteria: ['a'], cells: [] }))).toBe(true)
    expect(isNoData(lay({ options: ['a'], criteria: [], cells: [] }))).toBe(true)
  })

  it('check cells: tick / cross / dash icons in positive / negative / neutral roles', () => {
    const ctx = chartCtx(SZ)
    const t = lay({ options: ['A', 'B', 'C'], criteria: ['x', 'y'], cells: [['yes', 'no', 'partial'], ['true', 'false', '~']], winner: -1 })
    const icon = (r: number, c: number) => exact(t, `row[${r}].c${c}`).node as any
    expect(icon(0, 1).fill).toBe(ctx.resolveColor('positive').color)
    expect(icon(0, 2).fill).toBe(ctx.resolveColor('negative').color)
    expect(icon(0, 3).fill).toBe(ctx.resolveColor('neutral').color)
    expect(icon(1, 1).icon).toBe(icon(0, 1).icon)
    expect(icon(0, 1).k).toBe('icon')
  })

  it('cells are centred under their option header', () => {
    const t = lay({ winner: -1 })
    const head = exact(t, 'head[1]')
    const cell = exact(t, 'row[0].c1')
    expect(cell.x + cell.width / 2).toBeCloseTo(head.x + head.width / 2, -1)
  })

  it('rating cells draw dots; a rating in a check table and a tick in a rating table both work', () => {
    const r = lay({ options: ['A', 'B'], criteria: ['x', 'y'], cells: [['4', '2'], ['yes', 'no']], cellKind: 'rating', winner: -1 })
    const dots = [0, 1, 2, 3, 4].map((i) => exact(r, `row[0].c1/dot-${i}`).node as any)
    expect(dots.filter((d) => d.fill).length).toBe(4)
    expect(exact(r, 'row[1].c1').k).toBe('icon')
    const c = lay({ options: ['A', 'B'], criteria: ['x', 'y'], cells: [['yes', '3'], ['no', 'yes']], winner: -1 })
    expect(exact(c, 'row[0].c2/dot-0')).toBeDefined()
  })

  it('free text stays text, and cellKind: text writes everything as written', () => {
    const t = lay({ options: ['A', 'B'], criteria: ['x', 'y'], cells: [['Unlimited', 'yes'], ['5 GB', 'no']], cellKind: 'text', winner: -1 })
    expect(textsOf(t)).toEqual(expect.arrayContaining(['Unlimited', 'yes', '5 GB', 'no']))
    const c = lay({ options: ['A', 'B'], criteria: ['x', 'y'], cells: [['Unlimited', 'yes'], ['5 GB', 'no']], winner: -1 })
    expect(exact(c, 'row[0].c1').k).toBe('text')
    expect(exact(c, 'row[0].c2').k).toBe('icon')
  })

  it('winner highlights that option column: accent header and a tint over every row', () => {
    const ctx = chartCtx(SZ)
    const t = lay({ winner: 1 })
    const col = exact(t, 'winner')
    const head = exact(t, 'winner.head')
    expect((head.node as any).fill.color).toBe(ctx.resolveColor('accent').color)
    for (let r = 0; r < 5; r++) {
      const cell = exact(t, `row[${r}].c2`)
      expect(cell.x).toBeGreaterThanOrEqual(col.x - 0.5)
      expect(cell.x + cell.width).toBeLessThanOrEqual(col.x + col.width + 0.5)
      expect(cell.y).toBeGreaterThanOrEqual(col.y)
    }
    // the header text of that column is readable on the accent: it is not the muted header ink
    const text = exact(t, 'head[2]').node as any
    expect(text.lines[0].runs[0].color).not.toBe(ctx.resolveColor('textMuted').color)
    expect(exact(lay({ winner: -1 }), 'winner')).toBeUndefined()
    expect(exact(lay({ winner: 9 }), 'winner')).toBeUndefined()
  })

  it('the tree is flat and every node is finite', () => {
    const t = lay({})
    for (const n of allNodes(t)) if (n.k === 'group') expect([n.box.x, n.box.y]).toEqual([0, 0])
    assertChartSane(t, SZ)
  })

  it('missing cell rows fall back to text without throwing', () => {
    const t = lay({ options: ['A', 'B'], criteria: ['x', 'y'], cells: [['yes']], winner: -1 })
    expect(exact(t, 'row[1].c2')).toBeDefined()
  })

  it('capacity: more than 12 criteria or 5 options fails; compact fits more rows', () => {
    const ctx = chartCtx(SZ)
    const crit = Array.from({ length: 10 }, (_, i) => `C${i}`)
    const cells = crit.map(() => ['yes', 'no', 'yes'])
    const a = tlsDCompareTable.capacity!({ ...(tlsDCompareTable.defaults as any), criteria: crit, cells } as any, { width: 1100, height: 520 }, ctx)
    expect(a.fits).toBe(false)
    expect(a.remedy.map((r) => r.kind)).toEqual(['reflow', 'paginate'])
    const b = tlsDCompareTable.capacity!({ ...(tlsDCompareTable.defaults as any), criteria: crit, cells, density: 'compact' } as any, { width: 1100, height: 520 }, ctx)
    expect(b.fits).toBe(true)
    const opts = tlsDCompareTable.capacity!({ ...(tlsDCompareTable.defaults as any), options: ['1', '2', '3', '4', '5', '6'] } as any, { width: 1100, height: 900 }, ctx)
    expect(opts.fits).toBe(false)
  })
})
