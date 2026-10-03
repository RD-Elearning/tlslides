/**
 * tls.g.chevrons — nesting geometry, highlight, fills, text placement, limits.
 */

import { tlsGChevrons } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { allText, assertNoOverlap, layoutOf, rectsOf, within, chartCtx } from '../diagram-test'

const SZ = { width: 1200, height: 300 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGChevrons, props, size)
const steps = (n: number, long = false) =>
  Array.from({ length: n }, (_, i) => ({ label: long ? `A rather long phase label ${i + 1} xx` : `Phase ${i + 1}`, text: long ? 'n'.repeat(86) : `Note ${i + 1}` }))
const fillOf = (t: any, part: string) => (absoluteLeaves(t).find((l) => l.part === part)!.node as any).fill.color

standardBlockSuite(tlsGChevrons, { overflowProps: { steps: steps(8) } })

describe('tls.g.chevrons', () => {
  it('segments nest: each head stays clear of the next tail and the row spans the box', () => {
    const t = lay({ steps: steps(5) })
    const r = rectsOf(t, /^chevron\[/)
    expect(r).toHaveLength(5)
    for (let i = 0; i < 4; i++) expect(r[i + 1].x).toBeGreaterThan(r[i].x + r[i].width * 0.6)
    expect(r[0].x).toBeCloseTo(0, 0)
    expect(r[4].x + r[4].width).toBeCloseTo(SZ.width, 0)
  })

  it('min (3) and max (7) counts lay out; every label and note stays inside its chevron', () => {
    for (const n of [3, 7]) {
      for (const placement of ['inside', 'below']) {
        const t = lay({ steps: steps(n, true), textPlacement: placement })
        assertChartSane(t, SZ)
        const chev = rectsOf(t, /^chevron\[/)
        const labels = rectsOf(t, /^label\[/)
        labels.forEach((l) => {
          const i = Number(/\[(\d+)\]/.exec(l.part)![1])
          expect(within(l, chev[i])).toBe(true)
        })
        if (placement === 'inside') rectsOf(t, /^text\[/).forEach((l) => expect(within(l, chev[Number(/\[(\d+)\]/.exec(l.part)![1])])).toBe(true))
      }
    }
  })

  it('texts never overlap each other at the preferred and minimum size', () => {
    for (const size of [SZ, { width: 600, height: 160 }]) {
      const t = lay({ steps: steps(6, true) }, size)
      assertNoOverlap(rectsOf(t, /^(label|text)\[/))
    }
  })

  it('currentIndex keeps one full colour and tints the others; -1 and out-of-range tint nothing', () => {
    const none = lay({ steps: steps(4), currentIndex: -1 })
    const hi = lay({ steps: steps(4), currentIndex: 2 })
    const out = lay({ steps: steps(4), currentIndex: 9 })
    expect(fillOf(out, 'chevron[1]')).toBe(fillOf(none, 'chevron[1]'))
    expect(fillOf(hi, 'chevron[2]')).toBe(fillOf(none, 'chevron[2]'))
    expect(fillOf(hi, 'chevron[1]')).not.toBe(fillOf(none, 'chevron[1]'))
  })

  it('fill modes: gradient varies, single is constant, series follows the categorical ramp', () => {
    const f = (fill: string) => [0, 1, 2].map((i) => fillOf(lay({ steps: steps(3), fill }), `chevron[${i}]`))
    expect(new Set(f('gradient')).size).toBe(3)
    expect(new Set(f('single')).size).toBe(1)
    expect(f('series')).toEqual(chartCtx(SZ).tokens.categorical.slice(0, 3))
  })

  it('textPlacement below puts notes under the chevrons', () => {
    const t = lay({ steps: steps(4), textPlacement: 'below' })
    const chev = rectsOf(t, /^chevron\[0\]/)[0]
    const note = rectsOf(t, /^text\[0\]/)[0]
    expect(note.y).toBeGreaterThanOrEqual(chev.y + chev.height)
  })

  it('empty steps render a muted placeholder, never NaN', () => {
    expect(JSON.stringify(lay({ steps: [] }))).not.toMatch(/NaN|Infinity/)
  })

  it('capacity: eight phases fail with a remedy; a tiny box fails too', () => {
    const ctx = chartCtx(SZ)
    expect(tlsGChevrons.capacity!({ steps: steps(8) } as any, SZ, ctx).fits).toBe(false)
    expect(tlsGChevrons.capacity!({ steps: steps(7) } as any, { width: 300, height: 160 }, ctx).fits).toBe(false)
  })
})
