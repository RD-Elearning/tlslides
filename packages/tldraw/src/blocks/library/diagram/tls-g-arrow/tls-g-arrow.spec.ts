/**
 * tls.g.arrow — four directions, three kinds, heads, weights, label placement.
 */

import { tlsGArrow } from './index'
import { standardBlockSuite, absoluteLeaves } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { layoutOf, rectsOf, within } from '../diagram-test'

const SZ = { width: 420, height: 160 }
const MIN = { width: 120, height: 60 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGArrow, props, size)

standardBlockSuite(tlsGArrow, { noCapacity: true })

const dirs = ['right', 'left', 'up', 'down'] as const
const kinds = ['straight', 'curved', 'elbow'] as const

describe('tls.g.arrow', () => {
  it.each(kinds.flatMap((k) => dirs.map((d) => [k, d])))('%s/%s: lays out inside the box at preferred, min and tall/wide sizes', (kind, direction) => {
    for (const size of [SZ, MIN, { width: 160, height: 420 }, { width: 800, height: 80 }]) {
      for (const heads of ['end', 'both', 'none']) {
        const t = lay({ label: 'A label', kind, direction, heads }, size)
        assertChartSane(t, size)
        const path = rectsOf(t, /^arrow\[path\]/)
        expect(path).toHaveLength(1)
        expect(within(path[0], { part: 'b', x: 0, y: 0, ...size }, 1.5)).toBe(true)
        const hs = rectsOf(t, /^arrow\[head/)
        expect(hs).toHaveLength(heads === 'none' ? 0 : heads === 'both' ? 2 : 1)
        for (const h of hs) expect(within(h, { part: 'b', x: 0, y: 0, ...size }, 1.5)).toBe(true)
      }
    }
  })

  it('the head is at the end: right points at the right edge, left at the left, up at the top, down at the bottom', () => {
    const tip = (direction: string) => rectsOf(lay({ kind: 'straight', direction, label: '' }, { width: 400, height: 400 }), /^arrow\[head-end\]/)[0]
    expect(tip('right').x + tip('right').width).toBeGreaterThan(380)
    expect(tip('left').x).toBeLessThan(20)
    expect(tip('up').y).toBeLessThan(20)
    expect(tip('down').y + tip('down').height).toBeGreaterThan(380)
  })

  it('weights draw thicker strokes', () => {
    const w = (weight: string) => (absoluteLeaves(lay({ weight })).find((l) => l.part === 'arrow[path]')!.node as any).stroke.width
    expect(w('sm')).toBeLessThan(w('md'))
    expect(w('md')).toBeLessThan(w('lg'))
  })

  it('tones use different role colours', () => {
    const col = (tone: string) => (absoluteLeaves(lay({ tone })).find((l) => l.part === 'arrow[path]')!.node as any).stroke.color
    expect(new Set([col('accent'), col('text'), col('muted')]).size).toBe(3)
  })

  it('a straight horizontal arrow keeps its label clear of the line', () => {
    const t = lay({ label: 'Then', kind: 'straight', direction: 'right' })
    const path = rectsOf(t, /^arrow\[path\]/)[0]
    for (const l of rectsOf(t, /^label/)) expect(l.y).toBeGreaterThanOrEqual(path.y + path.height - 1)
  })

  it('no label means no label node; hostile props never yield NaN', () => {
    expect(rectsOf(lay({ label: '' }), /^label/)).toHaveLength(0)
    for (const p of [{ kind: 'zigzag', direction: 'sideways', heads: 3 }, { label: 5 }, {}]) expect(JSON.stringify(lay(p as any))).not.toMatch(/NaN|Infinity/)
  })
})
