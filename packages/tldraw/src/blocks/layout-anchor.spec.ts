/**
 * LO2.1 — anchors for layered blocks, the backdrop text policy, the title band and region
 * alignment (`reviews/blocks/layout-oracle/README.md` §LO2.1).
 */
import type { BlockSpec, DeckSpec, SlideSpec } from './types'
import { BLOCK_ANCHORS } from './types'
import { blockAnchor } from './block-layer'
import { analyzeSlide, type LayoutReport } from './layout-report'
import { anchoredBox, compileSlide } from './slide-compiler'
import { resolveTokens } from './tokens'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import { defaultBlockRegistry, validateDeckSpec } from './validate-deck-spec'
import { blockToShape, shapeToBlock } from './shape-bridge'
import { deckSpecToDocument } from './deck-document'
import { documentToDeckSpec } from './slide-decompiler'
import { deckSpecJsonSchema } from './deck-spec-json-schema'
import { capabilityIndex } from './capability-digest'
import { getSlideLayout } from './slide-layouts'

const FRAME = { width: 1920, height: 1080 }
const tokens = resolveTokens(DEFAULT_DECK_THEME)
const registry = defaultBlockRegistry()

const statCard = (id: string): BlockSpec => ({
  id,
  type: 'tls.c.stat-card',
  props: { icon: 'zap', value: '$4.2M', unit: 'Annual Revenue', caption: 'FY2024 total' },
})
const badge = (id: string, extra: Partial<BlockSpec> = {}): BlockSpec => ({
  id,
  type: 'tls.d.trend-badge',
  props: { delta: -3.2, format: 'percent', polarity: 'downGood' },
  layer: 'overlay',
  ...extra,
})
const title = (id: string, text: string): BlockSpec => ({ id, type: 'tls.t.title', props: { text } })
const watermark = (id: string): BlockSpec => ({
  id,
  type: 'tls.x.watermark',
  props: { text: 'DRAFT', opacity: 'faint' },
  layer: 'backdrop',
})

const errors = (r: LayoutReport) => r.findings.filter((f) => f.severity === 'error')
const has = (r: LayoutReport, code: string, severity: string, ids: string[]) =>
  r.findings.some((f) => f.code === code && f.severity === severity && ids.every((id) => f.blockIds.includes(id)))
const boxOf = (slide: SlideSpec, id: string) => {
  const s = compileSlide(slide, FRAME, tokens, registry).shapes.find((x) => (x.props.$block as { id: string }).id === id)!
  return { x: s.point[0], y: s.point[1], width: s.size[0], height: s.size[1] }
}
const regionsOf = (layout: string) => getSlideLayout(layout as 'two-column')!.compile(FRAME, tokens)

/** The visual-check slide: a badge on a card's corner, a watermark behind the title. */
export const ANCHOR_SLIDE: SlideSpec = {
  id: 's_anchor',
  layout: 'two-column',
  regions: {
    title: [watermark('wm'), title('t', 'Revenue grew 42% this year')],
    left: [statCard('card'), badge('badge', { anchorTo: 'card' })],
    right: [{ id: 'kpi', type: 'tls.c.kpi-tile', props: { value: '42%', label: 'Growth' } }, badge('b2', { props: { delta: 5, format: 'percent' } })],
  },
}

describe('LO2.1 — anchor vocabulary and defaults', () => {
  it('blockAnchor: instance > definition > fill', () => {
    const def = registry.get('tls.d.trend-badge')
    expect(def?.anchor).toBe('top-right')
    expect(blockAnchor(badge('b'), def)).toBe('top-right')
    expect(blockAnchor(badge('b', { anchor: 'bottom-left' }), def)).toBe('bottom-left')
    expect(blockAnchor({ id: 'a', type: 'tls.g.arrow', props: {} }, registry.get('tls.g.arrow'))).toBe('fill')
    expect(blockAnchor(watermark('w'), registry.get('tls.x.watermark'))).toBe('fill')
    // Garbage falls back to the definition.
    expect(blockAnchor(badge('b', { anchor: 'middle' as never }), def)).toBe('top-right')
  })
})

describe('LO2.1 — compiler places anchored layered blocks', () => {
  it('a region overlay badge sits at its natural size in the region top-right corner (default anchor)', () => {
    const right = regionsOf('two-column').right
    const slide: SlideSpec = { id: 's', layout: 'two-column', regions: { right: [statCard('c'), badge('b')] } }
    const b = boxOf(slide, 'b')
    expect(b.width).toBeLessThan(right.width / 3)
    expect(b.height).toBeLessThan(120)
    expect(b.x + b.width).toBeCloseTo(right.x + right.width, 5)
    expect(b.y).toBeCloseTo(right.y, 5)
    // The pill is not shrunk to fit its box: the text keeps its caption size.
    const r = analyzeSlide(slide)
    const leaf = r.blocks.find((x) => x.id === 'b')!.text[0]
    expect(leaf.fontSize).toBeCloseTo(tokens.type.caption.size, 5)
    expect(r.blocks.find((x) => x.id === 'b')!.contentOverflow).toEqual({ dx: 0, dy: 0 })
  })

  it("anchor 'fill' keeps the LO2 region box", () => {
    const right = regionsOf('two-column').right
    const slide: SlideSpec = { id: 's', layout: 'two-column', regions: { right: [badge('b', { anchor: 'fill' })] } }
    expect(boxOf(slide, 'b')).toEqual(right)
  })

  it('every corner/edge anchor lands on its edge of the region, same size', () => {
    const rb = regionsOf('two-column').left
    const size = boxOf({ id: 's', layout: 'two-column', regions: { left: [badge('b')] } }, 'b')
    for (const anchor of BLOCK_ANCHORS.filter((a) => a !== 'fill')) {
      const b = boxOf({ id: 's', layout: 'two-column', regions: { left: [badge('b', { anchor })] } }, 'b')
      expect([b.width, b.height]).toEqual([size.width, size.height])
      const col = anchor.endsWith('left') ? 0 : anchor.endsWith('right') ? 2 : 1
      const row = anchor.startsWith('top') ? 0 : anchor.startsWith('bottom') ? 2 : 1
      expect(b.x).toBeCloseTo(rb.x + ((rb.width - b.width) * col) / 2, 5)
      expect(b.y).toBeCloseTo(rb.y + ((rb.height - b.height) * row) / 2, 5)
    }
  })

  it("anchorTo puts the badge inside the target card's corner (inset space.sm), clear of its text", () => {
    const r = analyzeSlide(ANCHOR_SLIDE, { metrics: 'estimate' })
    // The stat card paints a full-box surface, so its visible corner is its box corner.
    const card = boxOf(ANCHOR_SLIDE, 'card')
    const b = boxOf(ANCHOR_SLIDE, 'badge')
    expect(b.x + b.width).toBeCloseTo(card.x + card.width - tokens.space.sm, 5)
    expect(b.y).toBeCloseTo(card.y + tokens.space.sm, 5)
    expect(errors(r)).toEqual([])
    expect(has(r, 'layout/overlap', 'info', ['card', 'badge'])).toBe(true)
    // Overlays still paint last.
    const z = Object.fromEntries(r.blocks.map((x) => [x.id, x.z]))
    expect(z.badge).toBeGreaterThan(z.card)
    expect(z.wm).toBe(1)
  })

  it('an unknown anchorTo falls back to the region box (and validation names it)', () => {
    const slide: SlideSpec = { id: 's', layout: 'two-column', regions: { left: [statCard('card'), badge('b', { anchorTo: 'crad' })] } }
    const left = regionsOf('two-column').left
    const b = boxOf(slide, 'b')
    expect(b.x + b.width).toBeCloseTo(left.x + left.width, 5)
    expect(b.y).toBeCloseTo(left.y, 5)
    const deck: DeckSpec = { version: 1, id: 'd', title: 'A', theme: 'mono-grid', aspect: 'widescreen', slides: [slide] }
    const f = validateDeckSpec(deck).find((x) => x.rule === 'block/anchor-target')!
    expect(f.level).toBe('error')
    expect(f.path).toBe('slides[0].regions.left[1].anchorTo')
    expect(f.suggestion).toBe('card')
  })

  it('the stacked flow is untouched by anchors and compiling is deterministic', () => {
    const flowOnly: SlideSpec = { ...ANCHOR_SLIDE, regions: { title: [ANCHOR_SLIDE.regions.title[1]], left: [statCard('card')], right: [ANCHOR_SLIDE.regions.right[0]] } }
    for (const id of ['t', 'card', 'kpi']) expect(boxOf(ANCHOR_SLIDE, id)).toEqual(boxOf(flowOnly, id))
    const geometry = () => compileSlide(ANCHOR_SLIDE, FRAME, tokens, registry).shapes.map((x) => [x.childIndex, x.point, x.size])
    expect(geometry()).toEqual(geometry())
  })

  it('anchorTo a text-only block anchors to its painted text, not its (wider) box', () => {
    const slide: SlideSpec = {
      id: 's',
      layout: 'two-column',
      regions: { left: [{ id: 'k', type: 'tls.t.body', props: { text: 'Churn fell this quarter.' } }, badge('b', { anchorTo: 'k' })] },
    }
    const k = analyzeSlide(slide, { metrics: 'estimate' }).blocks.find((x) => x.id === 'k')!
    const b = boxOf(slide, 'b')
    const solo = boxOf({ id: 's', layout: 'two-column', regions: { left: [badge('b')] } }, 'b')
    expect([b.width, b.height]).toEqual([solo.width, solo.height])
    expect(b.x + b.width).toBeCloseTo(k.painted!.x + k.painted!.width - tokens.space.sm, 0)
    expect(b.x + b.width).toBeLessThan(k.box.x + k.box.width - 100)
  })

  it('an elastic overlay (arrow) with a corner anchor gets its preferred size, clamped to the box', () => {
    const arrow: BlockSpec = { id: 'a', type: 'tls.g.arrow', props: { label: 'Then' }, layer: 'overlay', anchor: 'bottom-right' }
    const def = registry.get('tls.g.arrow')!
    const box = anchoredBox(arrow, def, { x: 0, y: 0, width: 300, height: 1000 }, 0, tokens, registry)
    expect([box.width, box.height]).toEqual([300, def.size.preferred[1]])
    expect(box.y + box.height).toBe(1000)
  })

  it('anchor and anchorTo survive blockToShape/shapeToBlock and the document round trip', () => {
    const spec = badge('b1', { anchor: 'bottom-left', anchorTo: 'card' })
    expect(shapeToBlock(blockToShape(spec, { x: 0, y: 0, width: 100, height: 50 }))).toEqual(spec)
    const deck: DeckSpec = { version: 1, id: 'd', title: 'A', theme: 'mono-grid', aspect: 'widescreen', slides: [ANCHOR_SLIDE] }
    const back = documentToDeckSpec(deckSpecToDocument(deck).document).spec.slides[0]
    expect(back.free ?? []).toEqual([])
    expect(back.regions.left.find((b) => b.id === 'badge')).toMatchObject({ layer: 'overlay', anchorTo: 'card' })
    expect(back.regions.right.find((b) => b.id === 'b2')).toMatchObject({ layer: 'overlay' })
    const boxes = (s: SlideSpec) =>
      compileSlide(s, FRAME, tokens, registry)
        .shapes.map((x) => [(x.props.$block as { id: string }).id, ...x.point, ...x.size])
        .sort()
    expect(boxes(back)).toEqual(boxes(ANCHOR_SLIDE))
  })
})

describe('LO2.1 — backdrop text policy', () => {
  it('a region watermark behind the title is info, not an error', () => {
    const r = analyzeSlide(ANCHOR_SLIDE)
    expect(has(r, 'text/collision', 'info', ['wm', 't'])).toBe(true)
    expect(r.findings.find((f) => f.code === 'text/collision')!.message).toMatch(/backdrop wm sits behind/)
  })
})

describe('LO2.1 — validation, schema, digest', () => {
  const deckWith = (blocks: unknown[]): DeckSpec =>
    ({ version: 1, id: 'd', title: 'A', theme: 'mono-grid', aspect: 'widescreen', slides: [{ id: 's', layout: 'two-column', regions: { left: blocks } }] }) as DeckSpec
  const rules = (d: DeckSpec) =>
    validateDeckSpec(d)
      .filter((f) => f.rule.startsWith('block/anchor'))
      .map((f) => `${f.level} ${f.rule}`)

  it('accepts the vocabulary and a valid anchorTo', () => {
    expect(rules(deckWith([statCard('c'), badge('b', { anchor: 'bottom', anchorTo: 'c' })]))).toEqual([])
  })

  it('rejects an anchor outside the vocabulary', () => {
    expect(rules(deckWith([badge('b', { anchor: 'middle' as never })]))).toContain('error block/anchor')
  })

  it('warns when an anchor has no layer to act on, or sits inside a container', () => {
    const plain = { ...badge('b', { anchor: 'top' }), layer: undefined }
    expect(rules(deckWith([plain]))).toContain('warning block/anchor-unused')
    const nested = { id: 'card', type: 'tls.l.card', props: {}, children: [badge('b', { anchor: 'top' })] }
    expect(rules(deckWith([nested]))).toContain('warning block/anchor-unused')
  })

  it('anchorTo must name a stacked block of the same region (not a layered one)', () => {
    expect(rules(deckWith([statCard('c'), badge('b1'), badge('b2', { anchorTo: 'b1' })]))).toContain('error block/anchor-target')
    expect(rules(deckWith([badge('b', { anchorTo: 42 as never })]))).toContain('error block/anchor-target')
  })

  it('the JSON schema has anchor (closed enum) and anchorTo', () => {
    const s = JSON.stringify(deckSpecJsonSchema(registry))
    expect(s).toContain(JSON.stringify([...BLOCK_ANCHORS]))
    expect(s).toContain('"anchorTo"')
  })

  it('the capability index mentions anchor/anchorTo and stays within 20k', () => {
    const md = capabilityIndex(registry)
    expect(md).toContain('`anchorTo')
    expect(md.length).toBeLessThanOrEqual(20000)
  })
})

describe('LO2.1 — title band and region alignment', () => {
  it('the title band holds one default-size title line', () => {
    const band = getSlideLayout('two-column')!.compile(FRAME, tokens).title.height
    expect(band).toBeGreaterThanOrEqual(tokens.type.title.size * tokens.type.title.lineHeight + 2)
    const r = analyzeSlide({ id: 's', layout: 'two-column', regions: { title: [title('t', 'Quarterly results')] } })
    expect(r.findings.filter((f) => f.code === 'text/shrunk')).toEqual([])
    expect(r.findings.filter((f) => f.code === 'text/shrunk' || f.severity !== 'info')).toEqual([])
    // with the editor's own metrics too
    const e = analyzeSlide({ id: 's', layout: 'two-column', regions: { title: [title('t', 'Quarterly results')] } }, { metrics: 'estimate' })
    expect(e.findings.filter((f) => f.code === 'text/shrunk')).toEqual([])
  })

  it("a 'center'-aligned region centres a block shorter than the region", () => {
    const q = getSlideLayout('quote')!.compile(FRAME, tokens).quote
    const slide: SlideSpec = { id: 's', layout: 'quote', regions: { quote: [{ id: 'k', type: 'tls.t.kicker', props: { text: 'Short' } }] } }
    const k = boxOf(slide, 'k')
    expect(k.height).toBeLessThan(q.height)
    expect(k.y - q.y).toBeCloseTo((q.height - k.height) / 2, 5)
  })
})
