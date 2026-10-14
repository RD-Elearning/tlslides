/**
 * CMP1 — nested composition is correct (`reviews/blocks/composition/README.md` §2 CMP1).
 *
 * Nested style (F1), a container's surface as its children's surface, the honest style fields
 * (F2: tone / radius / elevation / gap), layers inside `tls.l.overlay` and a nested `anchorTo`
 * (F7), `bleed`, the layered-image `overImage` mark, the shared depth limit and `block/dropped`
 * (F3), and the wrapper-group identity (X2).
 */
import type { BlockSpec, LayoutNode, SlideSpec, SurfaceContext } from './types'
import { MAX_NESTING_DEPTH } from './types'
import { createLayoutContext, layoutBlock } from './layout/layout-child'
import { resolveTokens } from './tokens'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import { defaultBlockRegistry } from './validate-deck-spec'
import { analyzeSlide } from './layout-report'
import { compileSlide, findBlockGroup } from './slide-compiler'
import { BLOCK_PROP_KEY } from './shape-bridge'

const FRAME = { width: 1920, height: 1080 }
const tokens = resolveTokens(DEFAULT_DECK_THEME)
const registry = defaultBlockRegistry()
const WHITE: SurfaceContext = { behind: { type: 'solid', color: '#ffffff' }, luminance: 1, overImage: false }

type Group = Extract<LayoutNode, { k: 'group' }>

function lay(spec: BlockSpec, width = 900, height = 500): LayoutNode {
  const def = registry.get(spec.type)!
  const ctx = createLayoutContext({ box: { width, height }, tokens, surface: WHITE, registry, ...(spec.style ? { style: spec.style } : {}) })
  return layoutBlock(def, spec.props, ctx)
}

function all(node: LayoutNode): LayoutNode[] {
  return node.k === 'group' ? [node, ...node.children.flatMap(all)] : node.k === 'host' && node.poster ? [node, ...all(node.poster)] : [node]
}
const texts = (n: LayoutNode) => all(n).filter((x): x is Extract<LayoutNode, { k: 'text' }> => x.k === 'text')
const rects = (n: LayoutNode) => all(n).filter((x): x is Extract<LayoutNode, { k: 'rect' }> => x.k === 'rect')
const body = (id: string, text = 'Body text on the card'): BlockSpec => ({ id, type: 'tls.t.body', props: { text } })
const card = (id: string, children: BlockSpec[], style?: BlockSpec['style']): BlockSpec => ({ id, type: 'tls.l.card', props: { children }, ...(style ? { style } : {}) })

describe('CMP1 nested style (F1)', () => {
  it('a nested child honours its own BlockSpec.style (accent card in a grid)', () => {
    const grid: BlockSpec = {
      id: 'g',
      type: 'tls.l.grid',
      props: { columns: 2, rows: 1, children: [card('c1', [body('b1')]), card('c2', [body('b2')], { surface: 'accent' })] },
    }
    const node = lay(grid, 1200, 400)
    const bgs = rects(node).filter((r) => r.part === 'background')
    expect(bgs).toHaveLength(2)
    const fills = bgs.map((r) => (r.fill?.type === 'solid' ? r.fill.color.toLowerCase() : ''))
    expect(fills[1]).toBe(tokens.color.accent.toLowerCase())
    expect(fills[0]).not.toBe(fills[1])
  })

  it('spec.style wins over the composites’ $block.style; $block alone still works', () => {
    const both: BlockSpec = { id: 'b', type: 'tls.t.body', props: { text: 'x', $block: { style: { on: '#ff0000' } } }, style: { on: '#00ff00' } }
    const legacy: BlockSpec = { id: 'l', type: 'tls.t.body', props: { text: 'x', $block: { style: { on: '#ff0000' } } } }
    const st = (c: BlockSpec) => texts(lay({ id: 's', type: 'tls.l.stack', props: { children: [c] } }))[0].style.color.toLowerCase()
    expect(st(both)).toBe('#00ff00')
    expect(st(legacy)).toBe('#ff0000')
  })

  it('a dark card passes its surface down: the child text solves light ink on it', () => {
    const dark = lay(card('c', [body('b')], { tone: 'inverted' }))
    const light = lay(card('c', [body('b')]))
    const lum = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)
    expect(lum(texts(dark)[0].style.color)).toBeGreaterThan(lum(texts(light)[0].style.color))
    expect(lum(texts(dark)[0].style.color)).toBeGreaterThan(600)
  })
})

describe('CMP1 honest style fields (F2)', () => {
  const bg = (n: LayoutNode) => rects(n).find((r) => r.part === 'background')
  it('tone outline / ghost / gradient / filled paint differently', () => {
    const outline = bg(lay(card('c', [body('b')], { tone: 'outline' })))
    expect(outline?.fill).toBeUndefined()
    expect(outline?.stroke?.width).toBe(2)
    expect(bg(lay(card('c', [body('b')], { tone: 'ghost' })))).toBeUndefined()
    expect(bg(lay(card('c', [body('b')], { tone: 'gradient' })))?.fill?.type).toBe('linearGradient')
    expect(bg(lay(card('c', [body('b')], { tone: 'filled' })))?.fill?.type).toBe('solid')
  })
  it('radius (token or units) and elevation reach the card rect', () => {
    expect(bg(lay(card('c', [body('b')], { radius: 'xl' })))?.radius).toBe(tokens.radius.xl)
    expect(bg(lay(card('c', [body('b')], { radius: 3 })))?.radius).toBe(3)
    expect(bg(lay(card('c', [body('b')], { elevation: 2 })))?.shadow).toBe(2)
    expect(bg(lay(card('c', [body('b')], { elevation: 0, tone: 'filled' })))?.shadow).toBeUndefined()
  })
  it('no style field = the card paints exactly as before', () => {
    // CMP4: an authored card of text is as tall as its content plus its padding (not the 500 it
    // was given); the paint itself is unchanged: one plain solid rect, full width, from the top
    const r = bg(lay(card('c', [body('b')])))
    expect(r).toEqual({ k: 'rect', box: { x: 0, y: 0, width: 900, height: expect.any(Number) }, part: 'background', fill: { type: 'solid', color: expect.any(String) } })
    expect(r!.box.height).toBeLessThan(500)
  })
  it('style.gap spaces a stack’s and a card’s children', () => {
    const kids = [body('a', 'one'), body('b', 'two')]
    const ys = (n: LayoutNode) => all(n).filter((x): x is Group => x.k === 'group' && !!x.blockId && ['a', 'b'].includes(x.blockId))
    const loose = ys(lay({ id: 's', type: 'tls.l.stack', props: { children: kids }, style: { gap: 200 } }))
    const tight = ys(lay({ id: 's', type: 'tls.l.stack', props: { children: kids }, style: { gap: 0 } }))
    expect(loose[1].box.y - (loose[0].box.y + loose[0].box.height)).toBeCloseTo(200)
    expect(tight[1].box.y - (tight[0].box.y + tight[0].box.height)).toBeCloseTo(0)
    const cardGap = (g: number) => {
      const n = lay(card('c', kids, { gap: g }))
      const inner = all(n).filter((x): x is Group => x.k === 'group' && (x.blockId === 'a' || x.blockId === 'b'))
      return inner[1].box.y - (inner[0].box.y + inner[0].box.height)
    }
    expect(cardGap(100)).toBeGreaterThan(cardGap(10))
  })
})

describe('CMP1 layers inside tls.l.overlay (F7)', () => {
  const overlay = (children: BlockSpec[]): BlockSpec => ({ id: 'ov', type: 'tls.l.overlay', props: { children } })
  it('an anchored child takes its natural size at the anchor, inset space.lg', () => {
    const n = lay(overlay([{ ...body('t', 'Caption'), anchor: 'bottom-right' }]), 1000, 600) as Group
    const w = n.children.find((c): c is Group => c.k === 'group' && c.blockId === 't')!
    expect(w.box.width).toBeLessThan(1000 - 2 * tokens.space.lg)
    expect(w.box.x + w.box.width).toBeCloseTo(1000 - tokens.space.lg, 0)
    expect(w.box.y + w.box.height).toBeCloseTo(600 - tokens.space.lg, 0)
  })
  it('layer orders paint: backdrop, content, overlay; motion parts keep authored order', () => {
    const n = lay(overlay([{ ...body('o', 'top'), layer: 'overlay' }, body('c', 'mid'), { ...body('b', 'bottom'), layer: 'backdrop' }])) as Group
    const order = n.children.filter((c): c is Group => c.k === 'group').map((c) => [c.blockId, c.part])
    expect(order).toEqual([
      ['b', 'child/2'],
      ['c', 'child/1'],
      ['o', 'child/0'],
    ])
  })
})

describe('CMP1 X2 — wrapper groups name their block', () => {
  it('blockId and type on every layoutChild wrapper; findBlockGroup finds a nested one', () => {
    const grid: BlockSpec = { id: 'g', type: 'tls.l.grid', props: { columns: 3, rows: 1, children: [card('c1', [body('b1')]), card('c2', [body('b2')]), card('c3', [body('b3')])] } }
    const n = lay(grid, 1500, 400)
    const hit = findBlockGroup(n, 'b2')!
    expect(hit.group.type).toBe('tls.t.body')
    expect(hit.box.x).toBeGreaterThan(500)
    expect(findBlockGroup(n, 'c3')!.group.type).toBe('tls.l.card')
  })
})

describe('CMP1 depth (F3) — one limit, dropped = error', () => {
  const chain = (levels: number): BlockSpec => {
    let b: BlockSpec = body(`leaf`)
    for (let i = levels - 1; i >= 1; i--) b = { id: `s${i}`, type: 'tls.l.stack', props: { children: [b] } }
    return b
  }
  it(`a ${MAX_NESTING_DEPTH}-level tree draws; ${MAX_NESTING_DEPTH + 1} levels reports block/dropped`, () => {
    const slide = (levels: number): SlideSpec => ({ id: 's', layout: 'blank', regions: { content: [chain(levels)] } })
    expect(analyzeSlide(slide(MAX_NESTING_DEPTH)).findings.filter((f) => f.code === 'block/dropped')).toEqual([])
    const r = analyzeSlide(slide(MAX_NESTING_DEPTH + 1))
    const f = r.findings.filter((x) => x.code === 'block/dropped')
    expect(f).toHaveLength(1)
    expect(f[0].severity).toBe('error')
    expect(f[0].message).toContain('leaf')
  })
  it('composites inside a deep tree are not cut by their own internal levels', () => {
    let b: BlockSpec = { id: 'sc', type: 'tls.c.stat-card', props: { value: '42%', unit: 'growth', caption: 'year on year' } }
    for (let i = MAX_NESTING_DEPTH - 1; i >= 1; i--) b = { id: `s${i}`, type: 'tls.l.stack', props: { children: [b] } }
    const n = lay(b, 800, 600)
    expect(all(n).some((x) => x.part === 'lint/depth-overflow')).toBe(false)
    expect(texts(n).length).toBeGreaterThan(0)
  })
})

describe('CMP1 region layers: nested anchorTo, bleed, overImage', () => {
  it('anchorTo a block nested in a stacked grid puts the badge on that card', () => {
    const slide: SlideSpec = {
      id: 's',
      layout: 'blank',
      regions: {
        content: [
          { id: 'g', type: 'tls.l.grid', props: { columns: 3, rows: 1, children: [card('c1', [body('b1')]), card('c2', [body('b2')]), card('c3', [body('b3')])] } },
          { id: 'badge', type: 'tls.d.trend-badge', props: { delta: 12, format: 'percent' }, layer: 'overlay', anchor: 'top-right', anchorTo: 'c2' },
        ],
      },
    }
    const shapes = compileSlide(slide, FRAME, tokens, registry).shapes
    const at = (id: string) => shapes.find((s) => (s.props[BLOCK_PROP_KEY] as { id: string }).id === id)!
    const grid = at('g')
    const b = at('badge')
    const third = grid.size[0] / 3
    // The badge sits in the middle third (card 2), at its top-right.
    expect(b.point[0]).toBeGreaterThan(grid.point[0] + third)
    expect(b.point[0] + b.size[0]).toBeLessThanOrEqual(grid.point[0] + 2 * third + 1)
    expect(b.point[1]).toBeLessThan(grid.point[1] + 120)
  })

  it('a bleeding backdrop may leave the frame without slide/overflow', () => {
    const deco = (bleed?: boolean): SlideSpec => ({
      id: 's',
      layout: 'blank',
      regions: { content: [{ id: 't', type: 'tls.t.title', props: { text: 'Hello' } }] },
      free: [{ block: { id: 'orb', type: 'tls.m.decoration', props: { shape: 'blob', tone: 'accent2', seed: 3 }, layer: 'backdrop', ...(bleed ? { bleed } : {}) }, box: { x: 1600, y: -100, width: 500, height: 500 } }],
    })
    expect(analyzeSlide(deco()).findings.some((f) => f.code === 'slide/overflow')).toBe(true)
    expect(analyzeSlide(deco(true)).findings.some((f) => f.code === 'slide/overflow')).toBe(false)
  })

  it('a layered image backdrop marks its region’s blocks overImage', () => {
    const slide: SlideSpec = {
      id: 's',
      layout: 'blank',
      regions: {
        content: [
          { id: 'img', type: 'tls.m.image', props: { src: 'https://example.com/a.jpg', alt: 'a' }, layer: 'backdrop' },
          { id: 't', type: 'tls.t.title', props: { text: 'Over a photo' } },
        ],
      },
    }
    const shapes = compileSlide(slide, FRAME, tokens, registry).shapes
    const meta = (id: string) => shapes.find((s) => (s.props[BLOCK_PROP_KEY] as { id: string }).id === id)!.props[BLOCK_PROP_KEY] as { overImage?: boolean }
    expect(meta('t').overImage).toBe(true)
    expect(meta('img').overImage).toBeUndefined()
  })
})
