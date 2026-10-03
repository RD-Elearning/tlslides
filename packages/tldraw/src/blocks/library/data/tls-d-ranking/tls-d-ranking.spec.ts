/**
 * tls.d.ranking — sorting, medals, bar scale, formatting, capacity.
 */

import { tlsDRanking } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, chartCtx, isNoData, layoutOf, textsOf } from '../_chart/chart-test'

const SZ = { width: 900, height: 420 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsDRanking, props, size)
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const items = [
  { label: 'Low', value: 10 },
  { label: 'High', value: 100 },
  { label: 'Mid', value: 50 },
  { label: 'Fourth', value: 5 },
]
const labelOrder = (t: any, n: number) => Array.from({ length: n }, (_, i) => (exact(t, `row[${i}].label`).node as any).lines[0].text)

standardBlockSuite(tlsDRanking, { overflowProps: { items: Array.from({ length: 11 }, (_, i) => ({ label: `E${i}`, value: i })) } })

describe('tls.d.ranking', () => {
  it('empty or non-numeric items render "No data"', () => {
    expect(isNoData(lay({ items: [] }))).toBe(true)
    expect(isNoData(lay({ items: [{ label: 'a', value: 'x' }] }))).toBe(true)
  })

  it('sort desc / asc / none decide the row order', () => {
    expect(labelOrder(lay({ items, sort: 'desc' }), 4)).toEqual(['High', 'Mid', 'Low', 'Fourth'])
    expect(labelOrder(lay({ items, sort: 'asc' }), 4)).toEqual(['Fourth', 'Low', 'Mid', 'High'])
    expect(labelOrder(lay({ items, sort: 'none' }), 4)).toEqual(['Low', 'High', 'Mid', 'Fourth'])
  })

  it('ties keep their author order', () => {
    expect(labelOrder(lay({ items: [{ label: 'A', value: 5 }, { label: 'B', value: 5 }, { label: 'C', value: 9 }] }), 3)).toEqual(['C', 'A', 'B'])
  })

  it('medals: the top three get coloured discs with their number, the rest a plain number', () => {
    const ctx = chartCtx(SZ)
    const t = lay({ items })
    const fill = (i: number) => (exact(t, `row[${i}].rank`).node as any).fill?.color
    expect(fill(0)).toBe(ctx.resolveColor('warning').color)
    expect(fill(1)).toBe(ctx.resolveColor('neutral').color)
    expect(new Set([fill(0), fill(1), fill(2)]).size).toBe(3)
    expect(fill(3)).toBeUndefined()
    expect(exact(t, 'row[0].rank.num')).toBeDefined()
    expect(textsOf(t)).toEqual(expect.arrayContaining(['1', '2', '3', '4']))
    const plain = lay({ items, medals: false })
    expect(fill.call(null, 0)).toBeDefined()
    expect((exact(plain, 'row[0].rank').node as any).fill).toBeUndefined()
  })

  it('bars share one zero-based scale: widths are proportional to the value', () => {
    const t = lay({ items })
    const track = exact(t, 'row[0].track').width
    expect(exact(t, 'row[0].bar').width).toBeCloseTo(track, 1)
    expect(exact(t, 'row[1].bar').width).toBeCloseTo(track * 0.5, 0)
    expect(exact(t, 'row[3].bar').width).toBeGreaterThan(0)
    expect(lay({ items, showBars: false }).k).toBe('group')
    expect(exact(lay({ items, showBars: false }), 'row[0].bar')).toBeUndefined()
  })

  it('the leader bar is the accent, the others a lighter tint', () => {
    const ctx = chartCtx(SZ)
    const t = lay({ items })
    expect((exact(t, 'row[0].bar').node as any).fill.color).toBe(ctx.resolveColor('accent').color)
    expect((exact(t, 'row[1].bar').node as any).fill.color).not.toBe(ctx.resolveColor('accent').color)
  })

  it('values are formatted and right-aligned to one edge; notes sit under the name', () => {
    const t = lay({ items: [{ label: 'A', value: 2500, note: 'big' }, { label: 'B', value: 12, note: '' }, { label: 'C', value: 1 }], format: 'compact' })
    expect(textsOf(t)).toContain('2.5K')
    const v = [0, 1, 2].map((i) => exact(t, `row[${i}].value`))
    for (const l of v) expect(l.x + l.width).toBeCloseTo(v[0].x + v[0].width, 3)
    expect(exact(t, 'row[0].note').y).toBeGreaterThan(exact(t, 'row[0].label').y)
    expect(exact(t, 'row[1].note')).toBeUndefined()
  })

  it('a long name is clipped to one line and stays inside the box; zero and negative values draw no bar', () => {
    const t = lay({ items: [{ label: 'An exceptionally long entry name that cannot fit its column at all', value: 9 }, { label: 'Zero', value: 0 }, { label: 'Neg', value: -4 }] })
    assertChartSane(t, SZ)
    expect((exact(t, 'row[0].label').node as any).lines.length).toBe(1)
    expect(exact(t, 'row[1].bar')).toBeUndefined()
    expect(exact(t, 'row[2].bar')).toBeUndefined()
    const three = { items: [{ label: 'A', value: 3, note: 'n' }, { label: 'B', value: 2 }, { label: 'C', value: 1 }] }
    assertChartSane(lay(three, { width: 320, height: 220 }), { width: 320, height: 220 })
  })

  it('capacity: 11 entries or too little height fails', () => {
    const ctx = chartCtx(SZ)
    expect(tlsDRanking.capacity!({ items: Array.from({ length: 8 }, (_, i) => ({ label: `${i}`, value: i })) } as any, SZ, ctx).fits).toBe(false)
    expect(tlsDRanking.capacity!({ items: Array.from({ length: 8 }, (_, i) => ({ label: `${i}`, value: i })) } as any, { width: 900, height: 640 }, ctx).fits).toBe(true)
  })
})
