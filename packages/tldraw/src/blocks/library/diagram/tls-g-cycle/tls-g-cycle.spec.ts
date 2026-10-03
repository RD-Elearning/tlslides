/**
 * tls.g.cycle — ring geometry, both node styles, arrows, direction, limits.
 */

import { tlsGCycle } from './index'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { allText, assertNoOverlap, layoutOf, overlap, rectsOf, chartCtx } from '../diagram-test'

const SZ = { width: 900, height: 620 }
const MIN = { width: 640, height: 440 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGCycle, props, size)
const steps = (n: number, long = false) =>
  Array.from({ length: n }, (_, i) => ({ label: long ? `Long step label ${i + 1} xxxxxxx` : `Step ${i + 1}`, text: long ? 'n'.repeat(78) : `Note ${i + 1}`, icon: i % 2 ? 'check' : '' }))

standardBlockSuite(tlsGCycle, { overflowProps: { steps: steps(7) } })

const nodes = (t: any) => rectsOf(t, /^node\[\d+\]$/)

describe('tls.g.cycle', () => {
  it.each([['circle'], ['card']])('%s: min (3) and max (6) steps lay out with no node, label or note overlapping, at preferred and min size', (nodeStyle) => {
    for (const size of [SZ, MIN]) {
      for (const n of [3, 4, 5, 6]) {
        const t = lay({ steps: steps(n, true), nodeStyle }, size)
        assertChartSane(t, size)
        expect(nodes(t)).toHaveLength(n)
        assertNoOverlap([...nodes(t), ...rectsOf(t, nodeStyle === 'card' ? /^center$/ : /^(label|text|center)(\[|$|\.)/)], 1)
      }
    }
  })

  it('card text sits inside its card', () => {
    const t = lay({ steps: steps(5, true), nodeStyle: 'card' })
    const n = nodes(t)
    for (const r of rectsOf(t, /^(label|text)\[/)) {
      const i = Number(/\[(\d+)\]/.exec(r.part)![1])
      expect(r.x).toBeGreaterThanOrEqual(n[i].x - 1)
      expect(r.x + r.width).toBeLessThanOrEqual(n[i].x + n[i].width + 1)
      expect(r.y + r.height).toBeLessThanOrEqual(n[i].y + n[i].height + 1)
    }
  })

  it('the first step is at 12 o\'clock and the rest follow clockwise (counter reverses)', () => {
    const cw = nodes(lay({ steps: steps(4) }))
    const ccw = nodes(lay({ steps: steps(4), direction: 'counter' }))
    const mid = SZ.width / 2
    expect(cw[0].x + cw[0].width / 2).toBeCloseTo(mid, 0)
    expect(cw[1].x).toBeGreaterThan(mid)
    expect(ccw[1].x).toBeLessThan(mid)
  })

  it('arrows start and end outside every node box, one per gap, with a head each', () => {
    for (const nodeStyle of ['circle', 'card']) {
      const t = lay({ steps: steps(5), nodeStyle })
      const n = nodes(t)
      const arcs = absoluteLeaves(t).filter((l) => /^arrow\[\d+\]$/.test(l.part ?? ''))
      expect(arcs).toHaveLength(5)
      expect(absoluteLeaves(t).filter((l) => /^arrow\[\d+\]\.head$/.test(l.part ?? ''))).toHaveLength(5)
      for (const a of arcs) {
        const nums = [...((a.node as any).d as string).matchAll(/(-?[\d.]+) (-?[\d.]+)/g)]
        const pts = [nums[0], nums[nums.length - 1]].map((m) => ({ part: 'pt', x: Number(m![1]) - 0.5, y: Number(m![2]) - 0.5, width: 1, height: 1 }))
        for (const p of pts) {
          for (const b of n) {
            if (nodeStyle === 'circle') expect(Math.hypot(p.x + 0.5 - (b.x + b.width / 2), p.y + 0.5 - (b.y + b.height / 2))).toBeGreaterThanOrEqual(b.width / 2)
            else expect(overlap(p, b, 0)).toBe(0)
          }
        }
      }
    }
  })

  it('arrowStyle none draws no arrows; showText/showCenter off drop the text', () => {
    const t = lay({ steps: steps(4), arrowStyle: 'none' })
    expect(absoluteLeaves(t).some((l) => (l.part ?? '').startsWith('arrow'))).toBe(false)
    const bare = lay({ steps: steps(4), showText: false, showCenter: false, center: 'Hub' })
    expect(allText(bare).join(' ')).not.toMatch(/Note|Hub/)
  })

  it('icons replace the numbers inside circle nodes', () => {
    const t = lay({ steps: steps(4) })
    expect(absoluteLeaves(t).some((l) => l.part === 'icon[1]')).toBe(true)
    expect(absoluteLeaves(t).some((l) => l.part === 'num[0]')).toBe(true)
    expect(absoluteLeaves(t).some((l) => l.part === 'num[1]')).toBe(false)
  })

  it('capacity: seven steps fail', () => {
    expect(tlsGCycle.capacity!({ steps: steps(7) } as any, SZ, chartCtx(SZ)).fits).toBe(false)
  })
})
