/**
 * CMP1 — the export-ready contract's engine half (composition README §2 CMP1, SURVEY §B3 X1–X3,
 * X5, X6, X8): a headless, final-frame layout of a whole slide, and the default `blocks` callback
 * that lets `renderPageToSvg` draw real blocks instead of placeholders (BACKLOG-demo Q9 step 3).
 *
 * `layoutSlide(spec, ctx)` / `layoutDeck(deck)` run the editor's own path —
 * `deckSpecToDocument` → `contextForBlock` → `layoutBlock` — so the tree is what the editor paints
 * at rest (motion's final frame), and return:
 * - `nodes`: one group per block (paint order), at the block's absolute box, carrying `blockId` /
 *   `type` (X2; nested blocks carry them on their wrapper groups), text nodes annotated with
 *   `weight` (X3; `align` is set where centred / end text is laid out);
 * - `blocks`: id, type, box, layer, z and the block's props (X8: an exporter can choose a native
 *   chart from the data, or the drawn shapes).
 *
 * Clip policy (X6): see `LayoutNode` group `clip` — rectangular only; an exporter pre-clips.
 * Colours (X5): `parseColorAlpha` (`color-math.ts`) reads `#rgb`, `#rrggbb`, `#rrggbbaa` and
 * `rgb()/rgba()` into a hex colour plus alpha.
 *
 * Pure and DOM-free.
 */

import type { ComponentShape, TDDocument, TDPage } from '~types'
import type { BlockLayer, BlockSpec, Box, DeckSpec, LayoutNode, SlideSpec } from './types'
import type { BlockRegistry } from './registry'
import { BlockRegistry as Registry } from './registry'
import { registerBuiltInBlocks } from './library'
import { deckSpecToDocument } from './deck-document'
import { contextForBlock } from './deck-context'
import { layoutBlock } from './layout/layout-child'
import { BLOCK_PROP_KEY, shapeToBlock } from './shape-bridge'
import { blockLayer } from './block-layer'
import { renderNodeToSvg } from './render-svg'

/** One laid-out block of a slide. */
export interface LaidOutBlock {
  id: string
  type: string
  /** Slide coordinates. */
  box: Box
  layer: BlockLayer
  /** Paint order (higher on top). */
  z: number
  /** The props the block was laid out with (the deck style's knob defaults filled in). */
  props: Record<string, unknown>
}

/** A slide laid out headlessly, at rest. */
export interface LaidOutSlide {
  slideId: string
  frame: { width: number; height: number }
  /** One group per block in paint order, at its absolute box (`blockId`, `type`). */
  nodes: LayoutNode[]
  blocks: LaidOutBlock[]
}

export interface LayoutSlideContext {
  /** Deck-level settings the slide is laid out under (theme, style, aspect, tokens). */
  deck?: Omit<DeckSpec, 'slides'>
  registry?: BlockRegistry
}

/** The block a component shape holds: its `$block` spec, else (a shape inserted without one, e.g.
 *  `Deck.addBlock`) its `componentId` and props as they are — what `ComponentUtil` renders. */
function blockOf(shape: ComponentShape): BlockSpec | undefined {
  const spec = shapeToBlock(shape)
  if (spec) return spec
  if (typeof shape.componentId !== 'string') return undefined
  return { id: shape.id, type: shape.componentId, props: { ...(shape.props ?? {}) } }
}

let builtIn: BlockRegistry | undefined
function defaultRegistry(): BlockRegistry {
  if (!builtIn) {
    builtIn = new Registry()
    registerBuiltInBlocks(builtIn)
  }
  return builtIn
}

/** Paragraph weight (X3): 700 when every run of every line is bold, else 400. */
function annotateText(node: LayoutNode): LayoutNode {
  if (node.k === 'group') return { ...node, children: node.children.map(annotateText) }
  if (node.k === 'host' && node.poster) return { ...node, poster: annotateText(node.poster) }
  if (node.k !== 'text') return node
  const runs = node.lines.flatMap((l) => (l.runs && l.runs.length ? l.runs : [{ text: l.text }]))
  const allBold = runs.length > 0 && runs.every((r) => (r as { bold?: boolean }).bold === true || !r.text.trim())
  return { ...node, weight: allBold ? 700 : 400 }
}

/** Lay out every block shape of one page of a compiled document. */
export function layoutPage(page: TDPage, doc: TDDocument, registry: BlockRegistry = defaultRegistry()): Omit<LaidOutSlide, 'slideId'> {
  const frame = { width: page.size?.[0] ?? doc.defaultPageSize?.[0] ?? 1920, height: page.size?.[1] ?? doc.defaultPageSize?.[1] ?? 1080 }
  const shapes = Object.values(page.shapes)
    .filter((s): s is ComponentShape => (s as { type?: string }).type === 'component')
    .sort((a, b) => a.childIndex - b.childIndex)
  const nodes: LayoutNode[] = []
  const blocks: LaidOutBlock[] = []
  shapes.forEach((shape, i) => {
    const spec: BlockSpec | undefined = blockOf(shape)
    const def = spec ? registry.get(spec.type) : undefined
    if (!spec || !def) return
    const box: Box = { x: shape.point[0], y: shape.point[1], width: shape.size[0], height: shape.size[1] }
    const ctx = contextForBlock(shape, doc, { headless: true, slideBackground: page.background, registry })
    let root: LayoutNode
    try {
      root = layoutBlock(def, spec.props, ctx)
    } catch {
      return
    }
    nodes.push({ k: 'group', box, blockId: spec.id, type: spec.type, children: [annotateText(root)] })
    blocks.push({ id: spec.id, type: spec.type, box, layer: blockLayer(spec, def), z: i + 1, props: JSON.parse(JSON.stringify(spec.props)) })
  })
  return { frame, nodes, blocks }
}

/** X1 — lay out one slide headlessly (the editor's path, at rest). */
export function layoutSlide(spec: SlideSpec, ctx: LayoutSlideContext = {}): LaidOutSlide {
  return layoutDeck({ ...(ctx.deck ?? {}), slides: [spec] } as DeckSpec, ctx.registry)[0]
}

/** X1 — lay out every slide of a deck headlessly. */
export function layoutDeck(deck: DeckSpec, registry: BlockRegistry = defaultRegistry()): LaidOutSlide[] {
  const { document } = deckSpecToDocument(deck)
  return deck.slides.map((s) => {
    const page = document.pages[s.id]
    return { slideId: s.id, ...layoutPage(page, document, registry) }
  })
}

/**
 * Q9 step 3 — the default `blocks` callback for `renderPageToSvg`: lays a block shape out with the
 * document's tokens and the page's background (`contextForBlock`, headless) and returns its SVG
 * markup in the shape's local coordinates. `undefined` for a type the registry does not know (the
 * renderer then draws its placeholder, as before).
 */
export function defaultBlockSvg(doc: TDDocument, page: TDPage | undefined, registry: BlockRegistry = defaultRegistry()): (shape: ComponentShape) => string | undefined {
  return (shape) => {
    const spec = blockOf(shape)
    const def = spec ? registry.get(spec.type) : undefined
    if (!spec || !def) return undefined
    try {
      const ctx = contextForBlock(shape, doc, { headless: true, slideBackground: page?.background, registry })
      const root = layoutBlock(def, spec.props, ctx)
      const prefix = `b${String((shape.props[BLOCK_PROP_KEY] as { id?: string } | undefined)?.id ?? shape.id).replace(/[^A-Za-z0-9_-]/g, '_')}-`
      // Inline the content (defs + tree), not a nested <svg> (which would clip to 100% of the page).
      return renderNodeToSvg(root, prefix).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
    } catch {
      return undefined
    }
  }
}
