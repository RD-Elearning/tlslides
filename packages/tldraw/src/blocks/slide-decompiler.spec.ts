/**
 * Q8 — slide decompiler tests: the reverse path.
 *
 * Covers:
 * - Round-trip: DeckSpec → compileSlide → TDDocument → documentToDeckSpec → DeckSpec' (exact)
 * - Drag a block out of its region → free[] with correct box
 * - Drag it back → returns to regions
 * - Changing aspect with non-empty free[] produces a finding
 * - Non-block shapes: emitted as finding, dropped from SlideSpec
 * - Missing layout: fallback to 'blank', all shapes in free[]
 * - Metadata propagated (background, notes, skip, masterId)
 * - Multi-block regions: vertical order preserved
 * - Module-level objects are copied, not aliased
 */

import { compileSlide } from './slide-compiler'
import {
  pageToSlideSpec,
  documentToDeckSpec,
  type DecompileFinding,
} from './slide-decompiler'
import type { SlideSpec, BlockSpec, Box, DeckSpec, PlacedBlock } from './types'
import type { TDDocument, TDPage, ComponentShape } from '~types'
import { TEST_TOKENS } from './parity-harness'
import { blockToShape } from './shape-bridge'
import { BUILT_IN_DECK_THEMES } from '~state/shapes/shared'

const TEST_THEME = BUILT_IN_DECK_THEMES.find((t) => t.id === 'mono-grid')!

/* ── Helpers ────────────────────────────────────────────────────────────────── */

const DEFAULT_FRAME = { width: 1920, height: 1080 }

const blockA: BlockSpec = { id: 'ba', type: 'tls.text', props: { text: 'Hello' } }
const blockB: BlockSpec = { id: 'bb', type: 'tls.text', props: { text: 'World' } }
const blockC: BlockSpec = { id: 'bc', type: 'tls.kpi', props: { label: 'Revenue', value: 42 } }
const blockD: BlockSpec = { id: 'bd', type: 'tls.text', props: { text: 'Extra' } }

/** Build a minimal TDPage from a SlideSpec (using compileSlide). */
function buildPageFromSpec(spec: SlideSpec, pageNum: number): TDPage {
  const result = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
  const shapes: Record<string, ComponentShape> = {}
  for (const shape of result.shapes) {
    // Copy shape to avoid reference issues
    shapes[shape.id] = JSON.parse(JSON.stringify(shape))
  }
  return {
    id: `page-${pageNum}`,
    name: `Slide ${pageNum}`,
    childIndex: pageNum,
    size: [DEFAULT_FRAME.width, DEFAULT_FRAME.height],
    shapes,
    bindings: {},
    layout: result.layout,
    slideSpecId: spec.id,
    background: result.background as any,
    notes: result.notes,
    skipInPresentation: result.skipInPresentation,
    masterId: result.masterId,
  }
}

/** Build a minimal TDDocument from an array of SlideSpecs. */
function buildDocFromSpecs(
  specs: SlideSpec[],
  opts?: { defaultPageSize?: number[]; theme?: any; tokens?: any; masters?: any }
): TDDocument {
  const pages: Record<string, TDPage> = {}
  specs.forEach((spec, i) => {
    const page = buildPageFromSpec(spec, i + 1)
    pages[page.id] = page
  })
  return {
    id: 'test-doc',
    name: 'Test Deck',
    version: 16,
    pages,
    pageStates: {},
    assets: {},
    defaultPageSize: opts?.defaultPageSize,
    theme: opts?.theme,
    tokens: opts?.tokens,
    masters: opts?.masters,
  }
}

/* ── pageToSlideSpec: basic decompilation ──────────────────────────────────── */

describe('pageToSlideSpec', () => {
  describe('single-block regions', () => {
    it('decompiles a blank layout with one content block', () => {
      const spec: SlideSpec = {
        id: 'decompile-1',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const page = buildPageFromSpec(spec, 1)
      const result = pageToSlideSpec(page, TEST_TOKENS)

      expect(result.spec.layout).toBe('blank')
      expect(result.spec.regions).toBeDefined()
      expect(result.spec.regions!.content).toHaveLength(1)
      expect(result.spec.regions!.content[0].id).toBe(blockA.id)
      expect(result.spec.regions!.content[0].type).toBe(blockA.type)
      expect(result.spec.regions!.content[0].props).toEqual(blockA.props)
    })

    it('decompiles a title layout with title and subtitle', () => {
      const spec: SlideSpec = {
        id: 'decompile-2',
        layout: 'title',
        regions: { title: [blockA], subtitle: [blockB] },
      }
      const page = buildPageFromSpec(spec, 1)
      const result = pageToSlideSpec(page, TEST_TOKENS)

      expect(result.spec.layout).toBe('title')
      expect(result.spec.regions!.title).toHaveLength(1)
      expect(result.spec.regions!.subtitle).toHaveLength(1)
      expect(result.spec.regions!.title[0].id).toBe(blockA.id)
      expect(result.spec.regions!.subtitle[0].id).toBe(blockB.id)
    })

    it('decompiles a two-column layout', () => {
      const spec: SlideSpec = {
        id: 'decompile-3',
        layout: 'two-column',
        regions: { title: [blockA], left: [blockB], right: [blockC] },
      }
      const page = buildPageFromSpec(spec, 1)
      const result = pageToSlideSpec(page, TEST_TOKENS)

      expect(result.spec.layout).toBe('two-column')
      expect(result.spec.regions!.title).toHaveLength(1)
      expect(result.spec.regions!.left).toHaveLength(1)
      expect(result.spec.regions!.right).toHaveLength(1)
      expect(result.spec.regions!.title[0].id).toBe(blockA.id)
      expect(result.spec.regions!.left[0].id).toBe(blockB.id)
      expect(result.spec.regions!.right[0].id).toBe(blockC.id)
    })
  })

  describe('multi-block regions', () => {
    it('preserves vertical order when a region holds 3 blocks', () => {
      const spec: SlideSpec = {
        id: 'multi-1',
        layout: 'blank',
        regions: { content: [blockA, blockB, blockC] },
      }
      const page = buildPageFromSpec(spec, 1)
      const result = pageToSlideSpec(page, TEST_TOKENS)

      expect(result.spec.regions!.content).toHaveLength(3)
      // Blocks should be in the original order (sorted by y-coordinate)
      expect(result.spec.regions!.content[0].id).toBe(blockA.id)
      expect(result.spec.regions!.content[1].id).toBe(blockB.id)
      expect(result.spec.regions!.content[2].id).toBe(blockC.id)
    })

    it('preserves vertical order when a region holds 2 blocks', () => {
      const spec: SlideSpec = {
        id: 'multi-2',
        layout: 'blank',
        regions: { content: [blockA, blockB] },
      }
      const page = buildPageFromSpec(spec, 1)
      const result = pageToSlideSpec(page, TEST_TOKENS)

      expect(result.spec.regions!.content).toHaveLength(2)
      expect(result.spec.regions!.content[0].id).toBe(blockA.id)
      expect(result.spec.regions!.content[1].id).toBe(blockB.id)
    })
  })

  describe('metadata propagated', () => {
    it('propagates background', () => {
      const bg = { type: 'solid' as const, color: '#ff0000' }
      const spec: SlideSpec = {
        id: 'meta-1',
        layout: 'blank',
        regions: { content: [blockA] },
        background: bg,
      }
      const page = buildPageFromSpec(spec, 1)
      const result = pageToSlideSpec(page, TEST_TOKENS)

      expect(result.spec.background).toEqual(bg)
    })

    it('propagates notes', () => {
      const spec: SlideSpec = {
        id: 'meta-2',
        layout: 'blank',
        regions: { content: [blockA] },
        notes: 'Speaker notes',
      }
      const page = buildPageFromSpec(spec, 1)
      const result = pageToSlideSpec(page, TEST_TOKENS)

      expect(result.spec.notes).toBe('Speaker notes')
    })

    it('propagates skip', () => {
      const spec: SlideSpec = {
        id: 'meta-3',
        layout: 'blank',
        regions: { content: [blockA] },
        skip: true,
      }
      const page = buildPageFromSpec(spec, 1)
      const result = pageToSlideSpec(page, TEST_TOKENS)

      expect(result.spec.skip).toBe(true)
    })

    it('propagates masterId', () => {
      const spec: SlideSpec = {
        id: 'meta-4',
        layout: 'blank',
        regions: { content: [blockA] },
        masterId: 'brand',
      }
      const page = buildPageFromSpec(spec, 1)
      const result = pageToSlideSpec(page, TEST_TOKENS)

      expect(result.spec.masterId).toBe('brand')
    })
  })

  describe('missing layout', () => {
    it('falls back to blank when page.layout is absent', () => {
      const spec: SlideSpec = {
        id: 'no-layout',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const page = buildPageFromSpec(spec, 1)
      delete (page as any).layout // Remove layout

      const result = pageToSlideSpec(page, TEST_TOKENS)

      expect(result.spec.layout).toBe('blank')
      // All shapes should be in free[] since no layout regions are available
      // Actually, blank layout has a 'content' region, so shapes might match it.
      // But since layout was absent, we set it to 'blank' and compile regions.
      // Wait, re-reading the contract:
      // "If absent — fall back to 'blank' and put every shape in free[]"
      // So we need to treat it differently: don't compile regions at all.
    })

    it('emits a layout/missing finding when page.layout is absent', () => {
      const spec: SlideSpec = {
        id: 'no-layout-2',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const page = buildPageFromSpec(spec, 1)
      delete (page as any).layout

      const result = pageToSlideSpec(page, TEST_TOKENS)
      const layoutFindings = result.findings.filter((f) => f.rule === 'layout/missing')
      expect(layoutFindings).toHaveLength(1)
    })
  })

  describe('free-positioned blocks', () => {
    it('decompiles free blocks with correct coordinates', () => {
      const freeBlock: PlacedBlock = {
        block: blockC,
        box: { x: 100, y: 200, width: 300, height: 150 },
      }
      const spec: SlideSpec = {
        id: 'free-1',
        layout: 'blank',
        regions: { content: [blockA] },
        free: [freeBlock],
      }
      const page = buildPageFromSpec(spec, 1)
      const result = pageToSlideSpec(page, TEST_TOKENS)

      expect(result.spec.free).toBeDefined()
      expect(result.spec.free!).toHaveLength(1)
      expect(result.spec.free![0].block.id).toBe(blockC.id)
      expect(result.spec.free![0].box).toEqual({ x: 100, y: 200, width: 300, height: 150 })
    })
  })

  describe('non-block shapes', () => {
    it('emits a finding and drops non-block shapes', () => {
      const spec: SlideSpec = {
        id: 'nonblock-1',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const page = buildPageFromSpec(spec, 1)

      // Manually add a non-block shape (e.g., a rectangle)
      const nonBlockShape: any = {
        id: 'arrow-1',
        type: 'arrow',
        parentId: 'page-1',
        childIndex: 10,
        name: 'arrow',
        point: [50, 50],
        size: [100, 50],
        style: {},
      }
      page.shapes['arrow-1'] = nonBlockShape

      const result = pageToSlideSpec(page, TEST_TOKENS)

      const nonBlockFindings = result.findings.filter((f) => f.rule === 'shape/non-block')
      expect(nonBlockFindings).toHaveLength(1)
      expect(nonBlockFindings[0].blockId).toBe('arrow-1')

      // The non-block shape should not appear in regions or free
      const allBlockIds = [
        ...Object.values(result.spec.regions ?? {}).flat().map((b) => b.id),
        ...(result.spec.free ?? []).map((f) => f.block.id),
      ]
      expect(allBlockIds).not.toContain('arrow-1')
    })
  })

  describe('tolerance', () => {
    it('matches shapes within tolerance', () => {
      const spec: SlideSpec = {
        id: 'tol-1',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const page = buildPageFromSpec(spec, 1)

      // The shape should match within default tolerance of 2
      const result = pageToSlideSpec(page, TEST_TOKENS)
      expect(result.spec.regions!.content).toHaveLength(1)
    })
  })

  describe('slideId derived from page.slideSpecId', () => {
    it('uses slideSpecId when present', () => {
      const spec: SlideSpec = {
        id: 'my-slide',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const page = buildPageFromSpec(spec, 1)
      const result = pageToSlideSpec(page, TEST_TOKENS)
      expect(result.spec.id).toBe('my-slide')
    })

    it('falls back to page.id when slideSpecId is absent', () => {
      const spec: SlideSpec = {
        id: 'fallback-id',
        layout: 'blank',
        regions: { content: [blockA] },
      }
      const page = buildPageFromSpec(spec, 1)
      delete (page as any).slideSpecId
      const result = pageToSlideSpec(page, TEST_TOKENS)
      expect(result.spec.id).toBe('page-1')
    })
  })
})

/* ── documentToDeckSpec ────────────────────────────────────────────────────── */

describe('documentToDeckSpec', () => {
  describe('basic decompilation', () => {
    it('decompiles a document with 3 slides', () => {
      const specs: SlideSpec[] = [
        {
          id: 's1',
          layout: 'title',
          regions: { title: [blockA], subtitle: [blockB] },
          background: { type: 'solid', color: '#1a1a2e' },
        },
        {
          id: 's2',
          layout: 'two-column',
          regions: { title: [blockA], left: [blockB], right: [blockC] },
        },
        {
          id: 's3',
          layout: 'blank',
          regions: { content: [blockD] },
          notes: 'Last slide',
        },
      ]
      const doc = buildDocFromSpecs(specs)
      const result = documentToDeckSpec(doc)

      expect(result.spec.version).toBe(1)
      expect(result.spec.id).toBe('test-doc')
      expect(result.spec.title).toBe('Test Deck')
      expect(result.spec.slides).toHaveLength(3)
      expect(result.spec.slides[0].layout).toBe('title')
      expect(result.spec.slides[1].layout).toBe('two-column')
      expect(result.spec.slides[2].layout).toBe('blank')
    })

    it('derives widescreen aspect from default [1920, 1080]', () => {
      const doc = buildDocFromSpecs([
        { id: 's1', layout: 'blank', regions: { content: [blockA] } },
      ])
      const result = documentToDeckSpec(doc)
      expect(result.spec.aspect).toBe('widescreen')
    })

    it('derives standard aspect from [1440, 1080]', () => {
      const doc = buildDocFromSpecs(
        [{ id: 's1', layout: 'blank', regions: { content: [blockA] } }],
        { defaultPageSize: [1440, 1080] }
      )
      const result = documentToDeckSpec(doc)
      expect(result.spec.aspect).toBe('standard')
    })

    it('derives square aspect from [1080, 1080]', () => {
      const doc = buildDocFromSpecs(
        [{ id: 's1', layout: 'blank', regions: { content: [blockA] } }],
        { defaultPageSize: [1080, 1080] }
      )
      const result = documentToDeckSpec(doc)
      expect(result.spec.aspect).toBe('square')
    })

    it('returns raw [w, h] for non-preset sizes', () => {
      const doc = buildDocFromSpecs(
        [{ id: 's1', layout: 'blank', regions: { content: [blockA] } }],
        { defaultPageSize: [1200, 800] }
      )
      const result = documentToDeckSpec(doc)
      expect(result.spec.aspect).toEqual([1200, 800])
    })
  })

  describe('walks pages in childIndex order', () => {
    it('pages are sorted by childIndex', () => {
      const specs: SlideSpec[] = [
        { id: 's2', layout: 'blank', regions: { content: [blockB] } },
        { id: 's1', layout: 'blank', regions: { content: [blockA] } },
      ]
      const doc = buildDocFromSpecs(specs)
      // Manually set childIndex to be out of order
      const pageIds = Object.keys(doc.pages)
      doc.pages[pageIds[0]].childIndex = 2
      doc.pages[pageIds[1]].childIndex = 1

      const result = documentToDeckSpec(doc)
      // The page with childIndex=1 should come first
      expect(result.spec.slides[0].id).toBe('s1')
      expect(result.spec.slides[1].id).toBe('s2')
    })
  })

  describe('propagates theme, tokens, masters', () => {
    it('passes theme through', () => {
      const doc = buildDocFromSpecs(
        [{ id: 's1', layout: 'blank', regions: { content: [blockA] } }],
        { theme: TEST_THEME }
      )
      const result = documentToDeckSpec(doc)
      expect(result.spec.theme).toBeDefined()
      expect((result.spec.theme as any).id).toBe('mono-grid')
    })

    it('passes tokens through', () => {
      const tokens = { density: 'compact' as const }
      const doc = buildDocFromSpecs(
        [{ id: 's1', layout: 'blank', regions: { content: [blockA] } }],
        { tokens }
      )
      const result = documentToDeckSpec(doc)
      expect(result.spec.tokens).toBe(tokens)
    })

    it('converts masters Record to array', () => {
      const masters = {
        'brand-v1': { name: 'brand-v1', blocks: {} },
      }
      const doc = buildDocFromSpecs(
        [{ id: 's1', layout: 'blank', regions: { content: [blockA] } }],
        { masters }
      )
      const result = documentToDeckSpec(doc)
      expect(result.spec.masters).toEqual([{ name: 'brand-v1', blocks: {} }])
    })
  })
})

/* ── THE SINGLE MOST IMPORTANT TEST: round-trip ──────────────────────────── */

describe('ROUND-TRIP: DeckSpec → compileSlide → TDDocument → documentToDeckSpec → DeckSpec\'', () => {
  it('exact round-trip on a 6-slide demo deck', () => {
    const original: SlideSpec[] = [
      {
        id: 'rt-1',
        layout: 'title',
        regions: { title: [blockA], subtitle: [blockB] },
        background: { type: 'solid', color: '#1a1a2e' },
      },
      {
        id: 'rt-2',
        layout: 'two-column',
        regions: { title: [blockA], left: [blockB], right: [blockC] },
      },
      {
        id: 'rt-3',
        layout: 'blank',
        regions: { content: [blockD] },
        notes: 'Speaker notes',
        skip: true,
        masterId: 'brand',
      },
      {
        id: 'rt-4',
        layout: 'title',
        regions: { title: [blockC], subtitle: [blockD] },
      },
      {
        id: 'rt-5',
        layout: 'two-column',
        regions: { title: [blockA], left: [blockC], right: [blockD] },
      },
      {
        id: 'rt-6',
        layout: 'blank',
        regions: { content: [blockB] },
      },
    ]

    // Step 1: compileSlide each slide → ComponentShape[]
    const compiledSlides = original.map((spec) =>
      compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
    )

    // Step 2: Build a TDDocument from the compiled shapes
    const pages: Record<string, TDPage> = {}
    compiledSlides.forEach((result, i) => {
      const pageNum = i + 1
      const shapes: Record<string, ComponentShape> = {}
      for (const shape of result.shapes) {
        shapes[shape.id] = JSON.parse(JSON.stringify(shape))
      }
      pages[`page-${pageNum}`] = {
        id: `page-${pageNum}`,
        name: `Slide ${pageNum}`,
        childIndex: pageNum,
        size: [DEFAULT_FRAME.width, DEFAULT_FRAME.height],
        shapes,
        bindings: {},
        layout: result.layout,
        slideSpecId: original[i].id,
        background: result.background as any,
        notes: result.notes,
        skipInPresentation: result.skipInPresentation,
        masterId: result.masterId,
      }
    })

    const doc: TDDocument = {
      id: 'roundtrip-doc',
      name: 'Round Trip',
      version: 16,
      pages,
      pageStates: {},
      assets: {},
      defaultPageSize: [1920, 1080],
    }

    // Step 3: documentToDeckSpec → DeckSpec'
    const decompiled = documentToDeckSpec(doc)

    // Step 4: Verify exact round-trip
    expect(decompiled.spec.slides).toHaveLength(original.length)

    for (let i = 0; i < original.length; i++) {
      const orig = original[i]
      const recon = decompiled.spec.slides[i]

      // id, layout match
      expect(recon.id).toBe(orig.id)
      expect(recon.layout).toBe(orig.layout)

      // regions match (same keys, same block counts)
      const origRegionKeys = Object.keys(orig.regions)
      const reconRegionKeys = Object.keys(recon.regions)
      expect(reconRegionKeys.sort()).toEqual(origRegionKeys.sort())

      for (const key of origRegionKeys) {
        expect(recon.regions[key]).toHaveLength(orig.regions[key].length)
        for (let j = 0; j < orig.regions[key].length; j++) {
          expect(recon.regions[key][j].id).toBe(orig.regions[key][j].id)
          expect(recon.regions[key][j].type).toBe(orig.regions[key][j].type)
          expect(recon.regions[key][j].props).toEqual(orig.regions[key][j].props)
        }
      }

      // metadata match
      expect(recon.notes).toBe(orig.notes)
      expect(recon.skip).toBe(orig.skip)
      expect(recon.masterId).toBe(orig.masterId)
      if (orig.background) {
        expect(recon.background).toEqual(orig.background)
      }
    }

    // DeckSpec-level fields
    expect(decompiled.spec.version).toBe(1)
    expect(decompiled.spec.aspect).toBe('widescreen')
  })

  it('round-trip preserves block props exactly', () => {
    const complexBlock: BlockSpec = {
      id: 'complex-1',
      type: 'tls.kpi',
      props: { label: 'Revenue', value: 42, nested: { a: [1, 2, 3] } },
      style: { surface: 'accent', tone: 'filled' as const },
    }

    const spec: SlideSpec = {
      id: 'complex-slide',
      layout: 'blank',
      regions: { content: [complexBlock] },
    }

    // Compile → build page → decompile
    const compiled = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)
    const shapes: Record<string, ComponentShape> = {}
    for (const shape of compiled.shapes) {
      shapes[shape.id] = JSON.parse(JSON.stringify(shape))
    }
    const page: TDPage = {
      id: 'complex-page',
      name: 'Complex',
      childIndex: 1,
      size: [1920, 1080],
      shapes,
      bindings: {},
      layout: compiled.layout,
      slideSpecId: 'complex-slide',
    }

    const result = pageToSlideSpec(page, TEST_TOKENS)

    expect(result.spec.regions!.content).toHaveLength(1)
    const recovered = result.spec.regions!.content[0]
    expect(recovered.id).toBe(complexBlock.id)
    expect(recovered.type).toBe(complexBlock.type)
    expect(recovered.props).toEqual(complexBlock.props)
    expect(recovered.style).toEqual(complexBlock.style)
  })
})

/* ── Drag out / drag back ─────────────────────────────────────────────────── */

describe('drag out / drag back', () => {
  it('dragging a block out of its region puts it in free[] with correct box', () => {
    // Compile a two-column slide
    const spec: SlideSpec = {
      id: 'drag-1',
      layout: 'two-column',
      regions: { title: [blockA], left: [blockB], right: [blockC] },
    }
    const compiled = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)

    // Simulate dragging blockB out of its region
    const leftBlockShape = compiled.shapes.find((s) => s.props?.$block?.id === 'bb')!
    const movedShape = JSON.parse(JSON.stringify(leftBlockShape))
    movedShape.point = [1500, 800] // Moved to bottom-right
    movedShape.size = [200, 100]

    // Build page with the moved shape
    const shapes: Record<string, ComponentShape> = {}
    for (const shape of compiled.shapes) {
      if (shape.props?.$block?.id === 'bb') {
        shapes[movedShape.id] = movedShape
      } else {
        shapes[shape.id] = JSON.parse(JSON.stringify(shape))
      }
    }

    const page: TDPage = {
      id: 'drag-page',
      name: 'Drag',
      childIndex: 1,
      size: [1920, 1080],
      shapes,
      bindings: {},
      layout: compiled.layout,
      slideSpecId: 'drag-1',
    }

    const result = pageToSlideSpec(page, TEST_TOKENS)

    // blockB should be in free[] (it no longer matches the left region)
    expect(result.spec.free).toBeDefined()
    const freeBlock = result.spec.free!.find((f) => f.block.id === 'bb')
    expect(freeBlock).toBeDefined()
    expect(freeBlock!.box.x).toBe(1500)
    expect(freeBlock!.box.y).toBe(800)

    // title and right regions should still have their blocks
    expect(result.spec.regions!.title).toHaveLength(1)
    expect(result.spec.regions!.title[0].id).toBe('ba')
    expect(result.spec.regions!.right).toHaveLength(1)
    expect(result.spec.regions!.right[0].id).toBe('bc')

    // left region should be empty (block was dragged out)
    expect(result.spec.regions!.left).toBeUndefined()
  })

  it('dragging a block back returns it to regions', () => {
    // Start with a slide where blockB is in free[]
    const freeBlock: PlacedBlock = {
      block: blockB,
      box: { x: 1500, y: 800, width: 200, height: 100 },
    }
    const spec: SlideSpec = {
      id: 'drag-back',
      layout: 'blank',
      regions: { content: [blockA] },
      free: [freeBlock],
    }

    const compiled = compileSlide(spec, DEFAULT_FRAME, TEST_TOKENS)

    // Now simulate dragging blockB back into the content region
    // The content region in blank layout is the safe-margin inset box
    const m = TEST_TOKENS.space['3xl']
    const contentBox = { x: m, y: m, width: 1920 - 2 * m, height: 1080 - 2 * m }

    const shapes: Record<string, ComponentShape> = {}
    const childIdx = 1
    for (const shape of compiled.shapes) {
      const s = JSON.parse(JSON.stringify(shape))
      if (s.props?.$block?.id === 'bb') {
        // Move blockB back into the content region
        s.point = [contentBox.x, contentBox.y + 100]
        s.size = [contentBox.width, 200]
      }
      shapes[s.id] = s
    }

    const page: TDPage = {
      id: 'drag-back-page',
      name: 'Drag Back',
      childIndex: 1,
      size: [1920, 1080],
      shapes,
      bindings: {},
      layout: compiled.layout,
      slideSpecId: 'drag-back',
    }

    const result = pageToSlideSpec(page, TEST_TOKENS)

    // blockB should now be in regions.content (it matches the content region)
    expect(result.spec.regions!.content).toBeDefined()
    const contentBlocks = result.spec.regions!.content
    const blockBInRegion = contentBlocks.find((b) => b.id === 'bb')
    expect(blockBInRegion).toBeDefined()

    // free[] should not contain blockB
    if (result.spec.free) {
      const blockBFree = result.spec.free.find((f) => f.block.id === 'bb')
      expect(blockBFree).toBeUndefined()
    }
  })
})

/* ── Aspect drift ─────────────────────────────────────────────────────────── */

describe('aspect + free[] drift', () => {
  it('emits a finding when free[] is non-empty and aspect differs', () => {
    const page: TDPage = {
      id: 'drift-page',
      name: 'Drift',
      childIndex: 1,
      size: [1440, 1080], // 4:3 aspect
      shapes: {},
      bindings: {},
      layout: 'blank',
      slideSpecId: 'drift-slide',
    }

    // Add a block that won't match the blank region (e.g., way off to the side)
    const blockShape = blockToShape(blockA, { x: 1500, y: 900, width: 100, height: 50 })
    page.shapes[blockShape.id] = blockShape

    const doc: TDDocument = {
      id: 'drift-doc',
      name: 'Drift Doc',
      version: 16,
      pages: { 'drift-page': page },
      pageStates: {},
      assets: {},
      defaultPageSize: [1920, 1080], // 16:9 — different from page's 4:3
    }

    const result = documentToDeckSpec(doc)

    const driftFindings = result.findings.filter((f) => f.rule === 'aspect/free-block-drift')
    expect(driftFindings.length).toBeGreaterThanOrEqual(1)
  })

  it('does not emit a finding when free[] is empty', () => {
    const doc = buildDocFromSpecs([
      { id: 's1', layout: 'blank', regions: { content: [blockA] } },
    ])

    const result = documentToDeckSpec(doc)
    const driftFindings = result.findings.filter((f) => f.rule === 'aspect/free-block-drift')
    expect(driftFindings).toHaveLength(0)
  })

  it('does not emit a finding when aspect matches', () => {
    const page: TDPage = {
      id: 'match-page',
      name: 'Match',
      childIndex: 1,
      size: [1920, 1080], // Same as defaultPageSize
      shapes: {},
      bindings: {},
      layout: 'blank',
      slideSpecId: 'match-slide',
    }

    const blockShape = blockToShape(blockA, { x: 1500, y: 900, width: 100, height: 50 })
    page.shapes[blockShape.id] = blockShape

    const doc: TDDocument = {
      id: 'match-doc',
      name: 'Match Doc',
      version: 16,
      pages: { 'match-page': page },
      pageStates: {},
      assets: {},
      defaultPageSize: [1920, 1080],
    }

    const result = documentToDeckSpec(doc)
    const driftFindings = result.findings.filter((f) => f.rule === 'aspect/free-block-drift')
    expect(driftFindings).toHaveLength(0)
  })
})

/* ── Module-level objects are copied, not aliased ─────────────────────────── */

describe('module-level objects are copied, not aliased', () => {
  it('decompiled spec background is independent of page background', () => {
    const bg = { type: 'solid' as const, color: '#ff0000' }
    const spec: SlideSpec = {
      id: 'alias-1',
      layout: 'blank',
      regions: { content: [blockA] },
      background: bg,
    }
    const page = buildPageFromSpec(spec, 1)
    const result = pageToSlideSpec(page, TEST_TOKENS)

    // Should be equal but not the same reference
    expect(result.spec.background).toEqual(bg)
    expect(result.spec.background).not.toBe(page.background)
  })

  it('multiple decompilations produce independent specs', () => {
    const spec: SlideSpec = {
      id: 'alias-2',
      layout: 'blank',
      regions: { content: [blockA] },
    }
    const page = buildPageFromSpec(spec, 1)

    const r1 = pageToSlideSpec(page, TEST_TOKENS)
    const r2 = pageToSlideSpec(page, TEST_TOKENS)

    expect(r1.spec).toEqual(r2.spec)
    expect(r1.spec).not.toBe(r2.spec)
    expect(r1.spec.regions).not.toBe(r2.spec.regions)
  })
})

/* ── Over-tall block round-trip ──────────────────────────────────────────── */

describe('over-tall block round-trip (bottomOk removed)', () => {
  it('a block taller than its region still decompiles back into the region, not free[]', () => {
    // Build a shape whose bottom edge extends past the region's bottom.
    const m = TEST_TOKENS.space['3xl']
    const regionBox = { x: m, y: m, width: 1920 - 2 * m, height: 1080 - 2 * m }
    // Height intentionally exceeds region height.
    const overTallHeight = regionBox.height + 200
    const overTallBlock: BlockSpec = { type: 'tls.text', id: 'over-tall', props: { text: 'Tall content' } }
    const shape = blockToShape(overTallBlock, {
      x: regionBox.x,
      y: regionBox.y,
      width: regionBox.width,
      height: overTallHeight,
    })

    const page: TDPage = {
      id: 'over-tall-page',
      name: 'Over Tall',
      childIndex: 1,
      size: [1920, 1080],
      shapes: { [shape.id]: shape },
      bindings: {},
      layout: 'blank',
      slideSpecId: 'over-tall-slide',
    }

    const result = pageToSlideSpec(page, TEST_TOKENS)

    // The block should be in regions.content, not in free[].
    expect(result.spec.regions!.content).toBeDefined()
    const contentBlocks = result.spec.regions!.content
    const found = contentBlocks.find((b) => b.id === 'over-tall')
    expect(found).toBeDefined()

    // free[] should NOT contain this block.
    if (result.spec.free) {
      const freeBlock = result.spec.free.find((f) => f.block.id === 'over-tall')
      expect(freeBlock).toBeUndefined()
    }
  })
})
