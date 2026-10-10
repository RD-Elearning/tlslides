/**
 * LO2 — layers & intentional overlap (`reviews/blocks/layout-oracle/README.md` §LO2).
 *
 * Covers: the layer vocabulary on every built-in block, the AI-writable stacking path
 * (`BlockSpec.layer` on a region block → out of the stack, region box, z under/over the flow),
 * the layer policy in `analyzeSlide`, the round trip, and validation / schema / digest.
 */
import type { ComponentShape } from '~types'
import type { BlockSpec, DeckSpec, SlideSpec } from './types'
import { BLOCK_LAYERS } from './types'
import { BUILT_IN_BLOCKS } from './library'
import { blockLayer, definitionLayer } from './block-layer'
import { analyzeSlide, formatLayoutReport, type LayoutReport } from './layout-report'
import { compileSlide } from './slide-compiler'
import { resolveTokens } from './tokens'
import { DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import { defaultBlockRegistry, validateDeckSpec } from './validate-deck-spec'
import { blockToShape, shapeToBlock } from './shape-bridge'
import { deckSpecToDocument } from './deck-document'
import { documentToDeckSpec } from './slide-decompiler'
import { deckSpecJsonSchema } from './deck-spec-json-schema'
import { capabilityIndex, capabilityIndexData } from './capability-digest'
import { getSlideLayout } from './slide-layouts'

const FRAME = { width: 1920, height: 1080 }
const tokens = resolveTokens(DEFAULT_DECK_THEME)
const registry = defaultBlockRegistry()

const blob = (id: string, extra: Partial<BlockSpec> = {}): BlockSpec => ({
  id,
  type: 'tls.m.decoration',
  props: { shape: 'blob', tone: 'accent2', opacity: 'soft', seed: 7 },
  ...extra,
})
const statCard = (id: string): BlockSpec => ({
  id,
  type: 'tls.c.stat-card',
  props: { icon: 'zap', value: '$4.2M', unit: 'Annual Revenue', caption: 'FY2024 total' },
})
const badge = (id: string, extra: Partial<BlockSpec> = {}): BlockSpec => ({
  id,
  type: 'tls.d.trend-badge',
  props: { delta: -3.2, format: 'percent', polarity: 'downGood' },
  ...extra,
})
const title = (id: string, text: string): BlockSpec => ({ id, type: 'tls.t.title', props: { text } })

const CARD_BOX = { x: 96, y: 232, width: 840, height: 600 }

const errors = (r: LayoutReport) => r.findings.filter((f) => f.severity === 'error')
const has = (r: LayoutReport, code: string, severity: string, ids: string[]) =>
  r.findings.some((f) => f.code === code && f.severity === severity && ids.every((id) => f.blockIds.includes(id)))

/** The stacked example slide quoted in the plan notes. */
const STACKED: SlideSpec = {
  id: 's_stack',
  layout: 'two-column',
  regions: {
    title: [title('t', 'Layered composite')],
    left: [blob('blob', { layer: 'backdrop' }), statCard('card')],
    right: [
      { id: 'kpi', type: 'tls.c.kpi-tile', props: { value: '42%', label: 'Growth' } },
      badge('badge', { layer: 'overlay' }),
    ],
  },
}

describe('LO2 — layer vocabulary on the built-in blocks', () => {
  it('derives backdrop for decoration and content otherwise, with explicit overrides', () => {
    const nonContent = Object.fromEntries(
      BUILT_IN_BLOCKS.map((d) => [d.type, definitionLayer(d)] as const).filter(([, l]) => l !== 'content')
    )
    expect(nonContent).toEqual({
      'tls.l.field': 'backdrop',
      'tls.l.grid-guide': 'backdrop',
      'tls.m.decoration': 'backdrop',
      'tls.m.pattern': 'backdrop',
      'tls.x.watermark': 'backdrop',
      'tls.d.trend-badge': 'overlay',
      'tls.g.arrow': 'overlay',
      // CMP3: a badge sits on a card or photo corner, like the trend badge.
      'tls.t.badge': 'overlay',
    })
    // Every explicit `layer` is in the vocabulary, and each override differs from the derivation.
    for (const d of BUILT_IN_BLOCKS) {
      if (d.layer === undefined) continue
      expect(BLOCK_LAYERS).toContain(d.layer)
      expect(d.layer).not.toBe(d.category === 'decoration' ? 'backdrop' : 'content')
      expect(registry.get(d.type)?.layer).toBe(d.layer)
    }
  })

  it('an instance layer overrides the definition', () => {
    const def = registry.get('tls.m.decoration')
    expect(blockLayer(blob('b'), def)).toBe('backdrop')
    expect(blockLayer(blob('b', { layer: 'content' }), def)).toBe('content')
    expect(blockLayer(statCard('c'), registry.get('tls.c.stat-card'))).toBe('content')
    expect(blockLayer(statCard('c'))).toBe('content')
  })
})

describe('LO2 — compiler: layered region blocks leave the stack', () => {
  const left = getSlideLayout('two-column')!.compile(FRAME, tokens).left

  it('a backdrop/overlay takes the region box, the flow is placed exactly as without it', () => {
    const plain: SlideSpec = { ...STACKED, regions: { title: STACKED.regions.title, left: [statCard('card')], right: [STACKED.regions.right[0]] } }
    const a = compileSlide(plain, FRAME, tokens, registry)
    const b = compileSlide(STACKED, FRAME, tokens, registry)
    const pos = (shapes: ComponentShape[], id: string) => {
      const s = shapes.find((x) => (x.props.$block as { id: string }).id === id)!
      return [s.point[0], s.point[1], s.size[0], s.size[1]]
    }
    for (const id of ['t', 'card', 'kpi']) expect(pos(b.shapes, id)).toEqual(pos(a.shapes, id))
    expect(pos(b.shapes, 'blob')).toEqual([left.x, left.y, left.width, left.height])

    // z: backdrop first, overlay last, childIndex 1..n in array order.
    const ids = b.shapes.map((s) => (s.props.$block as { id: string }).id)
    expect(ids[0]).toBe('blob')
    expect(ids[ids.length - 1]).toBe('badge')
    expect(b.shapes.map((s) => s.childIndex)).toEqual([1, 2, 3, 4, 5])
    expect(b.findings).toEqual(a.findings)
  })

  it('a slide without explicit layers compiles exactly as before (decoration stays in the stack)', () => {
    const slide: SlideSpec = { id: 's', layout: 'blank', regions: { content: [blob('d'), statCard('c')] } }
    const shapes = compileSlide(slide, FRAME, tokens, registry).shapes
    expect(shapes.map((s) => s.childIndex)).toEqual([1, 2])
    expect(shapes[1].point[1]).toBeGreaterThan(shapes[0].point[1])
  })

  it('a layered block in an unknown region is dropped with the region/unknown finding', () => {
    const slide: SlideSpec = { id: 's', layout: 'two-column', regions: { lft: [blob('d', { layer: 'backdrop' })] } }
    const r = compileSlide(slide, FRAME, tokens, registry)
    expect(r.shapes).toHaveLength(0)
    expect(r.findings.map((f) => f.rule)).toEqual(['region/unknown'])
  })

  it('layer survives blockToShape/shapeToBlock and the document round trip', () => {
    const spec = badge('b1', { layer: 'overlay' })
    expect(shapeToBlock(blockToShape(spec, CARD_BOX))).toEqual(spec)
    const deck: DeckSpec = { version: 1, id: 'd', title: 'L', theme: 'mono-grid', aspect: 'widescreen', slides: [STACKED] }
    const { document } = deckSpecToDocument(deck)
    const back = documentToDeckSpec(document).spec.slides[0]
    const all = Object.values(back.regions).flat()
    expect(all.find((b) => b.id === 'blob')?.layer).toBe('backdrop')
    expect(all.find((b) => b.id === 'badge')?.layer).toBe('overlay')
    expect(back.free ?? []).toEqual([])
    // Re-compiling the round-tripped slide gives the same boxes, backdrop still lowest and overlay
    // still highest. (The flow's own z can permute: the decompiler rebuilds region keys in
    // childIndex order — pre-existing, unrelated to layers.)
    const compiled = (s: SlideSpec) => compileSlide(s, FRAME, tokens, registry).shapes
    const boxes = (s: SlideSpec) =>
      compiled(s)
        .map((x) => [(x.props.$block as { id: string }).id, ...x.point, ...x.size])
        .sort()
    expect(boxes(back)).toEqual(boxes(STACKED))
    const order = compiled(back).map((x) => (x.props.$block as { id: string }).id)
    expect([order[0], order[order.length - 1]]).toEqual(['blob', 'badge'])
  })
})

describe('LO2 — layer policy in analyzeSlide', () => {
  it('a decoration under a card reports no error (info)', () => {
    const slide: SlideSpec = { id: 's', layout: 'two-column', regions: { left: [blob('d', { layer: 'backdrop' }), statCard('c')] } }
    const r = analyzeSlide(slide)
    expect(errors(r)).toEqual([])
    expect(has(r, 'layout/overlap', 'info', ['d', 'c'])).toBe(true)
    const d = r.blocks.find((b) => b.id === 'd')!
    expect([d.layer, d.outOfFlow, d.z]).toEqual(['backdrop', true, 1])
    // Not part of the region's stack: no region overflow from the backdrop's height.
    expect(r.findings.some((f) => f.code === 'region/overflow')).toBe(false)
  })

  it('a badge over the card title → text/occluded', () => {
    const base: SlideSpec = { id: 's', layout: 'blank', regions: {}, free: [{ block: statCard('c'), box: CARD_BOX }] }
    const target = analyzeSlide(base).blocks[0].text[0].painted
    const slide: SlideSpec = {
      ...base,
      free: [...base.free!, { block: badge('b'), box: { x: target.x, y: target.y, width: 320, height: 64 } }],
    }
    const r = analyzeSlide(slide)
    expect(r.blocks.map((b) => b.layer)).toEqual(['content', 'overlay'])
    expect(has(r, 'text/occluded', 'error', ['b', 'c'])).toBe(true)
    expect(r.findings.some((f) => f.code === 'layout/overlap' && f.severity === 'error')).toBe(false)
  })

  it('a region overlay that paints clear of the text is allowed (judged by what it paints)', () => {
    const r = analyzeSlide(STACKED)
    expect(has(r, 'layout/overlap', 'info', ['kpi', 'badge'])).toBe(true)
    expect(r.findings.some((f) => f.code === 'text/occluded')).toBe(false)
    expect(errors(r)).toEqual([])
  })

  it('two content blocks overlapping → layout/overlap error', () => {
    const slide: SlideSpec = {
      id: 's',
      layout: 'blank',
      regions: {},
      free: [
        { block: statCard('c1'), box: CARD_BOX },
        { block: statCard('c2'), box: { ...CARD_BOX, x: CARD_BOX.x + 300 } },
      ],
    }
    expect(has(analyzeSlide(slide), 'layout/overlap', 'error', ['c1', 'c2'])).toBe(true)
  })

  it('text ∩ text across blocks → text/collision; info only under a backdrop that is behind (LO2.1)', () => {
    const box = { x: 96, y: 96, width: 1200, height: 160 }
    const slide: SlideSpec = {
      id: 's',
      layout: 'blank',
      regions: {},
      free: [
        { block: { id: 'w', type: 'tls.x.watermark', props: { text: 'DRAFT', opacity: 'faint' } }, box },
        { block: title('t', 'Revenue grew 42% this year'), box },
      ],
    }
    const r = analyzeSlide(slide)
    expect(r.blocks[0].layer).toBe('backdrop')
    expect(has(r, 'layout/overlap', 'info', ['w', 't'])).toBe(true)
    // LO2.1: a watermark is designed to sit behind the title — the collision is intended.
    expect(has(r, 'text/collision', 'info', ['w', 't'])).toBe(true)
    expect(has(r, 'text/collision', 'error', ['w', 't'])).toBe(false)
    expect(errors(r)).toEqual([])
    // The same watermark *above* the title (later in free[] = higher z) is still an error.
    const above = analyzeSlide({ ...slide, free: [slide.free![1], slide.free![0]] })
    expect(has(above, 'text/collision', 'error', ['w', 't'])).toBe(true)
    // Content text ∩ content text stays an error.
    const two = analyzeSlide({ ...slide, free: [slide.free![1], { block: title('t2', 'Revenue grew 42% this year'), box }] })
    expect(has(two, 'text/collision', 'error', ['t', 't2'])).toBe(true)
  })

  it('a backdrop above content in z → error', () => {
    const slide: SlideSpec = {
      id: 's',
      layout: 'blank',
      regions: {},
      free: [
        { block: statCard('c'), box: CARD_BOX },
        { block: blob('d'), box: CARD_BOX },
      ],
    }
    const r = analyzeSlide(slide)
    const f = r.findings.find((x) => x.code === 'layout/overlap' && x.blockIds.includes('d'))!
    expect(f.severity).toBe('error')
    expect(f.message).toMatch(/backdrop d paints over c/)
    // Same pair with the backdrop first in free[] (lower z) is intended.
    const ok = analyzeSlide({ ...slide, free: [slide.free![1], slide.free![0]] })
    expect(has(ok, 'layout/overlap', 'info', ['d', 'c'])).toBe(true)
  })

  it('the stacked example formats to a stable text report', () => {
    expect(formatLayoutReport(analyzeSlide(STACKED))).toMatchSnapshot()
  })
})

describe('LO2 — validation, JSON schema, digest', () => {
  const deckWith = (block: BlockSpec, nested = false): DeckSpec => ({
    version: 1,
    id: 'd',
    title: 'L',
    theme: 'mono-grid',
    aspect: 'widescreen',
    slides: [
      {
        id: 's',
        layout: 'blank',
        regions: {
          content: nested ? [{ id: 'row', type: 'tls.l.row', props: { children: [block] } }] : [block],
        },
      },
    ],
  })

  it('validateDeckSpec accepts the vocabulary and rejects anything else', () => {
    for (const layer of BLOCK_LAYERS) {
      expect(validateDeckSpec(deckWith(blob('b', { layer }))).filter((f) => f.rule.startsWith('block/layer'))).toEqual([])
    }
    const bad = validateDeckSpec(deckWith(blob('b', { layer: 'behind' as never })))
    const f = bad.find((x) => x.rule === 'block/layer')!
    expect(f.level).toBe('error')
    expect(f.path).toBe('slides[0].regions.content[0].layer')
  })

  it('a layer inside a container is a warning (it only stacks in a region)', () => {
    const findings = validateDeckSpec(deckWith(blob('b', { layer: 'backdrop' }), true))
    expect(findings.some((x) => x.rule === 'block/layer-nested' && x.level === 'warning')).toBe(true)
  })

  it('the JSON schema allows `layer` with the closed enum', () => {
    const schema = JSON.stringify(deckSpecJsonSchema())
    expect(schema).toContain('"layer":{"enum":["backdrop","content","overlay"]')
  })

  it('the capability index names the non-content layers and the stacking rule, within budget', () => {
    const md = capabilityIndex()
    expect(md.length).toBeLessThanOrEqual(20000)
    expect(md).toContain('tls.m.decoration · decoration · element · backdrop — ')
    expect(md).toContain('tls.d.trend-badge · metric · element · overlay — ')
    expect(md).toContain('tls.t.title · heading · element — ')
    expect(md).toContain('set `layer` on the block')
    const data = capabilityIndexData()
    expect(data.find((e) => e.type === 'tls.l.field')?.layer).toBe('backdrop')
    expect(data.find((e) => e.type === 'tls.t.title')?.layer).toBeUndefined()
  })
})
