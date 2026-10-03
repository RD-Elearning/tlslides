/**
 * tls.g.bracket — three sides, two styles, placement of brace and label, limits.
 */

import { tlsGBracket } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within } from '../diagram-test'

const SZ = { width: 900, height: 460 }
const MIN = { width: 520, height: 280 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGBracket, props, size)
const items = (n: number, full = false) => Array.from({ length: n }, (_, i) => (full ? `Item ${i} ` + 'x'.repeat(50) : `Item ${i + 1}`))

standardBlockSuite(tlsGBracket, { overflowProps: { items: items(7) } })

describe('tls.g.bracket', () => {
  it.each([
    ['right', 'brace'],
    ['left', 'brace'],
    ['top', 'brace'],
    ['right', 'bracket'],
    ['top', 'bracket'],
  ])('%s/%s: 2 and 6 items lay out at preferred and min size; items, brace and label never overlap', (side, style) => {
    for (const size of [SZ, MIN]) {
      for (const n of [2, 6]) {
        const t = lay({ label: 'L'.repeat(40), items: items(n, true), side, style }, size)
        assertChartSane(t, size)
        const pills = rectsOf(t, /^item\[\d+\]$/)
        expect(pills).toHaveLength(n)
        assertNoOverlap([...pills, ...rectsOf(t, /^brace\[path\]/), ...rectsOf(t, /^label\[text\]/)])
        for (const r of rectsOf(t, /^item\[\d+\]\.text/)) expect(within(r, pills[Number(/\[(\d+)\]/.exec(r.part)![1])], 1)).toBe(true)
      }
    }
  })

  it('the brace sits between the items and the label on the chosen side', () => {
    const rx = (side: string) => {
      const t = lay({ label: 'Group', items: items(3), side })
      return { p: rectsOf(t, /^item\[0\]$/)[0], b: rectsOf(t, /^brace\[path\]/)[0], l: rectsOf(t, /^label\[text\]/)[0] }
    }
    const r = rx('right')
    expect(r.b.x).toBeGreaterThanOrEqual(r.p.x + r.p.width - 1)
    expect(r.l.x).toBeGreaterThanOrEqual(r.b.x + r.b.width - 1)
    const l = rx('left')
    expect(l.b.x + l.b.width).toBeLessThanOrEqual(l.p.x + 1)
    expect(l.l.x + l.l.width).toBeLessThanOrEqual(l.b.x + 1)
    const t = rx('top')
    expect(t.b.y).toBeGreaterThanOrEqual(t.l.y + t.l.height - 1)
    expect(t.p.y).toBeGreaterThanOrEqual(t.b.y + t.b.height - 1)
  })

  it('top places the items in one row, left to right', () => {
    const p = rectsOf(lay({ label: 'g', items: items(4), side: 'top' }), /^item\[\d+\]$/)
    for (let i = 1; i < 4; i++) {
      expect(p[i].x).toBeGreaterThan(p[i - 1].x)
      expect(p[i].y).toBe(p[0].y)
    }
  })

  it('hostile input never yields NaN', () => {
    for (const p of [{ label: '', items: [] }, { label: 'x', items: [null, 3, 'ok'] }, { items: 'nope' }]) expect(JSON.stringify(lay(p as any))).not.toMatch(/NaN|Infinity/)
  })

  it('capacity: seven items fail with a remedy', () => {
    expect(tlsGBracket.capacity!({ label: 'x', items: items(7) } as any, SZ, chartCtx(SZ)).fits).toBe(false)
  })
})
