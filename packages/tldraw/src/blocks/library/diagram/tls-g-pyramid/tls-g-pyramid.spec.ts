/**
 * tls.g.pyramid — slope geometry, both directions, note placements, label fallback.
 */

import { tlsGPyramid } from './index'
import { assertExampleFits } from '../../data/_chart/chart-test'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within, assertMotionTargetsExist } from '../diagram-test'

const SZ = { width: 1100, height: 560 }
const MIN = { width: 560, height: 320 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGPyramid, props, size)
const levels = (n: number, full = false) =>
  Array.from({ length: n }, (_, i) => ({ label: full ? `Level ${i} ` + 'x'.repeat(20) : `Level ${i + 1}`, text: full ? 'n'.repeat(100) : `Note ${i + 1}` }))

standardBlockSuite(tlsGPyramid, { overflowProps: { levels: levels(7) } })

describe('tls.g.pyramid', () => {
  it.each([
    ['up', 'side'],
    ['up', 'inside'],
    ['up', 'none'],
    ['down', 'side'],
    ['down', 'inside'],
    ['down', 'none'],
  ])('%s/%s: 3 and 6 levels lay out at preferred and min size; levels never overlap; text stays in place', (direction, notes) => {
    for (const size of [SZ, MIN]) {
      for (const n of [3, 6]) {
        const t = lay({ levels: levels(n, true), direction, notes }, size)
        assertChartSane(t, size)
        const shapes = rectsOf(t, /^level\[/)
        expect(shapes).toHaveLength(n)
        assertNoOverlap(shapes)
        assertNoOverlap(rectsOf(t, /^(label|side|note)\[/))
        for (const l of rectsOf(t, /^label\[/)) {
          const sh = shapes[Number(/\[(\d+)\]/.exec(l.part)![1])]
          expect(within(l, sh, 1)).toBe(true)
        }
        if (notes === 'inside') for (const l of rectsOf(t, /^note\[/)) expect(within(l, shapes[Number(/\[(\d+)\]/.exec(l.part)![1])], 1)).toBe(true)
        if (notes === 'side') {
          const right = Math.max(...shapes.map((s) => s.x + s.width))
          for (const l of rectsOf(t, /^(side|note)\[/)) expect(l.x).toBeGreaterThanOrEqual(right)
        }
      }
    }
  })

  it('widths grow monotonically from the tip (up) and shrink (down)', () => {
    const u = rectsOf(lay({ levels: levels(5) }), /^level\[/)
    for (let i = 1; i < 5; i++) expect(u[i].width).toBeGreaterThan(u[i - 1].width)
    const d = rectsOf(lay({ levels: levels(5), direction: 'down' }), /^level\[/)
    for (let i = 1; i < 5; i++) expect(d[i].width).toBeLessThan(d[i - 1].width)
  })

  it('a label too wide for its level moves to the side column instead of overflowing', () => {
    const t = lay({ levels: [{ label: 'A very long tip label here' }, { label: 'Mid' }, { label: 'Base' }] })
    expect(rectsOf(t, /^side\[0\]/)).toHaveLength(1)
    expect(rectsOf(t, /^label\[0\]/)).toHaveLength(0)
  })

  it('notes: none draws no note text and no leaders', () => {
    const t = lay({ levels: levels(4), notes: 'none' })
    expect(rectsOf(t, /^(note|leader|side)\[/)).toHaveLength(0)
  })

  it('empty or hostile levels render a placeholder, never NaN', () => {
    expect(JSON.stringify(lay({ levels: [] }))).not.toMatch(/NaN|Infinity/)
    expect(JSON.stringify(lay({ levels: [{ label: 'a' }, null, 4] }))).not.toMatch(/NaN|Infinity/)
  })

  it('capacity: seven levels fail with a remedy', () => {
    expect(tlsGPyramid.capacity!({ levels: levels(7) } as any, SZ, chartCtx(SZ)).fits).toBe(false)
  })
})

// RV07/08: the block's own example fits size.preferred and size.min (every line as wide as its glyphs).
describe('tls.g.pyramid example', () => {
  it('fits size.preferred and size.min', () => assertExampleFits(tlsGPyramid))
  it('motion parts exist in the layout and use presets that animate', () => assertMotionTargetsExist(tlsGPyramid))
})
