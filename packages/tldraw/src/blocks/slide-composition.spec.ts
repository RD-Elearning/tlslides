/**
 * D1 — SlideSpec / MasterSpec / DeckSpec types.
 *
 * These types are purely additive: a document without `masters` or `masterId`
 * loads and renders exactly as before. Every test below verifies that invariant
 * and that full JSON round-trip works for all three composition types.
 */

import type { SlideSpec, MasterSpec, DeckSpec } from './types'
import type { TDDocument, TDPage } from '~types'
import { FontStyle } from '~types'
import type { BlockSpec } from './types'

/* ── helpers ───────────────────────────────────────────────────────────────── */

const sampleBlock: BlockSpec = {
  type: 'tls.text',
  id: 'b1',
  props: { text: 'Hello' },
}

const sampleBlock2: BlockSpec = {
  type: 'tls.text',
  id: 'b2',
  props: { text: 'World' },
  style: { surface: 'accent' },
}

/* ── SlideSpec ─────────────────────────────────────────────────────────────── */

describe('SlideSpec', () => {
  it('is constructable with only the required fields', () => {
    const slide: SlideSpec = { id: 's1', layout: 'blank', regions: {} }
    expect(slide.regions).toEqual({})
    expect(slide.layout).toBe('blank')
    expect(slide.background).toBeUndefined()
    expect(slide.notes).toBeUndefined()
    expect(slide.skip).toBeUndefined()
    expect(slide.masterId).toBeUndefined()
  })

  it('round-trips through JSON.parse(JSON.stringify(...))', () => {
    const slide: SlideSpec = {
      id: 's2',
      layout: 'two-column',
      regions: { title: [sampleBlock], body: [sampleBlock2] },
      background: { type: 'solid', color: '#ff0000' },
      notes: 'Speaker notes here',
      skip: true,
      masterId: 'brand',
    }

    const roundTripped: SlideSpec = JSON.parse(JSON.stringify(slide))

    expect(roundTripped).toEqual(slide)
    expect(roundTripped.layout).toBe('two-column')
    expect(roundTripped.regions.title[0].type).toBe('tls.text')
    expect(roundTripped.regions.body[0].id).toBe('b2')
    expect(roundTripped.background).toEqual({ type: 'solid', color: '#ff0000' })
    expect(roundTripped.notes).toBe('Speaker notes here')
    expect(roundTripped.skip).toBe(true)
    expect(roundTripped.masterId).toBe('brand')
  })

  it('round-trips a minimal slide (empty regions, no optional fields)', () => {
    const slide: SlideSpec = { id: 's3', layout: 'blank', regions: {} }
    const roundTripped: SlideSpec = JSON.parse(JSON.stringify(slide))
    expect(roundTripped).toEqual(slide)
  })
})

/* ── MasterSpec ────────────────────────────────────────────────────────────── */

describe('MasterSpec', () => {
  it('is constructable with only required fields', () => {
    const master: MasterSpec = {
      name: 'brand',
      blocks: { header: sampleBlock },
    }
    expect(master.name).toBe('brand')
    expect(master.blocks.header).toBe(sampleBlock)
    expect(master.background).toBeUndefined()
    expect(master.layout).toBeUndefined()
  })

  it('round-trips through JSON.parse(JSON.stringify(...))', () => {
    const master: MasterSpec = {
      name: 'brand',
      blocks: { header: sampleBlock, footer: sampleBlock2 },
      background: {
        type: 'linearGradient',
        angle: 90,
        stops: [
          { color: '#000000', at: 0 },
          { color: '#ffffff', at: 1 },
        ],
      },
      layout: 'branded',
    }

    const roundTripped: MasterSpec = JSON.parse(JSON.stringify(master))
    expect(roundTripped).toEqual(master)
    expect(roundTripped.name).toBe('brand')
    expect(Object.keys(roundTripped.blocks)).toEqual(['header', 'footer'])
    expect(roundTripped.background).toEqual(master.background)
    expect(roundTripped.layout).toBe('branded')
  })
})

/* ── DeckSpec ──────────────────────────────────────────────────────────────── */

describe('DeckSpec', () => {
  // Schema v1 (`reviews/blocks/BACKLOG-demo.md` §2.2): `version`, `id`, `title`, `theme`,
  // `aspect` and `slides` are all required — this is the app-facing contract FastAPI stores
  // and the AI writes to directly, not a loosely-optional convenience type.
  it('is constructable with only the required fields, `masters`/`tokens` optional', () => {
    const deck: DeckSpec = {
      version: 1,
      id: 'deck-1',
      title: 'Untitled',
      theme: 'mono-grid',
      aspect: 'widescreen',
      slides: [],
    }
    expect(deck.slides).toEqual([])
    expect(deck.masters).toBeUndefined()
    expect(deck.tokens).toBeUndefined()
  })

  it('round-trips a fully populated deck through JSON', () => {
    const deck: DeckSpec = {
      version: 1,
      id: 'deck-2',
      title: 'My Deck',
      theme: 'mono-grid',
      aspect: 'widescreen',
      slides: [
        { id: 'd1', layout: 'blank', regions: { title: [sampleBlock] } },
        {
          id: 'd2',
          layout: 'two-column',
          regions: { left: [sampleBlock], right: [sampleBlock2] },
          masterId: 'brand',
        },
      ],
      masters: [
        {
          name: 'brand',
          blocks: { header: sampleBlock },
          background: { type: 'solid', color: '#111111' },
        },
      ],
    }

    const roundTripped: DeckSpec = JSON.parse(JSON.stringify(deck))
    expect(roundTripped).toEqual(deck)
    expect(roundTripped.slides).toHaveLength(2)
    expect(roundTripped.masters![0].name).toBe('brand')
    expect(roundTripped.theme).toBe('mono-grid')
    expect(roundTripped.title).toBe('My Deck')
  })

  it('round-trips a deck with a full DeckTheme (not just a theme id) and empty masters', () => {
    const deck: DeckSpec = {
      version: 1,
      id: 'deck-3',
      title: 'Brand Kit Deck',
      theme: {
        id: 'brand-kit',
        name: 'Brand Kit',
        colors: {
          background: '#ffffff',
          surface: '#f5f5f5',
          text: '#111111',
          textMuted: '#666666',
          accent1: '#ff0000',
          accent2: '#0000ff',
        },
        fonts: { heading: FontStyle.Sans, body: FontStyle.Sans },
      },
      aspect: 'widescreen',
      slides: [{ id: 'd3', layout: 'blank', regions: {} }],
      masters: [],
    }
    const roundTripped: DeckSpec = JSON.parse(JSON.stringify(deck))
    expect(roundTripped).toEqual(deck)
    expect((roundTripped.theme as any).id).toBe('brand-kit')
  })
})

/* ── TDDocument optional fields ────────────────────────────────────────────── */

describe('TDDocument optional composition fields', () => {
  it('a document without masters loads unchanged', () => {
    const doc: TDDocument = {
      id: 'doc-1',
      name: 'Test',
      version: 16,
      pages: {},
      pageStates: {},
      assets: {},
    }
    expect(doc.masters).toBeUndefined()
    // JSON round-trip: absence of `masters` preserved
    const roundTripped: TDDocument = JSON.parse(JSON.stringify(doc))
    expect(roundTripped.masters).toBeUndefined()
    expect(roundTripped).toEqual(doc)
  })

  it('a document with masters round-trips correctly', () => {
    const doc: TDDocument = {
      id: 'doc-2',
      name: 'With Masters',
      version: 16,
      pages: {},
      pageStates: {},
      assets: {},
      masters: {
        brand: {
          name: 'brand',
          blocks: { header: sampleBlock },
        },
      },
    }

    const roundTripped: TDDocument = JSON.parse(JSON.stringify(doc))
    expect(roundTripped.masters).toEqual(doc.masters)
    expect(roundTripped.masters!.brand.name).toBe('brand')
    expect(roundTripped.masters!.brand.blocks.header.type).toBe('tls.text')
  })

  it('version stays at 16', () => {
    // TldrawApp.version is 16; our additions must not bump it
    const doc: TDDocument = {
      id: 'doc-3',
      name: 'Version Check',
      version: 16,
      pages: {},
      pageStates: {},
      assets: {},
      masters: {
        x: { name: 'x', blocks: {} },
      },
    }
    expect(doc.version).toBe(16)
  })
})

/* ── TDPage optional masterId ──────────────────────────────────────────────── */

describe('TDPage optional masterId', () => {
  it('a page without masterId loads unchanged', () => {
    const page: TDPage = {
      id: 'page-1',
      name: 'Slide 1',
      shapes: {},
      bindings: {},
    }
    expect(page.masterId).toBeUndefined()
    const roundTripped: TDPage = JSON.parse(JSON.stringify(page))
    expect(roundTripped.masterId).toBeUndefined()
    expect(roundTripped).toEqual(page)
  })

  it('a page with masterId round-trips correctly', () => {
    const page: TDPage = {
      id: 'page-2',
      name: 'Slide 2',
      shapes: {},
      bindings: {},
      masterId: 'brand',
    }
    const roundTripped: TDPage = JSON.parse(JSON.stringify(page))
    expect(roundTripped.masterId).toBe('brand')
    expect(roundTripped).toEqual(page)
  })
})

/* ── Full DeckSpec → document round-trip (end-to-end) ─────────────────────── */

describe('end-to-end: DeckSpec ↔ document fields', () => {
  it('a DeckSpec can be stored on TDDocument.masters and round-trip', () => {
    // DeckSpec.masters is an array (Schema v1, `BACKLOG-demo.md` §2.2); TDDocument.masters is
    // still the keyed Record it always was — a document isn't a wire-format DeckSpec. Converting
    // between the two is exactly what `deckSpecToDocument` / `documentToDeckSpec` do.
    const deck: DeckSpec = {
      version: 1,
      id: 'e2e-deck',
      title: 'E2E Test',
      theme: 'mono-grid',
      aspect: 'widescreen',
      slides: [
        { id: 'e1', layout: 'blank', regions: { title: [sampleBlock] }, masterId: 'm1' },
        { id: 'e2', layout: 'blank', regions: { body: [sampleBlock2] } },
      ],
      masters: [
        {
          name: 'm1',
          blocks: { header: sampleBlock },
          layout: 'title',
        },
      ],
    }

    const doc: TDDocument = {
      id: 'e2e',
      name: 'E2E',
      version: 16,
      pages: {
        'p1': {
          id: 'p1',
          name: 'Slide 1',
          shapes: {},
          bindings: {},
          masterId: 'm1',
        } as TDPage,
        'p2': {
          id: 'p2',
          name: 'Slide 2',
          shapes: {},
          bindings: {},
        } as TDPage,
      },
      pageStates: {},
      assets: {},
      masters: Object.fromEntries(deck.masters!.map((m) => [m.name, m])),
    }

    const roundTripped = JSON.parse(JSON.stringify(doc))
    expect(roundTripped.masters.m1.name).toBe('m1')
    expect(roundTripped.masters.m1.blocks.header.type).toBe('tls.text')
    expect(roundTripped.pages.p1.masterId).toBe('m1')
    expect(roundTripped.pages.p2.masterId).toBeUndefined()
    expect(roundTripped.version).toBe(16)
  })
})
