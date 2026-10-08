/**
 * tls.g.mindmap — sides, columns, links, density limits.
 */

import { tlsGMindmap } from './index'
import { assertExampleFits } from '../../data/_chart/chart-test'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within, assertMotionTargetsExist } from '../diagram-test'

const SZ = { width: 1200, height: 620 }
const MIN = { width: 600, height: 340 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGMindmap, props, size)
const br = (n: number, k: number, full = false) =>
  Array.from({ length: n }, (_, i) => ({ label: full ? `Topic ${i} ` + 'x'.repeat(15) : `Topic ${i + 1}`, children: Array.from({ length: k }, (_, j) => (full ? `Sub ${j} ` + 'y'.repeat(16) : `Sub ${j + 1}`)) }))

standardBlockSuite(tlsGMindmap, { overflowProps: { branches: br(7, 1) } })

describe('tls.g.mindmap', () => {
  it.each([['both'], ['right']])('balance=%s: counts from 2x0 to 6x4 lay out; nodes never overlap and text stays inside its node', (balance) => {
    for (const size of [SZ, MIN]) {
      for (const [n, k] of [[2, 0], [3, 2], [6, 2], [6, 4]]) {
        if (size === MIN && n * k > 12 && balance === 'right') continue
        const t = lay({ center: 'Central idea', branches: br(n, k, true), balance }, size)
        assertChartSane(t, size)
        const boxes = rectsOf(t, /^(center|branch\[\d+\]|child\[\d+\]\[\d+\])$/)
        expect(boxes.length).toBe(1 + n + n * k)
        assertNoOverlap(boxes, 0.5)
        for (const r of rectsOf(t, /\.label$/)) {
          const owner = r.part.replace(/\.label$/, '')
          const box = boxes.find((b) => b.part === owner)!
          expect(within(r, box, 1.5)).toBe(true)
        }
      }
    }
  })

  it('both sides: half of the branches sit left of the centre and half right; right: all on the right', () => {
    const t = lay({ center: 'c', branches: br(4, 1), balance: 'both' })
    const c = rectsOf(t, /^center$/)[0]
    const bs = rectsOf(t, /^branch\[\d+\]$/)
    expect(bs.filter((b) => b.x > c.x).length).toBe(2)
    expect(bs.filter((b) => b.x + b.width < c.x + 1).length).toBe(2)
    const r = lay({ center: 'c', branches: br(4, 1), balance: 'right' })
    const c2 = rectsOf(r, /^center$/)[0]
    for (const b of rectsOf(r, /^branch\[\d+\]$/)) expect(b.x).toBeGreaterThanOrEqual(c2.x + c2.width)
  })

  it('subtopics are further out than their topic; one link per topic and per subtopic', () => {
    const t = lay({ center: 'c', branches: br(3, 2), balance: 'right' })
    const links = rectsOf(t, /^link\[/)
    expect(links).toHaveLength(3 + 6)
    for (let i = 0; i < 3; i++) {
      const b = rectsOf(t, new RegExp(`^branch\\[${i}\\]$`))[0]
      for (const k of rectsOf(t, new RegExp(`^child\\[${i}\\]\\[\\d\\]$`))) expect(k.x).toBeGreaterThanOrEqual(b.x + b.width)
    }
  })

  it('curve:false draws straight links (no C command)', () => {
    const d = (curve: boolean) => JSON.stringify(lay({ center: 'c', branches: br(2, 1), curve }))
    expect(d(true)).toContain('C')
    expect(d(false)).not.toMatch(/"d":"[^"]*C/)
  })

  it('hostile input never yields NaN', () => {
    for (const p of [{ center: '', branches: [] }, { center: 'x', branches: [null, 3, { label: 'ok', children: 'nope' }] }, { center: 'x', branches: [{ label: 'a', children: [null, 2, 'b'] }] }]) {
      expect(JSON.stringify(lay(p as any))).not.toMatch(/NaN|Infinity/)
    }
  })

  it('capacity: seven branches fail with a remedy', () => {
    expect(tlsGMindmap.capacity!({ center: 'x', branches: br(7, 1) } as any, SZ, chartCtx(SZ)).fits).toBe(false)
  })
})

// RV07/08: the block's own example fits size.preferred and size.min (every line as wide as its glyphs).
describe('tls.g.mindmap example', () => {
  it('fits size.preferred and size.min', () => assertExampleFits(tlsGMindmap))
  it('motion parts exist in the layout and use presets that animate', () => assertMotionTargetsExist(tlsGMindmap))
})
