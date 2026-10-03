/**
 * tls.g.layers — bars and slabs, note placement, limits.
 */

import { tlsGLayers } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within } from '../diagram-test'

const SZ = { width: 1000, height: 560 }
const MIN = { width: 560, height: 320 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGLayers, props, size)
const layers = (n: number, full = false) =>
  Array.from({ length: n }, (_, i) => ({ label: full ? `Layer ${i} ` + 'x'.repeat(20) : `Layer ${i + 1}`, text: full ? 'n'.repeat(100) : `Note ${i + 1}`, icon: i % 2 ? 'server' : 'cloud' }))

standardBlockSuite(tlsGLayers, { overflowProps: { layers: layers(8) } })

describe('tls.g.layers', () => {
  it.each([
    ['flat', 'inside'],
    ['flat', 'side'],
    ['perspective', 'inside'],
    ['perspective', 'side'],
  ])('%s/%s: 2 and 7 layers lay out at preferred and min size; layers never overlap; text stays in place', (style, notes) => {
    for (const size of [SZ, MIN]) {
      for (const n of [2, 7]) {
        const t = lay({ layers: layers(n, true), style, notes }, size)
        assertChartSane(t, size)
        const bars = rectsOf(t, /^layer\[/)
        expect(bars).toHaveLength(n)
        assertNoOverlap(bars)
        for (const l of rectsOf(t, /^(label|icon)\[/)) expect(within(l, bars[Number(/\[(\d+)\]/.exec(l.part)![1])], 1)).toBe(true)
        if (notes === 'inside') for (const l of rectsOf(t, /^note\[/)) expect(within(l, bars[Number(/\[(\d+)\]/.exec(l.part)![1])], 1)).toBe(true)
        else {
          const right = Math.max(...bars.map((b) => b.x + b.width))
          for (const l of rectsOf(t, /^note\[/)) expect(l.x).toBeGreaterThanOrEqual(right)
        }
      }
    }
  })

  it('layers are stacked in the given order, top first, all the same size', () => {
    const bars = rectsOf(lay({ layers: layers(5) }), /^layer\[/)
    for (let i = 1; i < 5; i++) expect(bars[i].y).toBeGreaterThan(bars[i - 1].y)
    for (const b of bars) expect(b.height).toBeCloseTo(bars[0].height, 3)
  })

  it('perspective slabs are slanted: the path is not an axis-aligned rectangle', () => {
    const t: any = lay({ layers: layers(3), style: 'perspective' })
    const d = t.children.find((n: any) => n.part === 'layer[0]').d as string
    const xs = [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => Number(m[1]))
    expect(new Set(xs).size).toBeGreaterThan(2)
  })

  it('side notes get a leader line per noted layer', () => {
    expect(rectsOf(lay({ layers: layers(4), notes: 'side' }), /^leader\[/)).toHaveLength(4)
    expect(rectsOf(lay({ layers: layers(4), notes: 'inside' }), /^leader\[/)).toHaveLength(0)
  })

  it('hostile input never yields NaN', () => {
    for (const p of [{ layers: [] }, { layers: [null, 3, { label: 'ok' }] }]) expect(JSON.stringify(lay(p as any))).not.toMatch(/NaN|Infinity/)
  })

  it('capacity: eight layers fail with a remedy', () => {
    expect(tlsGLayers.capacity!({ layers: layers(8) } as any, SZ, chartCtx(SZ)).fits).toBe(false)
  })
})
