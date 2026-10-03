/**
 * tls.d.trend-badge — arrow direction, polarity colour, formats, sizes, label.
 */

import { tlsDTrendBadge } from './index'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../_chart/chart-test'

const SZ = { width: 320, height: 64 }
const lay = (props: Record<string, unknown>, size = SZ) => tlsDTrendBadge.layout({ ...(tlsDTrendBadge.defaults as any), ...props } as any, makeCtx(size, makeRegistry()))
const exact = (t: any, part: string) => absoluteLeaves(t).filter((l) => l.part === part)[0]
const text = (t: any, part: string) => (exact(t, part)?.node as any)?.lines.map((l: any) => l.text).join('')
const fill = (t: any) => (exact(t, 'badge').node as any).fill.color
const ys = (t: any) => [...((exact(t, 'badge.arrow').node as any).d as string).matchAll(/([\d.-]+) ([\d.-]+)/g)].map((m) => Number(m[2]))

standardBlockSuite(tlsDTrendBadge, { noCapacity: true })

describe('tls.d.trend-badge', () => {
  it('a rise points up (apex above the base), a fall points down, zero is a flat dash', () => {
    const up = ys(lay({ delta: 5 }))
    expect(up[2]).toBeLessThan(up[0])
    const down = ys(lay({ delta: -5 }))
    expect(down[2]).toBeGreaterThan(down[0])
    expect(exact(lay({ delta: 0 }), 'badge.arrow').k).toBe('rect')
  })

  it('formats: percent appends %, plain and compact do not', () => {
    expect(text(lay({ delta: 12.5, format: 'percent' }), 'badge.text')).toBe('+12.5%')
    expect(text(lay({ delta: -3, format: 'plain' }), 'badge.text')).toBe('-3')
    expect(text(lay({ delta: 2500, format: 'compact' }), 'badge.text')).toBe('+2.5K')
  })

  it('polarity decides the colour: a rise is good for upGood, bad for downGood; neutral differs from both', () => {
    const c = (polarity: string) => fill(lay({ delta: 4, polarity }))
    expect(new Set([c('upGood'), c('downGood'), c('neutral')]).size).toBe(3)
    expect(fill(lay({ delta: 4, polarity: 'upGood' }))).toBe(fill(lay({ delta: -4, polarity: 'downGood' })))
    expect(fill(lay({ delta: 0, polarity: 'upGood' }))).toBe(c('neutral'))
  })

  it('size sm < md < lg in pill height', () => {
    const h = (size: string) => exact(lay({ size }, { width: 400, height: 120 }), 'badge').height
    expect(h('sm')).toBeLessThan(h('md'))
    expect(h('md')).toBeLessThan(h('lg'))
  })

  it('the label follows the pill and is optional', () => {
    const t = lay({ label: 'vs last year' })
    const pill = exact(t, 'badge')
    expect(exact(t, 'badge.label').x).toBeGreaterThanOrEqual(pill.x + pill.width)
    expect(exact(lay({ label: '' }), 'badge.label')).toBeUndefined()
  })

  it('text sits inside the pill; a long label and a tiny box stay inside the box', () => {
    const t = lay({ label: 'a very long label that cannot possibly fit' })
    const pill = exact(t, 'badge')
    const tx = exact(t, 'badge.text')
    expect(tx.x + tx.width).toBeLessThanOrEqual(pill.x + pill.width + 1)
    assertChartSane(t, SZ)
    assertChartSane(lay({ label: '' }, { width: 90, height: 30 }), { width: 90, height: 30 })
  })

  it('NaN and missing deltas read as no change', () => {
    expect(text(lay({ delta: NaN, format: 'plain' }), 'badge.text')).toBe('0')
  })
})
