/**
 * tls.g.funnel — taper geometry, both orientations and note placements, limits.
 */

import { tlsGFunnel } from './index'
import { assertExampleFits } from '../../data/_chart/chart-test'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within, assertMotionTargetsExist } from '../diagram-test'

const SZ = { width: 1000, height: 520 }
const MIN = { width: 520, height: 320 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGFunnel, props, size)
const stages = (n: number, full = false) =>
  Array.from({ length: n }, (_, i) => ({ label: full ? `Stage ${i} ` + 'x'.repeat(21) : `Stage ${i + 1}`, text: full ? 'n'.repeat(90) : `Note ${i + 1}` }))

standardBlockSuite(tlsGFunnel, { overflowProps: { stages: stages(7) } })

describe('tls.g.funnel', () => {
  it.each([
    ['vertical', 'side'],
    ['vertical', 'inside'],
    ['horizontal', 'side'],
    ['horizontal', 'inside'],
  ])('%s/%s: min (3) and max (6) stages lay out; stages, labels and notes never overlap; text stays in its stage', (orientation, notes) => {
    for (const size of [SZ, MIN]) {
      for (const n of [3, 6]) {
        const t = lay({ stages: stages(n, true), orientation, notes }, size)
        assertChartSane(t, size)
        const shapes = rectsOf(t, /^stage\[/)
        expect(shapes).toHaveLength(n)
        assertNoOverlap(shapes)
        assertNoOverlap(rectsOf(t, /^(label|note)\[/))
        for (const l of rectsOf(t, /^label\[/)) expect(within(l, shapes[Number(/\[(\d+)\]/.exec(l.part)![1])], 1)).toBe(true)
        if (notes === 'inside') for (const l of rectsOf(t, /^note\[/)) expect(within(l, shapes[Number(/\[(\d+)\]/.exec(l.part)![1])], 1)).toBe(true)
      }
    }
  })

  it('stages narrow monotonically: every stage is no wider (vertical) / no taller (horizontal) than the one before', () => {
    const v = rectsOf(lay({ stages: stages(5) }), /^stage\[/)
    for (let i = 1; i < 5; i++) expect(v[i].width).toBeLessThanOrEqual(v[i - 1].width + 0.5)
    const h = rectsOf(lay({ stages: stages(5), orientation: 'horizontal' }), /^stage\[/)
    for (let i = 1; i < 5; i++) expect(h[i].height).toBeLessThanOrEqual(h[i - 1].height + 0.5)
  })

  it('vertical side notes sit to the right of the funnel, one per stage, on its row', () => {
    const t = lay({ stages: stages(4) })
    const shapes = rectsOf(t, /^stage\[/)
    const notes = rectsOf(t, /^note\[/)
    expect(notes).toHaveLength(4)
    notes.forEach((nn, i) => expect(nn.x).toBeGreaterThanOrEqual(shapes[0].x + shapes[0].width))
    notes.forEach((nn, i) => expect(nn.y + nn.height / 2).toBeCloseTo(shapes[i].y + shapes[i].height / 2, 0))
  })

  it('empty stages render a placeholder, never NaN', () => {
    expect(JSON.stringify(lay({ stages: [] }))).not.toMatch(/NaN|Infinity/)
    expect(JSON.stringify(lay({ stages: [{ label: 'a' }, null, 4] }))).not.toMatch(/NaN|Infinity/)
  })

  it('capacity: seven stages fail with a remedy', () => {
    expect(tlsGFunnel.capacity!({ stages: stages(7) } as any, SZ, chartCtx(SZ)).fits).toBe(false)
  })
})

// RV07/08: the block's own example fits size.preferred and size.min (every line as wide as its glyphs).
describe('tls.g.funnel example', () => {
  it('fits size.preferred and size.min', () => assertExampleFits(tlsGFunnel))
  it('motion parts exist in the layout and use presets that animate', () => assertMotionTargetsExist(tlsGFunnel))
})
