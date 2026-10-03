/**
 * tls.g.iceberg — waterline, tip and mass geometry, text placement, limits.
 */

import { tlsGIceberg } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within } from '../diagram-test'

const SZ = { width: 1000, height: 560 }
const MIN = { width: 560, height: 320 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGIceberg, props, size)
const items = (n: number, full = false) => Array.from({ length: n }, (_, i) => (full ? `Item ${i} ` + 'x'.repeat(32) : `Item ${i + 1}`))

standardBlockSuite(tlsGIceberg, { overflowProps: { below: { label: 'x', items: items(7) } } })

describe('tls.g.iceberg', () => {
  it.each([['third'], ['half']])('waterline=%s: 1 to 4 above and 1 to 6 below lay out at preferred and min size; texts stay in their half and never overlap', (waterline) => {
    for (const size of [SZ, MIN]) {
      for (const [na, nb] of [[1, 1], [4, 6], [2, 3]]) {
        const t = lay({ above: { label: 'Visible', items: items(na, true) }, below: { label: 'Hidden', items: items(nb, true) }, waterline }, size)
        assertChartSane(t, size)
        const wl = rectsOf(t, /^water\[line\]/)[0].y + 1.5
        for (const r of rectsOf(t, /^above\[(label|item)/)) expect(r.y + r.height).toBeLessThanOrEqual(wl + 1)
        for (const r of rectsOf(t, /^below\[(label|item)/)) expect(r.y).toBeGreaterThanOrEqual(wl - 1)
        assertNoOverlap(rectsOf(t, /^(above|below)\[(label|item)/))
        const shape = rectsOf(t, /^below\[shape\]/)[0]
        for (const r of rectsOf(t, /^below\[(label|item)/)) expect(within(r, shape, 1)).toBe(true)
      }
    }
  })

  it('the waterline is at a third or at half the height, the tip above it and the mass below', () => {
    const y = (w: string) => rectsOf(lay({ waterline: w }), /^water\[line\]/)[0].y
    expect(y('third')).toBeLessThan(SZ.height * 0.4)
    expect(y('half')).toBeCloseTo(SZ.height * 0.5 - 1.5, 0)
    const t = lay({ waterline: 'third' })
    const wl = y('third') + 1.5
    expect(rectsOf(t, /^above\[shape\]/)[0].y + rectsOf(t, /^above\[shape\]/)[0].height).toBeLessThanOrEqual(wl + 1)
    expect(rectsOf(t, /^below\[shape\]/)[0].y).toBeGreaterThanOrEqual(wl - 1)
  })

  it('more than three hidden items go into two columns', () => {
    const xs = (n: number) => new Set(rectsOf(lay({ below: { label: 'h', items: items(n) } }), /^below\[item\]/).map((r) => Math.round(r.x))).size
    expect(xs(3)).toBe(1)
    expect(xs(4)).toBe(2)
  })

  it('hostile input never yields NaN', () => {
    for (const p of [{ above: null, below: null }, { above: { label: 'a', items: [null, 3, 'ok'] }, below: { items: 'x' } }, { above: { label: 'a', items: [] }, below: { label: 'b', items: [] } }]) {
      expect(JSON.stringify(lay(p as any))).not.toMatch(/NaN|Infinity/)
    }
  })

  it('capacity: five above or seven below fail with a remedy', () => {
    const cap = (a: number, b: number) => tlsGIceberg.capacity!({ above: { label: 'a', items: items(a) }, below: { label: 'b', items: items(b) } } as any, SZ, chartCtx(SZ))
    expect(cap(4, 6).fits).toBe(true)
    expect(cap(5, 6).fits).toBe(false)
    expect(cap(4, 7).fits).toBe(false)
  })
})
