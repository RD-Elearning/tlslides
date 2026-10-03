/**
 * tls.g.pros-cons — columns, marks, balance, verdict, limits.
 */

import { tlsGProsCons } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within } from '../diagram-test'

const SZ = { width: 1100, height: 560 }
const MIN = { width: 560, height: 340 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGProsCons, props, size)
const pts = (n: number, full = false) => Array.from({ length: n }, (_, i) => (full ? `Point ${i} ` + 'x'.repeat(80) : `Point ${i + 1}`))

standardBlockSuite(tlsGProsCons, { overflowProps: { pros: pts(7) } })

describe('tls.g.pros-cons', () => {
  it.each([
    ['columns', 'equal'],
    ['columns', 'auto'],
    ['cards', 'equal'],
    ['cards', 'auto'],
  ])('%s/%s: 1 and 6 points per side lay out at preferred and min size; rows never overlap; text stays in its column', (style, balance) => {
    for (const size of [SZ, MIN]) {
      for (const [np, nc] of [[1, 1], [6, 6], [6, 1]]) {
        const t = lay({ pros: pts(np, true), cons: pts(nc, true), verdict: 'v'.repeat(120), style, balance }, size)
        assertChartSane(t, size)
        assertNoOverlap(rectsOf(t, /^(pros|cons)\[(mark|text)\]/))
        const pm = rectsOf(t, /^pros\[text\]/)
        const cm = rectsOf(t, /^cons\[text\]/)
        expect(pm).toHaveLength(np)
        expect(cm).toHaveLength(nc)
        const split = Math.max(...pm.map((r) => r.x + r.width))
        for (const r of cm) expect(r.x).toBeGreaterThanOrEqual(split)
      }
    }
  })

  it('pros use the positive role colour and cons the negative one', () => {
    const t: any = lay({ pros: ['a'], cons: ['b'] })
    const fills = (name: string) =>
      t.children.find((g: any) => g.part === name).children.filter((n: any) => /\[mark\]/.test(n.part ?? '')).map((n: any) => n.fill.color)
    expect(fills('pros')[0]).not.toBe(fills('cons')[0])
  })

  it('verdict sits below both columns; showVerdict:false or an empty verdict removes it', () => {
    const t = lay({ pros: pts(4), cons: pts(4), verdict: 'Do it.' })
    const v = rectsOf(t, /^verdict\[text\]/)[0]
    for (const r of rectsOf(t, /^(pros|cons)\[(text|mark)\]/)) expect(r.y + r.height).toBeLessThanOrEqual(v.y + 1)
    expect(rectsOf(lay({ pros: pts(2), cons: pts(2), verdict: 'x', showVerdict: false }), /^verdict/)).toHaveLength(0)
    expect(rectsOf(lay({ pros: pts(2), cons: pts(2), verdict: '' }), /^verdict/)).toHaveLength(0)
  })

  it('custom headings are used, defaults are Pros and Cons', () => {
    const joined = (p: Record<string, unknown>) => JSON.stringify(lay(p))
    expect(joined({ pros: ['a'], cons: ['b'], prosTitle: 'Upsides', consTitle: 'Downsides' })).toContain('Upsides')
    expect(joined({ pros: ['a'], cons: ['b'] })).toContain('Pros')
  })

  it('auto balance widens the column with more text', () => {
    const w = (balance: string) => {
      const t = lay({ pros: pts(6, true), cons: ['short'], balance, style: 'cards' })
      return rectsOf(t, /^(pros|cons)\[card\]/).map((r) => r.width)
    }
    expect(w('equal')[0]).toBeCloseTo(w('equal')[1], 0)
    expect(w('auto')[0]).toBeGreaterThan(w('auto')[1])
  })

  it('hostile input never yields NaN', () => {
    for (const p of [{ pros: [], cons: [] }, { pros: [null, 3, 'ok'], cons: 'x' }, { pros: undefined, cons: undefined }]) {
      expect(JSON.stringify(lay(p as any))).not.toMatch(/NaN|Infinity/)
    }
  })

  it('capacity: seven points on a side fail with a remedy', () => {
    expect(tlsGProsCons.capacity!({ pros: pts(7), cons: pts(1) } as any, SZ, chartCtx(SZ)).fits).toBe(false)
  })
})
