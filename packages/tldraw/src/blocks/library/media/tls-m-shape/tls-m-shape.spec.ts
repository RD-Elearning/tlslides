/**
 * tls.m.shape — the three shapes, label fitting, icon, tones, scaling, motion (CMP3 atom).
 */

import { tlsMShape } from './index'
import { SHAPE_PX, hexagonPath } from './layout'
import { makeCtx, makeRegistry } from '../../text/test-helpers'
import { standardBlockSuite, leavesOf, absoluteLeaves } from '../../text/standard-suite'

standardBlockSuite(tlsMShape, { noCapacity: true })

const lay = (props: Record<string, unknown>, w = 600, h = 400) =>
  tlsMShape.layout({ ...(tlsMShape.defaults as any), ...props } as any, makeCtx({ width: w, height: h }, makeRegistry()))
const fill = (t: any) => leavesOf(t, 'shape.fill')[0]

describe('tls.m.shape', () => {
  it('circle: the size step across, centred in the box width, at the top', () => {
    const t = lay({ shape: 'circle', size: 'md' })
    const f = fill(t)
    expect([f.width, f.height]).toEqual([SHAPE_PX.md, SHAPE_PX.md])
    expect((f.node as any).radius).toBe(SHAPE_PX.md / 2)
    expect(Math.abs(f.x + f.width / 2 - 300)).toBeLessThan(1)
    expect(f.y).toBe(0)
    expect(t.box.height).toBe(SHAPE_PX.md)
  })

  it('rounded is a wider, lower box; hexagon is a filled path', () => {
    const r = fill(lay({ shape: 'rounded' }))
    expect(r.k).toBe('rect')
    expect(r.width).toBeGreaterThan(r.height)
    const h = fill(lay({ shape: 'hexagon' }))
    expect(h.k).toBe('path')
    expect((h.node as any).d).toMatch(/^M.*Z$/)
    expect(hexagonPath(0, 0, 100, 86, 6).match(/Q/g)).toHaveLength(6)
  })

  it('the label is centred inside the shape, a long label steps the type down', () => {
    const t = lay({ label: 'Hub' })
    const f = fill(t)
    for (const l of leavesOf(t, 'shape.label')) {
      expect(l.x).toBeGreaterThanOrEqual(f.x)
      expect(l.x + l.width).toBeLessThanOrEqual(f.x + f.width)
      expect(Math.abs(l.x + l.width / 2 - (f.x + f.width / 2))).toBeLessThan(2)
    }
    const big = (leavesOf(lay({ label: 'Hub' }), 'shape.label')[0].node as any).style.size
    const small = (leavesOf(lay({ label: 'Customer data platform and analytics' }), 'shape.label')[0].node as any).style.size
    expect(small).toBeLessThan(big)
  })

  it('an icon sits above the label', () => {
    const t = lay({ icon: 'database', label: 'Data' })
    const icon = leavesOf(t, 'shape.icon')[0]
    const label = leavesOf(t, 'shape.label')[0]
    expect(icon.y + icon.height).toBeLessThanOrEqual(label.y)
  })

  it('tones: soft is a tint, solid the accent, outline only a stroke', () => {
    const accent = makeCtx({ width: 600, height: 400 }).resolveColor('accent').color
    expect((fill(lay({ tone: 'solid' })).node as any).fill.color).toBe(accent)
    expect((fill(lay({ tone: 'soft' })).node as any).fill.color).not.toBe(accent)
    expect((fill(lay({ tone: 'outline' })).node as any).fill).toBeUndefined()
  })

  it('a smaller box scales the shape down; nothing leaves the box', () => {
    for (const shape of ['circle', 'rounded', 'hexagon']) {
      const t = lay({ shape, size: 'lg', label: 'Data platform' }, 180, 120)
      for (const l of absoluteLeaves(t)) {
        expect(l.x + l.width).toBeLessThanOrEqual(181)
        expect(l.y + l.height).toBeLessThanOrEqual(121)
      }
    }
  })

  it('intrinsic size is the shape; motion pops under expressive', () => {
    const ctx = makeCtx({ width: 600, height: 400 })
    expect(tlsMShape.intrinsicSize!({ label: 'x', shape: 'circle', size: 'sm' } as any, ctx)).toEqual({ width: 160, height: 160 })
    expect(tlsMShape.motion).toEqual({ parts: ['shape'], preset: 'fade-up', expressive: 'pop' })
  })
})
