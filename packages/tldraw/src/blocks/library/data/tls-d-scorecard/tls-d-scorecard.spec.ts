/**
 * tls.d.scorecard — status colours, target / note toggles, status styles, capacity.
 */

import { tlsDScorecard } from './index'
import { absoluteLeaves, allNodes, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, isNoData, layoutOf, textsOf } from '../_chart/chart-test'

const SZ = { width: 1200, height: 440 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDScorecard, props, size)
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const has = (t: any, prefix: string) => absoluteLeaves(t).some((l) => l.part?.startsWith(prefix))

standardBlockSuite(tlsDScorecard, { overflowProps: { items: Array.from({ length: 11 }, (_, i) => ({ label: `M${i}`, value: '1', status: 'good' })) } })

describe('tls.d.scorecard', () => {
  it('no items renders "No data"', () => {
    expect(isNoData(lay({ items: [] }))).toBe(true)
  })

  it('status dots take the positive / warning / negative roles, with the status word', () => {
    const ctx = chartCtx(SZ)
    const t = lay({ items: [{ label: 'a', value: '1', status: 'good' }, { label: 'b', value: '2', status: 'watch' }, { label: 'c', value: '3', status: 'bad' }], showNote: false })
    expect((exact(t, 'status[0]/dot').node as any).fill.color).toBe(ctx.resolveColor('positive').color)
    expect((exact(t, 'status[1]/dot').node as any).fill.color).toBe(ctx.resolveColor('warning').color)
    expect((exact(t, 'status[2]/dot').node as any).fill.color).toBe(ctx.resolveColor('negative').color)
    expect(textsOf(t)).toEqual(expect.arrayContaining(['On track', 'Watch', 'Off track']))
  })

  it('status: none draws no dot', () => {
    const t = lay({ items: [{ label: 'a', value: '1', status: 'none' }, { label: 'b', value: '2', status: 'good' }] })
    expect(exact(t, 'status[0]/dot')).toBeUndefined()
    expect(exact(t, 'status[1]/dot')).toBeDefined()
  })

  it('values are bold and right-aligned to one edge; targets too', () => {
    const t = lay({})
    const v = [0, 1, 2, 3].map((i) => exact(t, `value[${i}]`))
    for (const l of v) expect(l.x + l.width).toBeCloseTo(v[0].x + v[0].width, 3)
    expect((v[0].node as any).lines[0].runs[0].bold).toBe(true)
    const g = [0, 1, 2, 3].map((i) => exact(t, `target[${i}]`))
    for (const l of g) expect(l.x + l.width).toBeCloseTo(g[0].x + g[0].width, 3)
  })

  it('showTarget: false and showNote: false remove their columns and give the rest the width', () => {
    const full = lay({})
    const slim = lay({ showTarget: false, showNote: false })
    expect(has(slim, 'target')).toBe(false)
    expect(has(slim, 'note')).toBe(false)
    expect(exact(slim, 'value[0]').x).toBeGreaterThan(exact(full, 'value[0]').x)
  })

  it('statusStyle pill adds a tinted pill behind dot and word', () => {
    const t = lay({ statusStyle: 'pill' })
    const pill = exact(t, 'pill[0]')
    const dot = exact(t, 'status[0]/dot')
    const word = exact(t, 'status[0]/label')
    expect(pill.x).toBeLessThan(dot.x)
    expect(pill.x + pill.width).toBeGreaterThan(word.x + word.width)
    expect(pill.y).toBeLessThanOrEqual(word.y)
    expect(pill.y + pill.height).toBeGreaterThanOrEqual(word.y + word.height)
  })

  it('statusStyle bar draws a strip per row and no status column', () => {
    const ctx = chartCtx(SZ)
    const t = lay({ statusStyle: 'bar' })
    expect((exact(t, 'strip[2]').node as any).fill.color).toBe(ctx.resolveColor('negative').color)
    expect(has(t, 'status[')).toBe(false)
    expect(exact(t, 'strip[0]').x).toBe(0)
    const row = exact(t, 'label[0]')
    expect(exact(t, 'strip[0]').y).toBeLessThanOrEqual(row.y)
    expect(exact(t, 'strip[0]').y + exact(t, 'strip[0]').height).toBeGreaterThanOrEqual(row.y + row.height)
  })

  it('a long note wraps instead of overflowing, rows stay apart', () => {
    const size = { width: 800, height: 700 }
    const t = lay({ items: [{ label: 'Metric one', value: '12', status: 'good', note: 'A very long explanatory note that has to wrap onto several lines inside its column' }, { label: 'Two', value: '3', status: 'bad', note: 'x' }] }, size)
    expect((exact(t, 'note[0]').node as any).lines.length).toBeGreaterThan(1)
    assertChartSane(t, size)
  })

  it('the tree is flat', () => {
    for (const n of allNodes(lay({ statusStyle: 'pill' }))) if (n.k === 'group') expect([n.box.x, n.box.y]).toEqual([0, 0])
  })

  it('capacity: 10 rows fit a tall box, 11 never fit, a short box fails with paginate', () => {
    const ctx = chartCtx(SZ)
    const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `M${i}`, value: '1', status: 'good' }))
    expect(tlsDScorecard.capacity!({ items: mk(10) } as any, { width: 1200, height: 900 }, ctx).fits).toBe(true)
    expect(tlsDScorecard.capacity!({ items: mk(11) } as any, { width: 1200, height: 900 }, ctx).fits).toBe(false)
    const short = tlsDScorecard.capacity!({ items: mk(8) } as any, { width: 1200, height: 300 }, ctx)
    expect(short.fits).toBe(false)
    expect(short.remedy.map((r) => r.kind)).toContain('paginate')
  })
})
