/**
 * tls.g.orbit (vivid V4) — satellites on the orbit, text on the outer side without overlap.
 */

import { tlsGOrbit } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane, assertExampleFits } from '../../data/_chart/chart-test'
import { assertNoOverlap, layoutOf, rectsOf, assertMotionTargetsExist } from '../diagram-test'

const SZ = { width: 1200, height: 600 }
const MIN = { width: 700, height: 400 }
const items = (n: number, long = false) =>
  Array.from({ length: n }, (_, i) => ({ label: long ? `Satellite ${i + 1} name` : `Item ${i + 1}`, text: long ? 'A note of several words for it' : `Note ${i + 1}`, icon: 'star' }))

standardBlockSuite(tlsGOrbit, { overflowProps: { items: items(10) } })

describe('tls.g.orbit', () => {
  it.each([3, 5, 8])('%i satellites: on the orbit, text clear of discs and of each other', (n) => {
    for (const size of [SZ, MIN]) {
      for (const long of [false, true]) {
        const t = layoutOf(tlsGOrbit, { items: items(n, long) }, size)
        assertChartSane(t, size)
        const sats = rectsOf(t, /^sat\[/)
        expect(sats).toHaveLength(n)
        assertNoOverlap(sats)
        const text = rectsOf(t, /^(label|note)\[/)
        assertNoOverlap(text)
        assertNoOverlap([...sats, ...rectsOf(t, /^hub$/)])
        for (const l of text) for (const s of sats) {
          const ox = Math.min(l.x + l.width, s.x + s.width) - Math.max(l.x, s.x)
          const oy = Math.min(l.y + l.height, s.y + s.height) - Math.max(l.y, s.y)
          expect([l.part, s.part, ox > 1 && oy > 1]).toEqual([l.part, s.part, false])
        }
      }
    }
  })

  it('spokes none drops the spokes; sparks twinkle in the viewer', () => {
    expect(rectsOf(layoutOf(tlsGOrbit, { spokes: 'none' }, SZ), /^spoke\[/)).toHaveLength(0)
    expect(tlsGOrbit.motion!.ambient).toMatchObject({ preset: 'twinkle', part: 'star' })
  })

  it('motion targets exist', () => assertMotionTargetsExist(tlsGOrbit))
  it('the example fits its sizes', () => assertExampleFits(tlsGOrbit))
})
