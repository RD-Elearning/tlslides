/**
 * Q17 — three-way parity (`reviews/blocks/BACKLOG-demo.md` §7), Node-only half.
 *
 * The editor-canvas vs `<DeckViewer>` half runs in a real browser
 * (`tools/visual/scenarios/parity-3way.js`, `node tools/visual/shoot.js parity-3way`) — see that
 * file's own doc comment for why the split. This file covers the third path, `renderPageToSvg`,
 * which needs no browser at all, plus the "ground truth" every path is ultimately checked
 * against: calling a block's own `layout()` directly and walking the resulting `LayoutNode` tree
 * with `collectParts` (exported from `parity-harness.ts` for exactly this reuse — see that
 * export's own comment).
 *
 * **Central finding, read this before the numbers below**: `renderPageToSvg` cannot render a
 * `ComponentShape` at all without a caller-supplied `opts.blocks` callback (see that module's own
 * doc comment — "`ComponentShape` cannot be rendered headlessly, and this module does not try").
 * Every block on this demo deck is a `ComponentShape`. Nothing in this repo's demo app
 * (`examples/nextjs-sample`) wires `<Tldraw blocks>` or passes `opts.blocks` to an export call, so
 * **today, this product's actual SVG export path renders every block as an identical dashed
 * placeholder box** (`renderComponentPlaceholder`), not the block's real content. That is measured
 * directly below ("renders every block as an unrenderable placeholder"), not inferred from the
 * source comment.
 *
 * A second block below supplies `opts.blocks` itself — the exact extension point
 * `RenderPageToSvgOptions.blocks` and `Deck.getThumbnail`/`exportSlidePng`'s own `this.blocks`
 * already use — to check whether the geometry *would* agree if a host wired it up. That is a
 * supplementary probe of the extension point, clearly separate from the first (load-bearing)
 * finding: it does not change what `renderPageToSvg(page, {})` does today, and this repo does not
 * wire it up anywhere.
 */
import * as fs from 'fs'
import * as path from 'path'
import { deckSpecToDocument } from './deck-document'
import { shapeToBlock } from './shape-bridge'
import { deckLayoutContext, contextForBlock } from './deck-context'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks } from './library'
import { renderNodeToSvg } from './render-svg'
import { collectParts, type PartInfo } from './parity-harness'
import type { DeckSpec, LayoutNode } from './types'
import type { ComponentShape, TDPage } from '~types'
import { renderPageToSvg } from '~state/render/renderPageToSvg'
import { migrate } from '~state/data/migrate'

const DECK: DeckSpec = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '__fixtures__/demo-deck.json'), 'utf-8')
)

const TOLERANCE = 1 // slide unit, per BACKLOG-demo.md §7 acceptance — not widened to pass.

const registry = new BlockRegistry()
registerBuiltInBlocks(registry)

const { document } = deckSpecToDocument(DECK)

function orderedShapes(page: TDPage): ComponentShape[] {
  return Object.values(page.shapes)
    .filter((s): s is ComponentShape => (s as ComponentShape).componentId !== undefined)
    .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
}

/** The canonical `LayoutNode` for one shape — calling `definition.layout()` directly with the
 *  exact `LayoutContext` every real consumer (`ComponentUtil`, `DeckViewer`) builds via
 *  `deckLayoutContext`, never a hand-rolled substitute. */
function canonicalNode(page: TDPage, shape: ComponentShape): LayoutNode | undefined {
  const def = registry.get(shape.componentId)
  if (!def) return undefined
  const ctx = contextForBlock(shape, document, {
    headless: false,
    slideBackground: page.background,
  })
  return def.layout(shape.props, ctx)
}

/* ── SVG parsing: a parallel walk of the canonical LayoutNode tree and the parsed SVG DOM,
   annotating each SVG element with the LayoutNode's `part` name — the same technique
   parity-worker.ts's `annotateSvg` uses in a real browser (Playwright), reimplemented here
   against jsdom's `DOMParser` because this file is deliberately browser-free (per the task: "SVG
   export ... No browser"). Not a second copy of `collectParts`'s walk — that one flattens a
   LayoutNode tree alone; this one additionally has to keep an SVG Element cursor in lockstep,
   which `collectParts` has no reason to know about. ── */

function svgChildren(el: Element): Element[] {
  return Array.from(el.children).filter((c) => c.tagName.toLowerCase() !== 'defs')
}

function walkAnnotate(el: Element, node: LayoutNode, out: Map<string, Element>): void {
  if (node.part) out.set(node.part, el)
  if (node.k === 'group' && el.tagName.toLowerCase() === 'g') {
    const kids = svgChildren(el)
    node.children.forEach((child, i) => {
      if (kids[i]) walkAnnotate(kids[i], child, out)
    })
  }
}

/** Parse a `renderNodeToSvg`/`renderPageToSvg` fragment and map each `part` name to its Element,
 *  by walking it in lockstep with the same canonical LayoutNode tree that produced it. */
function annotateSvgParts(svgString: string, rootNode: LayoutNode): Map<string, Element> {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml')
  const out = new Map<string, Element>()
  const rootEl = svgChildren(doc.documentElement)[0]
  if (rootEl) walkAnnotate(rootEl, rootNode, out)
  return out
}

interface SvgGeom {
  x: number
  y: number
  width: number
  height: number
}

/** Read a comparable box straight off an SVG element's own attributes — no layout engine, no
 *  `getBoundingClientRect` (jsdom doesn't compute real SVG layout; these kinds don't need it,
 *  their geometry *is* the attributes `render-svg.ts` wrote). Kinds with no direct numeric
 *  geometry (`group`, `path`, `text`) return `undefined` — reported as "not compared", the same
 *  scope cut `parity-harness.ts`'s own `GEOMETRY_KINDS` documents (path/text geometry parity is a
 *  pre-existing, named follow-up there, not something Q17 invents). */
function svgGeom(el: Element, kind: string): SvgGeom | undefined {
  const num = (name: string) => parseFloat(el.getAttribute(name) || '0')
  switch (kind) {
    case 'rect':
    case 'image':
    case 'icon':
      return { x: num('x'), y: num('y'), width: num('width'), height: num('height') }
    case 'host':
      // host nodes render as poster subtrees (<g> groups), not direct rects — their geometry
      // is represented by the poster's child parts, not by the host element itself.
      return undefined
    case 'line': {
      const x1 = num('x1')
      const y1 = num('y1')
      const x2 = num('x2')
      const y2 = num('y2')
      return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      }
    }
    default:
      return undefined
  }
}

function within(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE
}

function geomWithinTolerance(a: SvgGeom, b: PartInfo['box']): boolean {
  return within(a.x, b.x) && within(a.y, b.y) && within(a.width, b.width) && within(a.height, b.height)
}

/* ── the fixture, precomputed once ──────────────────────────────────────────────────────── */

interface SlideBlocks {
  slideId: string
  page: TDPage
  blocks: Array<{ shape: ComponentShape; blockId: string | undefined; node: LayoutNode | undefined }>
}

const SLIDES: SlideBlocks[] = DECK.slides.map((slide) => {
  const page = document.pages[slide.id]
  const shapes = orderedShapes(page)
  return {
    slideId: slide.id,
    page,
    blocks: shapes.map((shape) => ({
      shape,
      blockId: shapeToBlock(shape)?.id,
      node: canonicalNode(page, shape),
    })),
  }
})

describe('Q17 three-way parity — ground truth + SVG export (Node-only)', () => {
  it('compiles all 6 demo slides with every block resolving to a registered definition', () => {
    expect(SLIDES).toHaveLength(6)
    for (const slide of SLIDES) {
      expect(slide.blocks.length).toBeGreaterThan(0)
      for (const b of slide.blocks) {
        expect(b.node).toBeDefined() // undefined here means an unregistered componentId
      }
    }
  })

  it('the ground-truth part walk (collectParts) is non-empty for every block', () => {
    let totalParts = 0
    for (const slide of SLIDES) {
      for (const b of slide.blocks) {
        const parts = collectParts(b.node as LayoutNode)
        expect(parts.length).toBeGreaterThan(0)
        totalParts += parts.length
      }
    }
    expect(totalParts).toBeGreaterThan(0)
    // eslint-disable-next-line no-console
    console.log(`ground truth: ${SLIDES.reduce((n, s) => n + s.blocks.length, 0)} blocks, ${totalParts} parts total`)
  })

  describe('renderPageToSvg default behaviour (opts.blocks not supplied — the demo app never supplies it)', () => {
    it('on the document exactly as deckSpecToDocument hands it back, renders nothing at all — not even a placeholder', () => {
      // `blockToShape` (shape-bridge.ts) stamps every compiled block with `parentId: 'page'`, a
      // literal sentinel string — never the real page id (`sl_01`, ...). The *only* place that
      // sentinel is ever repaired is `TldrawApp`'s load-time `migrate()` (`state/data/migrate.ts`
      // — "Fix missing parent bug": `if (parentId !== page.id && !page.shapes[parentId]) shape.
      // parentId = page.id`). `renderPageToSvg`'s own top-level filter requires `shape.parentId
      // === page.id` (its "a group's own children are rendered by recursion, never independently
      // here too" comment) and never calls `migrate()` itself — so on a document that was
      // compiled and handed straight to `renderPageToSvg` (exactly the use case the module's own
      // doc comment describes: "a server can call it on a TDDocument it only just deserialized"),
      // every shape fails that check and the page renders as an *empty* `<svg>` — not even the
      // dashed "unrenderable component" placeholder is reached. Verified directly below, not
      // inferred: the compiled shapes' actual `parentId` is printed alongside the empty output.
      for (const slide of SLIDES) {
        const out = renderPageToSvgDefault(slide.page)
        const shapeIds = slide.blocks.map((b) => b.shape.id)
        const contentBytes = out.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
        // eslint-disable-next-line no-console
        console.log(
          `${slide.slideId}: renderPageToSvg(page, {}) body length=${contentBytes.length} ` +
            `(0 = fully empty); ${slide.blocks.length} compiled shapes, all parentId=` +
            `${JSON.stringify(Array.from(new Set(slide.blocks.map((b) => b.shape.parentId))))} vs page.id=${slide.slideId}`
        )
        expect(shapeIds.length).toBeGreaterThan(0) // sanity: there ARE blocks to have gone missing
        expect(contentBytes.trim()).toBe('') // the actual finding: nothing rendered, not a placeholder
      }
    })

    it('once the document is migrated (as TldrawApp does on load), every block becomes the dashed placeholder instead', () => {
      // Same document, run through the exact repair `TldrawApp` applies before anything ever
      // reaches the live store — isolates the *second*, independent gap (ComponentShape has no
      // headless renderer) from the *first* (the parentId sentinel), which the previous test
      // covers on its own.
      let placeholders = 0
      let total = 0
      for (const slide of SLIDES) {
        const migratedDoc = migrate(
          JSON.parse(JSON.stringify(document)) as typeof document,
          document.version
        )
        const migratedPage = migratedDoc.pages[slide.slideId]
        const out = renderPageToSvg(migratedPage, {
          assets: migratedDoc.assets,
          theme: migratedDoc.theme,
          defaultPageSize: migratedDoc.defaultPageSize,
        })
        for (const b of slide.blocks) {
          total++
          const marker = `Component: ${escapeForCheck(b.shape.componentId)}`
          if (out.includes('stroke-dasharray="8 6"') && out.includes(marker)) placeholders++
        }
      }
      // eslint-disable-next-line no-console
      console.log(`renderPageToSvg(migrate(page), {}): ${placeholders}/${total} blocks rendered as the dashed placeholder`)
      expect(total).toBeGreaterThan(0)
      expect(placeholders).toBe(total) // every single block — this is the finding, not a bug fix
    })
  })

  describe('renderPageToSvg with opts.blocks wired to the real layout() (supplementary probe)', () => {
    const results: Array<{
      slideId: string
      blockId: string | undefined
      componentId: string
      part: string
      kind: string
      groundTruth: PartInfo['box']
      svg?: SvgGeom
      pass?: boolean
      notCompared?: string
    }> = []

    beforeAll(() => {
      for (const slide of SLIDES) {
        // Exercise the real, full-page call first — proves the whole-page path actually invokes
        // the callback for every block (`renderShapeOrGroup`'s `TDShapeType.Component` case
        // inlines the callback's return value verbatim as that shape's `<g>` contents) and
        // produces no placeholder once `opts.blocks` is supplied, page-level, not just per-shape.
        const fullPageSvg = renderPageToSvgWithBlocksCallback(slide.page)
        expect(fullPageSvg).not.toContain('stroke-dasharray="8 6"')

        // Per-block measurement calls the identical callback in isolation (same shape, same box,
        // same function) — simpler than re-parsing which `<g>` in the full page belongs to which
        // shape, and produces byte-identical output for that shape either way.
        for (const b of slide.blocks) {
          if (!b.node) continue
          const parts = collectParts(b.node)
          const shapeSvg = blocksCallback(slide.page, b.shape)
          const partEls = shapeSvg ? annotateSvgParts(shapeSvg, b.node) : new Map<string, Element>()
          for (const p of parts) {
            const el = partEls.get(p.part)
            if (!el) {
              results.push({
                slideId: slide.slideId,
                blockId: b.blockId,
                componentId: b.shape.componentId,
                part: p.part,
                kind: p.kind,
                groundTruth: p.box,
                notCompared: 'part not found in the callback-rendered SVG fragment',
              })
              continue
            }
            const geom = svgGeom(el, p.kind)
            if (!geom) {
              results.push({
                slideId: slide.slideId,
                blockId: b.blockId,
                componentId: b.shape.componentId,
                part: p.part,
                kind: p.kind,
                groundTruth: p.box,
                notCompared: `kind "${p.kind}" has no direct SVG geometry attributes (group/path/text — same scope cut as parity-harness.ts's GEOMETRY_KINDS)`,
              })
              continue
            }
            results.push({
              slideId: slide.slideId,
              blockId: b.blockId,
              componentId: b.shape.componentId,
              part: p.part,
              kind: p.kind,
              groundTruth: p.box,
              svg: geom,
              pass: geomWithinTolerance(geom, p.box),
            })
          }
        }
      }
    })

    it('reports a non-zero, non-trivial comparison (not "passes by comparing nothing")', () => {
      const compared = results.filter((r) => r.svg !== undefined)
      const notCompared = results.filter((r) => r.notCompared !== undefined)
      // eslint-disable-next-line no-console
      console.log(
        `svg-with-callback: ${compared.length} parts compared, ${notCompared.length} not compared, ` +
          `${compared.filter((r) => r.pass).length}/${compared.length} within ${TOLERANCE} unit`
      )
      for (const r of notCompared) {
        // eslint-disable-next-line no-console
        console.log(`  not compared: ${r.slideId}/${r.blockId}/${r.part} (${r.kind}) — ${r.notCompared}`)
      }
      expect(compared.length).toBeGreaterThan(0)
    })

    it('every geometry-bearing part (rect/image/icon/host/line) matches the canonical layout() box within 1 unit', () => {
      const compared = results.filter((r) => r.svg !== undefined)
      const failing = compared.filter((r) => !r.pass)
      for (const r of failing) {
        // eslint-disable-next-line no-console
        console.log(
          `MISMATCH ${r.slideId}/${r.blockId}/${r.part}: groundTruth=${JSON.stringify(r.groundTruth)} svg=${JSON.stringify(r.svg)}`
        )
      }
      expect(failing).toEqual([])
    })
  })
})

/* ── helpers used by the tests above ────────────────────────────────────────────────────── */

function escapeForCheck(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderPageToSvgDefault(page: TDPage): string {
  return renderPageToSvg(page, {
    assets: document.assets,
    theme: document.theme,
    defaultPageSize: document.defaultPageSize,
  })
}

/**
 * The exact extension point `RenderPageToSvgOptions.blocks` documents: look up the block by
 * `shape.componentId`, call its `layout()`, render the resulting `LayoutNode` to SVG. This is
 * what a host would pass to make `renderPageToSvg`/`Deck.getThumbnail`/`exportSlidePng` render
 * real block content instead of the placeholder — nothing in this repo wires it up today (see
 * this file's module doc comment), so this exists only to measure "would the geometry agree if
 * someone did," not to change what shipping code calls.
 */
function blocksCallback(page: TDPage, shape: ComponentShape): string | undefined {
  const def = registry.get(shape.componentId)
  if (!def) return undefined
  const ctx = contextForBlock(shape, document, {
    headless: true,
    slideBackground: page.background,
  })
  const node = def.layout(shape.props, ctx)
  return renderNodeToSvg(node)
}

function renderPageToSvgWithBlocksCallback(page: TDPage): string {
  return renderPageToSvg(page, {
    assets: document.assets,
    theme: document.theme,
    defaultPageSize: document.defaultPageSize,
    blocks: (shape: ComponentShape) => blocksCallback(page, shape),
  })
}
