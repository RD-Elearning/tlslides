/**
 * LO0 — `measureBlock`: natural size from the painted leaves of the layout tree
 * (`reviews/blocks/layout-oracle/README.md` §LO0).
 */
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import type { BlockDefinition, LayoutContext, LayoutNode, SurfaceContext } from '../types'
import { resolveTokens } from '../tokens'
import { defaultBlockRegistry } from '../validate-deck-spec'
import { createLayoutContext } from './layout-child'
import { estimateMetrics, tableMetrics } from './measure'
import { collectPaintedLeaves, measureBlock, pathBounds, DEFAULT_PROBE_HEIGHT } from './measure-block'

const SURFACE: SurfaceContext = { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false }
const registry = defaultBlockRegistry()
const tokens = resolveTokens(DEFAULT_DECK_THEME)

function ctxFor(width: number, measureText = tableMetrics()): LayoutContext {
  return createLayoutContext({ box: { width, height: 600 }, tokens, surface: SURFACE, registry, measureText })
}

function def(type: string): BlockDefinition {
  const d = registry.get(type)
  if (!d) throw new Error(`${type} not registered`)
  return d
}

describe('measureBlock — one block per scope', () => {
  it('element (tls.t.title): high confidence, one text leaf, content-sized', () => {
    const d = def('tls.t.title')
    expect(d.scope).toBe('element')
    const m = measureBlock(d, { text: 'Revenue grew 42%' }, 1728, ctxFor(1728))
    expect(m.confidence).toBe('high')
    expect(m.elastic).toBe(false)
    expect(m.text).toHaveLength(1)
    expect(m.text[0].lines).toBe(1)
    expect(m.natural.height).toBeGreaterThan(0)
    expect(m.natural.height).toBeLessThan(200)
    // A short title does not paint the full width.
    expect(m.natural.width).toBeLessThan(1728)
    expect(m.probeHeight).toBe(DEFAULT_PROBE_HEIGHT)
  })

  it('group (tls.d.bar): a chart fills its box — elastic, natural at the given height', () => {
    const d = def('tls.d.bar')
    expect(d.scope).toBe('group')
    const m = measureBlock(d, d.defaults, 840, ctxFor(840), { height: 500 })
    expect(m.elastic).toBe(true)
    expect(m.probeHeight).toBe(500)
    expect(m.natural.height).toBeLessThanOrEqual(500 + 1)
    expect(m.natural.height).toBeGreaterThan(250)
  })

  it('slide (tls.c.cover): measured from its painted content', () => {
    const d = def('tls.c.cover')
    expect(d.scope).toBe('slide')
    const m = measureBlock(d, d.defaults, 1728, ctxFor(1728), { height: 888 })
    expect(m.confidence).not.toBe('low')
    expect(m.text.length).toBeGreaterThan(0)
    expect(m.natural.height).toBeGreaterThan(0)
  })

  it('html kind (tls.c.hero): measured from its poster, medium confidence', () => {
    const d = def('tls.c.hero')
    expect(d.kind).toBe('html')
    const m = measureBlock(d, d.defaults, 1728, ctxFor(1728))
    expect(m.kind).toBe('html')
    expect(m.confidence).toBe('medium')
    expect(m.reason).toMatch(/poster/)
    expect(m.text.length).toBeGreaterThan(0)
    expect(m.natural.height).toBeGreaterThan(0)
  })

  it('estimateMetrics drops a layout block to medium confidence', () => {
    const m = measureBlock(def('tls.t.title'), { text: 'Hello' }, 1200, ctxFor(1200, estimateMetrics))
    expect(m.confidence).toBe('medium')
  })
})

describe('measureBlock — natural height tracks content', () => {
  it('adding a line of text to a title raises natural.height by ≈ one line-height', () => {
    const d = def('tls.t.title')
    const ctx = ctxFor(1200)
    const one = measureBlock(d, { text: 'Quarterly results' }, 1200, ctx)
    const two = measureBlock(d, { text: 'Quarterly results\nNext steps' }, 1200, ctx)
    expect(one.text[0].lines).toBe(1)
    expect(two.text[0].lines).toBe(2)
    const lh = one.text[0].lineHeight
    expect(Math.abs(two.natural.height - one.natural.height - lh)).toBeLessThanOrEqual(2)
  })

  it('a long title is not autofit-shrunk by the probe (natural = full-size type)', () => {
    const d = def('tls.t.title')
    const long = 'A deliberately long slide title that will need to wrap across several lines at this width'
    const m = measureBlock(d, { text: long }, 800, ctxFor(800))
    expect(m.text[0].scale).toBe(1)
    expect(m.text[0].lines).toBeGreaterThan(1)
  })

  it('a root-box-inflated block reports content height, not the box it was given', () => {
    // tls.l.section returns max(box, content) as its root (block-library fact 6).
    const d = def('tls.l.section')
    const m = measureBlock(d, d.defaults, 1728, ctxFor(1728), { height: 888 })
    expect(m.rootHeight).toBeGreaterThanOrEqual(888)
    expect(m.elastic).toBe(false)
    expect(m.natural.height).toBeLessThan(400)
  })

  it('a layout that throws is reported low-confidence, never thrown', () => {
    const broken: BlockDefinition = {
      ...def('tls.t.title'),
      type: 'test.broken',
      layout: () => {
        throw new Error('boom')
      },
    }
    const m = measureBlock(broken, {}, 400, ctxFor(400))
    expect(m.confidence).toBe('low')
    expect(m.reason).toMatch(/boom/)
  })
})

describe('collectPaintedLeaves', () => {
  it('translates group children, drops full-box backdrops, honours clip', () => {
    const tree: LayoutNode = {
      k: 'group',
      box: { x: 0, y: 0, width: 400, height: 400 },
      children: [
        { k: 'rect', box: { x: 0, y: 0, width: 400, height: 400 }, fill: { type: 'solid', color: '#eee' } },
        {
          k: 'group',
          box: { x: 50, y: 60, width: 100, height: 40 },
          clip: true,
          children: [{ k: 'rect', box: { x: 0, y: 0, width: 300, height: 20 }, fill: { type: 'solid', color: '#000' } }],
        },
      ],
    }
    const c = collectPaintedLeaves(tree, { width: 400, height: 400 })
    expect(c.backdrops).toHaveLength(1)
    expect(c.leaves).toHaveLength(1)
    expect(c.leaves[0].box).toEqual({ x: 50, y: 60, width: 100, height: 20 })
  })

  it('a host with a poster is walked; without one it is opaque', () => {
    const poster: LayoutNode = { k: 'rect', box: { x: 10, y: 10, width: 20, height: 20 }, fill: { type: 'solid', color: '#000' } }
    const withPoster = collectPaintedLeaves(
      { k: 'host', box: { x: 0, y: 100, width: 400, height: 50 }, render: 'x', poster },
      { width: 400, height: 400 }
    )
    expect(withPoster.posterHost).toBe(true)
    expect(withPoster.leaves[0].box).toEqual({ x: 10, y: 110, width: 20, height: 20 })
    const opaque = collectPaintedLeaves({ k: 'host', box: { x: 0, y: 0, width: 400, height: 50 }, render: 'x' }, { width: 400, height: 400 })
    expect(opaque.opaqueHost).toBe(true)
  })

  it('a path paints its geometry, not its (often full-box) node box', () => {
    const c = collectPaintedLeaves(
      {
        k: 'path',
        box: { x: 0, y: 0, width: 400, height: 400 },
        d: 'M 100 100 L 200 100 L 200 150 Z',
        fill: { type: 'solid', color: '#000' },
      },
      { width: 400, height: 400 }
    )
    expect(c.backdrops).toHaveLength(0)
    expect(c.leaves[0].box).toEqual({ x: 100, y: 100, width: 100, height: 50 })
  })
})

describe('pathBounds', () => {
  it('handles relative commands, H/V and arcs', () => {
    expect(pathBounds('m10 10 h 30 v 20 z')).toEqual({ x: 10, y: 10, width: 30, height: 20 })
    // Half circle of radius 50 from (0,50) to (100,50) through the top.
    const b = pathBounds('M 0 50 A 50 50 0 0 1 100 50')!
    expect(b.x).toBeCloseTo(0, 5)
    expect(b.width).toBeCloseTo(100, 5)
    expect(b.y).toBeCloseTo(0, 1)
    expect(b.height).toBeCloseTo(50, 1)
    expect(pathBounds('')).toBeNull()
  })
})
