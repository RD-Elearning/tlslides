/**
 * tls.m.shape — the three shapes, label fitting, icon, tones, scaling, motion (CMP3 atom).
 */

import { tlsMShape } from './index'
import { SHAPE_PX, hexagonPath, peerShapeSteps } from './layout'
import { tlsLGrid } from '../../layout/tls-l-grid'
import { tlsLRow } from '../../layout/tls-l-row'
import { defaultBlockRegistry } from '../../../validate-deck-spec'
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

describe('tls.m.shape — peer label step (CS1)', () => {
  const shape = (id: string, label: string) => ({ id, type: 'tls.m.shape', props: { label, shape: 'circle', size: 'md', icon: 'layers' } })
  // one label long enough to step down at md, the rest short
  const LONG = 'Customer data platform and analytics'
  const labels = ['Học', LONG, 'Liệu thay', 'Trên dữ', 'Suất bác', 'Sales']
  const full = defaultBlockRegistry()
  const sizes = (root: any) => leavesOf(root, 'shape.label').map((l) => (l.node as any).style.size)

  it('alone, a one-word label keeps the size step and a two-word one steps down', () => {
    expect(sizes(lay({ label: 'Học' }, 300, 300))[0]).toBeGreaterThan(sizes(lay({ label: LONG }, 300, 300))[0])
  })

  it('peer shapes in a grid share the lowest step any of them needs', () => {
    const ctx = makeCtx({ width: 1500, height: 640 }, full)
    const grid = tlsLGrid.layout({ ...(tlsLGrid.defaults as any), columns: 3, rows: 2, children: labels.map((l, i) => shape(`s${i}`, l)) } as any, ctx)
    const s = sizes(grid)
    expect(s.length).toBeGreaterThanOrEqual(6)
    expect(new Set(s).size).toBe(1)
    expect(s[0]).toBeLessThan(sizes(lay({ label: 'Học' }, 470, 300))[0])
  })

  it('peer shapes in a row share it too; a lone shape among other blocks keeps its own', () => {
    const ctx = makeCtx({ width: 1500, height: 300 }, full)
    const row = tlsLRow.layout({ ...(tlsLRow.defaults as any), children: [shape('a', 'Học'), shape('b', LONG)] } as any, ctx)
    expect(new Set(sizes(row)).size).toBe(1)
    const steps = peerShapeSteps([shape('a', 'Học'), { id: 't', type: 'tls.t.body', props: {} } as any], [{ width: 300, height: 300 }, { width: 300, height: 300 }], ctx)
    expect(steps).toEqual([undefined, undefined])
  })

  it('shapes of different sizes are separate groups', () => {
    const ctx = makeCtx({ width: 1500, height: 300 }, full)
    const lg = { ...shape('c', 'Học'), props: { ...shape('c', 'Học').props, size: 'lg' } }
    const steps = peerShapeSteps([shape('a', 'Học'), shape('b', LONG), lg], [300, 300, 300].map((w) => ({ width: w, height: 300 })), ctx)
    expect(steps[0]).toBe(steps[1])
    expect(steps[2]).toBeUndefined()
  })
})
