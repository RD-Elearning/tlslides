/**
 * tls.g.milestones — marker geometry, done state, label sides, limits.
 */

import { tlsGMilestones } from './index'
import { assertExampleFits } from '../../data/_chart/chart-test'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, assertMotionTargetsExist } from '../diagram-test'

const SZ = { width: 1200, height: 320 }
const MIN = { width: 600, height: 220 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGMilestones, props, size)
const items = (n: number, full = false) =>
  Array.from({ length: n }, (_, i) => ({ date: full ? 'D'.repeat(19) + (i % 10) : `M${i + 1}`, label: full ? `Milestone ${i} ` + 'x'.repeat(19) : `Goal ${i + 1}`, done: i < n / 2 }))

standardBlockSuite(tlsGMilestones, { overflowProps: { items: items(9) } })

describe('tls.g.milestones', () => {
  it.each([
    ['horizontal', 'alternate'],
    ['horizontal', 'below'],
    ['vertical', 'alternate'],
    ['vertical', 'below'],
  ])('%s/%s: min (2) and max (8) lay out; markers, dates and labels never overlap', (axis, labels) => {
    for (const size of axis === 'vertical' ? [{ width: 1400, height: 520 }, { width: 600, height: 340 }] : [{ width: 1400, height: 520 }, MIN]) {
      for (const n of [2, 8]) {
        const t = lay({ items: items(n, true), axis, labels }, size)
        assertChartSane(t, size)
        assertNoOverlap([...rectsOf(t, /^ms\[/), ...rectsOf(t, /^(date|label)\[/)])
        expect(rectsOf(t, /^ms\[/)).toHaveLength(n)
      }
    }
  })

  it('done markers are filled with the accent, open ones are outlined on the surface', () => {
    const t = lay({ items: items(4) })
    const n = (i: number) => absoluteLeaves(t).find((l) => l.part === `ms[${i}]`)!.node as any
    expect(n(0).stroke).toBeUndefined()
    expect(n(3).stroke).toBeDefined()
    expect(n(0).fill.color).not.toBe(n(3).fill.color)
  })

  it('the line is filled up to the last done milestone only', () => {
    const t = lay({ items: items(4) })
    const prog = rectsOf(t, /^line\.progress$/)[0]
    const ms = rectsOf(t, /^ms\[1\]$/)[0]
    expect(prog.x + prog.width).toBeCloseTo(ms.x + ms.width / 2, 0)
    expect(rectsOf(lay({ items: items(4).map((i) => ({ ...i, done: false })) }), /^line\.progress$/)).toHaveLength(0)
  })

  it('horizontal alternate swaps sides; below keeps dates above and labels below the line', () => {
    const line = rectsOf(lay({ items: items(4) }), /^line$/)[0]
    const a = lay({ items: items(4), labels: 'alternate' })
    const l = rectsOf(a, /^label\[\d\]/)
    expect(l[0].y).toBeGreaterThan(line.y)
    expect(l[1].y).toBeLessThan(line.y)
    const b = lay({ items: items(4), labels: 'below' })
    rectsOf(b, /^label\[\d\]/).forEach((r) => expect(r.y).toBeGreaterThan(line.y))
    rectsOf(b, /^date\[\d\]/).forEach((r) => expect(r.y + r.height).toBeLessThan(line.y))
  })

  it('capacity: nine items fail; eight in a narrow below layout fail with an axis remedy', () => {
    const ctx = chartCtx(SZ)
    expect(tlsGMilestones.capacity!({ items: items(9) } as any, SZ, ctx).fits).toBe(false)
    const r = tlsGMilestones.capacity!({ items: items(8), labels: 'below' } as any, { width: 600, height: 300 }, ctx)
    expect(r.fits).toBe(false)
    expect(JSON.stringify(r.remedy)).toMatch(/vertical/)
  })
})

// RV07/08: the block's own example fits size.preferred and size.min (every line as wide as its glyphs).
describe('tls.g.milestones example', () => {
  it('fits size.preferred and size.min', () => assertExampleFits(tlsGMilestones))
  it('motion parts exist in the layout and use presets that animate', () => assertMotionTargetsExist(tlsGMilestones, { optional: /^rail-y$/ }))
})
