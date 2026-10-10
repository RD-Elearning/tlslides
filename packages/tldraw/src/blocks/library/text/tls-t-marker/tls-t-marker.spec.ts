/**
 * tls.t.marker — disc sizes, numeral, tones, centring, shrink-to-fit, motion (CMP3 atom).
 */

import { tlsTMarker } from './index'
import { MARKER_DISC } from './layout'
import { makeCtx, makeRegistry } from '../test-helpers'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../standard-suite'

standardBlockSuite(tlsTMarker, { noCapacity: true })

const lay = (props: Record<string, unknown>, w = 400, h = 300) =>
  tlsTMarker.layout({ ...(tlsTMarker.defaults as any), ...props } as any, makeCtx({ width: w, height: h }, makeRegistry()))

describe('tls.t.marker', () => {
  it('circle: a disc of the size step with the number centred on it', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const t = lay({ size })
      const disc = leavesOf(t, 'marker.disc')[0]
      expect([disc.width, disc.height]).toEqual([MARKER_DISC[size], MARKER_DISC[size]])
      expect((disc.node as any).radius).toBe(MARKER_DISC[size] / 2)
      const v = leavesOf(t, 'marker.value')[0]
      expect(Math.abs(v.x + v.width / 2 - disc.width / 2)).toBeLessThan(1)
      expect(Math.abs(v.y + v.height / 2 - disc.height / 2)).toBeLessThan(1)
      expect(t.box.height).toBe(MARKER_DISC[size])
    }
  })

  it('numeral: no disc, the number set large in the accent', () => {
    const ctx = makeCtx({ width: 400, height: 300 })
    const t = lay({ variant: 'numeral', value: '01' })
    expect(leavesOf(t, 'marker.disc')).toHaveLength(0)
    const v = leavesOf(t, 'marker.value')[0]
    expect((v.node as any).style.size).toBeGreaterThanOrEqual(100)
    expect((v.node as any).style.color).toBe(ctx.resolveColor('accent').color)
  })

  it('tones paint the disc: solid accent, soft tint, outline ring', () => {
    const accent = makeCtx({ width: 400, height: 300 }).resolveColor('accent').color
    expect((leavesOf(lay({ tone: 'solid' }), 'marker.disc')[0].node as any).fill.color).toBe(accent)
    expect((leavesOf(lay({ tone: 'soft' }), 'marker.disc')[0].node as any).fill.color).not.toBe(accent)
    const ring = leavesOf(lay({ tone: 'outline' }), 'marker.disc')[0].node as any
    expect(ring.fill).toBeUndefined()
    expect(ring.stroke.width).toBeGreaterThan(0)
  })

  it('a small box scales the marker down; nothing leaves it', () => {
    for (const variant of ['circle', 'numeral']) {
      const t = lay({ variant, value: '12', size: 'lg' }, 40, 40)
      for (const l of absoluteLeaves(t)) {
        expect(l.x + l.width).toBeLessThanOrEqual(41)
        expect(l.y + l.height).toBeLessThanOrEqual(41)
      }
    }
  })

  it('intrinsic size = the marker; motion pops under expressive', () => {
    const ctx = makeCtx({ width: 400, height: 300 })
    expect(tlsTMarker.intrinsicSize!({ value: '3' } as any, ctx)).toEqual({ width: 72, height: 72 })
    expect(tlsTMarker.motion).toEqual({ parts: ['marker'], preset: 'fade-up', expressive: 'pop' })
  })
})
