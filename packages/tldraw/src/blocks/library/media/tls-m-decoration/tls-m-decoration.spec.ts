/**
 * tls.m.decoration — determinism, one path, containment, rotation, shapes, tones, opacity.
 */

import { tlsMDecoration } from './index'
import { standardBlockSuite, absoluteLeaves } from '../../text/standard-suite'
import { ctxNoAssets } from '../media-test'
import { mulberry32, blobPath, wavePath, dotsPath } from './layout'
import { pathBounds } from '../../diagram/_kit'

const lay = (props: Record<string, unknown>, w = 480, h = 480) =>
  tlsMDecoration.layout({ ...(tlsMDecoration.defaults as any), ...props } as any, ctxNoAssets(w, h))
const pathOf = (tree: any) => absoluteLeaves(tree).find((l) => l.k === 'path')!
const dOf = (tree: any) => (pathOf(tree).node as any).d as string
const shapes = ['blob', 'arc', 'ring', 'dots', 'wave', 'corner']

standardBlockSuite(tlsMDecoration, { noCapacity: true })

describe('tls.m.decoration', () => {
  it('mulberry32: same seed same sequence, different seed different', () => {
    const a = mulberry32(5)
    const b = mulberry32(5)
    const c = mulberry32(6)
    const sa = [a(), a(), a()]
    expect(sa).toEqual([b(), b(), b()])
    expect(sa).not.toEqual([c(), c(), c()])
    for (const v of sa) expect(v).toBeGreaterThanOrEqual(0)
  })

  it('never uses Math.random: the source has no call to it', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const src = require('fs').readFileSync(require('path').join(__dirname, 'layout.ts'), 'utf8') as string
    expect(src.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/Math\.random\s*\(/)
  })

  it.each(shapes)('%s: the same seed gives the same path; the tree is one path node under one root', (shape) => {
    const a = lay({ shape, seed: 11 })
    const b = lay({ shape, seed: 11 })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(absoluteLeaves(a)).toHaveLength(1)
    expect(pathOf(a).part).toBe('shape')
  })

  it('different seeds draw different blobs and waves', () => {
    expect(dOf(lay({ shape: 'blob', seed: 1 }))).not.toBe(dOf(lay({ shape: 'blob', seed: 2 })))
    expect(dOf(lay({ shape: 'wave', seed: 1 }))).not.toBe(dOf(lay({ shape: 'wave', seed: 2 })))
    expect(blobPath(100, 100, 100, 3, 0)).toBe(blobPath(100, 100, 100, 3, 0))
  })

  it.each(shapes.filter((s) => s !== 'dots'))('%s: every point stays inside the box for any rotation', (shape) => {
    for (const [w, h] of [[480, 480], [900, 300], [300, 900]]) {
      for (const rotation of [0, 37, 90, 135, 180, 271, 359]) {
        const b = pathBounds(dOf(lay({ shape, rotation, seed: 3 }, w, h)))
        expect(b.x).toBeGreaterThanOrEqual(-1)
        expect(b.y).toBeGreaterThanOrEqual(-1)
        expect(b.x + b.width).toBeLessThanOrEqual(w + 1)
        expect(b.y + b.height).toBeLessThanOrEqual(h + 1)
      }
    }
  })

  it('rotation turns a blob and an arc, snaps wave and corner to quarter turns, and ignores ring/dots', () => {
    expect(dOf(lay({ shape: 'blob', rotation: 0 }))).not.toBe(dOf(lay({ shape: 'blob', rotation: 40 })))
    expect(dOf(lay({ shape: 'arc', rotation: 0 }))).not.toBe(dOf(lay({ shape: 'arc', rotation: 90 })))
    expect(dOf(lay({ shape: 'corner', rotation: 0 }))).not.toBe(dOf(lay({ shape: 'corner', rotation: 90 })))
    expect(dOf(lay({ shape: 'corner', rotation: 10 }))).toBe(dOf(lay({ shape: 'corner', rotation: 0 })))
    expect(dOf(lay({ shape: 'ring', rotation: 90 }))).toBe(dOf(lay({ shape: 'ring', rotation: 0 })))
    expect(dOf(lay({ shape: 'dots', rotation: 90 }))).toBe(dOf(lay({ shape: 'dots', rotation: 0 })))
    expect(dOf(lay({ rotation: 360 }))).toBe(dOf(lay({ rotation: 0 })))
  })

  it('wave hugs the edge its quarter names', () => {
    const b = (q: number) => pathBounds(wavePath(600, 400, q, 1))
    expect(b(0).y + b(0).height).toBeCloseTo(400, 0)
    expect(b(2).y).toBeCloseTo(0, 0)
    expect(b(1).x).toBeCloseTo(0, 0)
    expect(b(3).x + b(3).width).toBeCloseTo(600, 0)
  })

  it('performance: dots at 1920x1080 is ONE path node with a bounded number of marks', () => {
    const t = lay({ shape: 'dots' }, 1920, 1080)
    expect(absoluteLeaves(t)).toHaveLength(1)
    const { count } = dotsPath(1920, 1080)
    expect(count).toBeGreaterThan(20)
    expect(count).toBeLessThanOrEqual(600)
  })

  it('tone maps to theme roles; alt ignores opacity; opacity soft < medium < strong', () => {
    const c = ctxNoAssets(480, 480)
    const fill = (tone: string) => (pathOf(lay({ shape: 'blob', tone })).node as any).fill.color
    expect(fill('accent')).toBe(c.resolveColor('accent').color)
    expect(fill('accent2')).toBe(c.resolveColor('accent2').color)
    expect(fill('alt')).toBe(c.resolveColor('surfaceAlt').color)
    const op = (opacity: string, tone = 'accent') => (lay({ opacity, tone }) as any).opacity
    expect(op('soft')).toBeLessThan(op('medium'))
    expect(op('medium')).toBeLessThan(op('strong'))
    expect(op('strong', 'alt')).toBeUndefined()
  })

  it('ring and arc are strokes inside the box; the others are fills', () => {
    for (const shape of ['ring', 'arc']) {
      const n = pathOf(lay({ shape })).node as any
      expect(n.stroke.width).toBeGreaterThan(0)
      expect(n.fill).toBeUndefined()
    }
    for (const shape of ['blob', 'wave', 'corner', 'dots']) expect((pathOf(lay({ shape })).node as any).fill).toBeDefined()
  })

  it('the ring path is closed (no seam where it starts and ends)', () => {
    expect(dOf(lay({ shape: 'ring' })).endsWith('Z')).toBe(true)
  })

  it('a zero-size or hostile box gives a valid tree', () => {
    for (const shape of shapes) {
      expect(() => lay({ shape, rotation: NaN, seed: Infinity } as any, 0, 0)).not.toThrow()
      expect(() => lay({ shape }, 3, 2)).not.toThrow()
    }
  })
})

describe('AC4 decoration motifs', () => {
  const MOTIFS = ['orb', 'squiggle', 'star', 'sparkle', 'zigzag', 'triangle', 'half-circle', 'frame'] as const
  const leafOf = (tree: any) => absoluteLeaves(tree)[0]

  it('the schema lists every motif; the definition stays a backdrop decoration', () => {
    const values = (tlsMDecoration.schema.shape.type as any).values as string[]
    for (const m of MOTIFS) expect(values).toContain(m)
    expect(tlsMDecoration.category).toBe('decoration')
  })

  it.each(MOTIFS)('%s: one leaf named shape, deterministic, inside the box for any rotation and box', (shape) => {
    expect(JSON.stringify(lay({ shape, seed: 4 }))).toBe(JSON.stringify(lay({ shape, seed: 4 })))
    for (const [w, h] of [[480, 480], [900, 300], [300, 900], [61, 60]]) {
      for (const rotation of [0, 37, 90, 180, 271]) {
        const leaves = absoluteLeaves(lay({ shape, rotation }, w, h))
        expect(leaves).toHaveLength(1)
        const l = leaves[0]
        expect(l.part).toBe('shape')
        const b = l.k === 'path' ? pathBounds((l.node as any).d) : { x: l.x, y: l.y, width: l.width, height: l.height }
        const sw = l.k === 'path' && (l.node as any).stroke ? (l.node as any).stroke.width / 2 : 0
        expect(b.x - sw).toBeGreaterThanOrEqual(-1)
        expect(b.y - sw).toBeGreaterThanOrEqual(-1)
        expect(b.x + b.width + sw).toBeLessThanOrEqual(w + 1)
        expect(b.y + b.height + sw).toBeLessThanOrEqual(h + 1)
      }
    }
  })

  it('orb is a round rect with a top-left-lit radial gradient (pseudo-3D), at least 0.85 opaque', () => {
    const t: any = lay({ shape: 'orb', tone: 'accent', opacity: 'soft' }, 400, 300)
    const n = leafOf(t).node as any
    expect(n.k).toBe('rect')
    expect(n.box.width).toBe(n.box.height)
    expect(n.radius).toBe(n.box.width / 2)
    expect(n.fill.type).toBe('radialGradient')
    expect(n.fill.cx).toBeLessThan(0.5)
    expect(n.fill.stops).toHaveLength(3)
    expect(t.opacity).toBeGreaterThanOrEqual(0.85)
  })

  it('squiggle, zigzag and frame are strokes; star, sparkle, triangle and half-circle fills', () => {
    for (const shape of ['squiggle', 'zigzag', 'frame']) expect((leafOf(lay({ shape })).node as any).stroke.width).toBeGreaterThan(0)
    for (const shape of ['star', 'sparkle', 'triangle', 'half-circle']) expect((leafOf(lay({ shape })).node as any).fill).toBeDefined()
  })

  it('rotation: star/sparkle/triangle turn freely; squiggle/zigzag/half-circle snap; orb/frame ignore it', () => {
    for (const shape of ['star', 'sparkle', 'triangle']) expect(dOf(lay({ shape, rotation: 20 }))).not.toBe(dOf(lay({ shape, rotation: 0 })))
    for (const shape of ['squiggle', 'zigzag', 'half-circle']) {
      expect(dOf(lay({ shape, rotation: 10 }))).toBe(dOf(lay({ shape, rotation: 0 })))
      expect(dOf(lay({ shape, rotation: 90 }))).not.toBe(dOf(lay({ shape, rotation: 0 })))
    }
    expect(dOf(lay({ shape: 'frame', rotation: 90 }))).toBe(dOf(lay({ shape: 'frame', rotation: 0 })))
    expect(JSON.stringify(lay({ shape: 'orb', rotation: 90 }))).toBe(JSON.stringify(lay({ shape: 'orb', rotation: 0 })))
  })

  it.each(MOTIFS)('%s: DOM and SVG agree (parity probe)', async (shape) => {
    const { assertParity } = await import('../../../parity-harness')
    await assertParity(tlsMDecoration, { ...(tlsMDecoration.defaults as any), shape, tone: 'accent2', opacity: 'strong', rotation: 30 }, { width: 480, height: 320 })
  }, 30000)
})

describe('AC5 — hand-drawn motifs through Rough.js', () => {
  const { starPath, sparklePath, squigglePath } = require('./layout')
  it.each(['star', 'sparkle', 'squiggle'])('%s is a seeded Rough.js sketch: same seed same path, another seed another', (shape) => {
    const a = dOf(lay({ shape, seed: 11 }))
    expect(dOf(lay({ shape, seed: 11 }))).toBe(a)
    expect(dOf(lay({ shape, seed: 12 }))).not.toBe(a)
    // only absolute M / L / C / Z commands (what pathBounds and both renderers measure exactly)
    expect(a.replace(/[-\d.,\s]/g, '')).toMatch(/^[MLCZ]+$/)
  })
  it('the sketch is not the smooth path', () => {
    const W = 480
    expect(dOf(lay({ shape: 'star', seed: 1 }, W, W))).not.toBe(starPath(W / 2, W / 2, (W / 2) * 0.92, 5, 0.45, 0))
    expect(dOf(lay({ shape: 'sparkle', seed: 1 }, W, W))).not.toBe(sparklePath(W / 2, W / 2, (W / 2) * 0.92, 0))
    void squigglePath
  })
})
