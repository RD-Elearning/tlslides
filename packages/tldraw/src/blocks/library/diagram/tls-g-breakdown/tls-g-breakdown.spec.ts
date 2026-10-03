/**
 * tls.g.breakdown — placement for both directions, brace, share parsing, limits.
 */

import { tlsGBreakdown } from './index'
import { parseAmount, shares } from './layout'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within } from '../diagram-test'

const SZ = { width: 1100, height: 520 }
const MIN = { width: 560, height: 320 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGBreakdown, props, size)
const parts = (n: number, full = false) =>
  Array.from({ length: n }, (_, i) => ({ label: full ? `Part ${i} ` + 'x'.repeat(22) : `Part ${i + 1}`, value: full ? '$1,234,567' : `$${(i + 1) * 10}k`, note: full ? 'n'.repeat(60) : `Note ${i + 1}` }))
const whole = { label: 'Total cost', value: '$120k' }

standardBlockSuite(tlsGBreakdown, { overflowProps: { parts: parts(7) } })

describe('tls.g.breakdown', () => {
  it.each([['LR'], ['TB']])('%s: 2 and 6 parts lay out at preferred and min size; whole, parts and text never overlap and stay inside their boxes', (direction) => {
    for (const size of [SZ, MIN]) {
      for (const n of [2, 6]) {
        const t = lay({ whole: { label: 'w'.repeat(30), value: 'v'.repeat(16) }, parts: parts(n, true), direction, showShare: true }, size)
        assertChartSane(t, size)
        const cards = rectsOf(t, /^(whole\[card\]|part\[\d+\]\.card)/)
        expect(cards).toHaveLength(n + 1)
        assertNoOverlap(cards)
        const cardOf = (name: string) => cards.find((c) => c.part === name)!
        for (const r of rectsOf(t, /^whole\[(label|value)\]/)) expect(within(r, cardOf('whole[card]'), 1)).toBe(true)
        for (const r of rectsOf(t, /^part\[\d+\]\.(label|value|note|share)/)) expect(within(r, cardOf(`part[${/\[(\d+)\]/.exec(r.part)![1]}].card`), 1)).toBe(true)
      }
    }
  })

  it('LR: the brace sits between the whole and the parts and parts are stacked in order', () => {
    const t = lay({ whole, parts: parts(4) })
    const w = rectsOf(t, /^whole\[card\]/)[0]
    const ps = rectsOf(t, /^part\[\d+\]\.card/)
    const br = rectsOf(t, /^bracket\[path\]/)[0]
    expect(br.x).toBeGreaterThanOrEqual(w.x + w.width - 1)
    expect(br.x + br.width).toBeLessThanOrEqual(ps[0].x + 1)
    for (let i = 1; i < 4; i++) expect(ps[i].y).toBeGreaterThan(ps[i - 1].y)
    expect(Math.abs(w.y + w.height / 2 - (ps[0].y + ps[3].y + ps[3].height) / 2)).toBeLessThan(1)
  })

  it('TB: the whole is on top, the brace under it and the parts in a row below', () => {
    const t = lay({ whole, parts: parts(3), direction: 'TB' })
    const w = rectsOf(t, /^whole\[card\]/)[0]
    const ps = rectsOf(t, /^part\[\d+\]\.card/)
    const br = rectsOf(t, /^bracket\[path\]/)[0]
    expect(br.y).toBeGreaterThanOrEqual(w.y + w.height - 1)
    expect(br.y + br.height).toBeLessThanOrEqual(ps[0].y + 1)
    for (let i = 1; i < 3; i++) expect(ps[i].x).toBeGreaterThan(ps[i - 1].x)
  })

  it('showShare adds a percentage to every part only when all values are numeric', () => {
    expect(rectsOf(lay({ whole, parts: parts(3), showShare: true }), /\.share/)).toHaveLength(3)
    expect(rectsOf(lay({ whole, parts: parts(3), showShare: false }), /\.share/)).toHaveLength(0)
    expect(rectsOf(lay({ whole, parts: [{ label: 'a', value: 'lots' }, { label: 'b', value: '10' }], showShare: true }), /\.share/)).toHaveLength(0)
  })

  it('parseAmount and shares understand currency, separators, suffixes and percentages', () => {
    expect(parseAmount('$40k')).toBe(40000)
    expect(parseAmount('1,200')).toBe(1200)
    expect(parseAmount('25%')).toBe(25)
    expect(parseAmount('3.5M')).toBe(3500000)
    expect(parseAmount('n/a')).toBeNull()
    expect(shares(['10', '30'])).toEqual([25, 75])
    expect(shares(['10', 'x'])).toBeNull()
    expect(shares(['0', '0'])).toBeNull()
  })

  it('hostile input never yields NaN', () => {
    for (const p of [{ whole: null, parts: [] }, { whole: { label: 'x' }, parts: [null, 3, { label: 'ok' }] }, { whole, parts: undefined }]) {
      expect(JSON.stringify(lay(p as any))).not.toMatch(/NaN|Infinity/)
    }
  })

  it('capacity: seven parts fail with a remedy', () => {
    expect(tlsGBreakdown.capacity!({ whole, parts: parts(7) } as any, SZ, chartCtx(SZ)).fits).toBe(false)
  })
})
