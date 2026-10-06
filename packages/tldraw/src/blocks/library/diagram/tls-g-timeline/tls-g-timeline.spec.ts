/**
 * tls.g.timeline — card placement without overlap, alternate sides, now marker, limits.
 */

import { tlsGTimeline } from './index'
import { assertExampleFits } from '../../data/_chart/chart-test'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, type Rect, assertMotionTargetsExist } from '../diagram-test'

const SZ = { width: 1400, height: 520 }
const MIN = { width: 640, height: 360 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGTimeline, props, size)
const events = (n: number, full = false) =>
  Array.from({ length: n }, (_, i) => ({
    date: full ? 'D'.repeat(19) + i % 10 : `${2020 + i}`,
    title: full ? `Title ${i} ` + 't'.repeat(30) : `Event ${i + 1}`,
    text: full ? 'Some note text here. '.repeat(5).slice(0, 110) : `Note for event ${i + 1}`,
    icon: 'check',
  }))

standardBlockSuite(tlsGTimeline, { overflowProps: { events: events(9) } })

/** One rect per card: the union of its date, title and text. */
function cards(t: any, n: number, withDate = true): Rect[] {
  const out: Rect[] = []
  for (let i = 0; i < n; i++) {
    const r = rectsOf(t, new RegExp(`^(${withDate ? 'date|' : ''}title|text)\\[${i}\\]`))
    if (!r.length) continue
    const x = Math.min(...r.map((q) => q.x))
    const y = Math.min(...r.map((q) => q.y))
    out.push({ part: `card[${i}]`, x, y, width: Math.max(...r.map((q) => q.x + q.width)) - x, height: Math.max(...r.map((q) => q.y + q.height)) - y })
  }
  return out
}
const nodesOf = (t: any) => rectsOf(t, /^node\[\d+\]$/)

describe('tls.g.timeline', () => {
  it.each([
    ['horizontal alternate', { axis: 'horizontal', alternate: true }, 8],
    ['horizontal one side', { axis: 'horizontal', alternate: false }, 4],
    ['vertical one side', { axis: 'vertical', alternate: false }, 8],
    ['vertical alternate', { axis: 'vertical', alternate: true }, 8],
  ])('%s: cards and nodes never overlap and stay in the box, min and max counts, preferred and min size', (_n, opts, max) => {
    for (const size of [SZ, MIN]) {
      for (const n of [3, max as number]) {
        const t = lay({ events: events(n, true), ...opts }, size)
        assertChartSane(t, size)
        const oneSideV = (opts as any).axis === 'vertical' && !(opts as any).alternate
        assertNoOverlap(cards(t, n, !oneSideV))
        assertNoOverlap([...cards(t, n, !oneSideV), ...nodesOf(t)])
        if (oneSideV) assertNoOverlap([...rectsOf(t, /^date\[/), ...nodesOf(t)])
        expect(nodesOf(t)).toHaveLength(n)
      }
    }
  })

  it('alternate puts even events above the axis and odd below (horizontal)', () => {
    const t = lay({ events: events(6), axis: 'horizontal', alternate: true })
    const axis = rectsOf(t, /^axis$/)[0]
    const c = cards(t, 6)
    c.forEach((r, i) => (i % 2 === 0 ? expect(r.y + r.height).toBeLessThanOrEqual(axis.y) : expect(r.y).toBeGreaterThanOrEqual(axis.y + axis.height)))
  })

  it('non-alternate puts every card on one side, in date order left to right', () => {
    const t = lay({ events: events(4), axis: 'horizontal', alternate: false })
    const c = cards(t, 4)
    for (let i = 0; i < 3; i++) expect(c[i + 1].x).toBeGreaterThan(c[i].x)
    expect(new Set(c.map((r) => Math.round(r.y))).size).toBe(1)
  })

  it('nowIndex mutes later events and only fills the axis up to the latest reached', () => {
    const t = lay({ events: events(4), nowIndex: 1 })
    const fill = (part: string) => (absoluteLeaves(t).find((l) => l.part === part)!.node as any).fill.color
    const tcol = (part: string) => (absoluteLeaves(t).find((l) => l.part === part)!.node as any).style.color
    expect(fill('node[0]')).not.toBe(fill('node[3]'))
    expect(fill('node[0]')).toBe(fill('node[1]'))
    expect(tcol('title[1]')).not.toBe(tcol('title[2]'))
    const prog = rectsOf(t, /^axis\.progress$/)[0]
    const n1 = nodesOf(t)[1]
    expect(prog.x + prog.width).toBeCloseTo(n1.x + n1.width / 2, 0)
    expect(rectsOf(lay({ events: events(4), nowIndex: -1 }), /^axis\.progress$/)).toHaveLength(0)
  })

  it('node styles: dot has no inner mark, number prints the index, icon draws the icon', () => {
    const has = (style: string, re: RegExp) => absoluteLeaves(lay({ events: events(3), nodeStyle: style })).some((l) => re.test(l.part ?? ''))
    expect(has('dot', /^(num|icon)\[/)).toBe(false)
    expect(has('number', /^num\[0\]/)).toBe(true)
    expect(has('icon', /^icon\[0\]/)).toBe(true)
  })

  it('showText off removes the notes and gives the titles the room', () => {
    expect(rectsOf(lay({ events: events(4), showText: false }), /^text\[/)).toHaveLength(0)
  })

  it('capacity: the horizontal width limit follows the card width; vertical or alternate is the remedy', () => {
    const ctx = chartCtx(SZ)
    const six = { events: events(8), axis: 'horizontal', alternate: false } as any
    const r = tlsGTimeline.capacity!(six, SZ, ctx)
    expect(r.fits).toBe(false)
    expect(JSON.stringify(r.remedy)).toMatch(/alternate/)
    expect(tlsGTimeline.capacity!({ ...six, alternate: true }, SZ, ctx).fits).toBe(true)
    expect(tlsGTimeline.capacity!({ ...six, alternate: true, events: events(9) }, SZ, ctx).fits).toBe(false)
  })
})

// RV07/08: the block's own example fits size.preferred and size.min (every line as wide as its glyphs).
describe('tls.g.timeline example', () => {
  it('fits size.preferred and size.min', () => assertExampleFits(tlsGTimeline))
  it('motion parts exist in the layout and use presets that animate', () => assertMotionTargetsExist(tlsGTimeline))
})
