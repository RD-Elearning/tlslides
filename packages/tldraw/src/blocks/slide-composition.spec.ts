/**
 * D1 — SlideSpec / MasterSpec / DeckSpec types.
 *
 * These types are purely additive: a document without `masters` or `masterId`
 * loads and renders exactly as before. Every test below verifies that invariant
 * and that full JSON round-trip works for all three composition types.
 */

import type { SlideSpec, MasterSpec, DeckSpec } from './types'
import type { TDDocument, TDPage } from '~types'
import type { BlockSpec } from './types'

/* ── helpers ───────────────────────────────────────────────────────────────── */

const sampleBlock: BlockSpec = {
  type: 'tls.text',
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
  it('is constructable with only the required `content` field', () => {
    const slide: SlideSpec = { content: {} }
    expect(slide.content).toEqual({})
    expect(slide.layout).toBeUndefined()
    expect(slide.background).toBeUndefined()
    expect(slide.notes).toBeUndefined()
    expect(slide.skipInPresentation).toBeUndefined()
    expect(slide.masterId).toBeUndefined()
  })

  it('round-trips through JSON.parse(JSON.stringify(...))', () => {
    const slide: SlideSpec = {
      layout: 'two-column',
      content: { title: sampleBlock, body: sampleBlock2 },
      background: { type: 'solid', color: '#ff0000' },
      notes: 'Speaker notes here',
      skipInPresentation: true,
      masterId: 'brand',
    }

    const roundTripped: SlideSpec = JSON.parse(JSON.stringify(slide))

    expect(roundTripped).toEqual(slide)
    expect(roundTripped.layout).toBe('two-column')
    expect(roundTripped.content.title.type).toBe('tls.text')
    expect(roundTripped.content.body.id).toBe('b2')
    expect(roundTripped.background).toEqual({ type: 'solid', color: '#ff0000' })
    expect(roundTripped.notes).toBe('Speaker notes here')
    expect(roundTripped.skipInPresentation).toBe(true)
    expect(roundTripped.masterId).toBe('brand')
  })

  it('round-trips a minimal slide (empty content, no optional fields)', () => {
    const slide: SlideSpec = { content: {} }
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
  it('is constructable with only the required `slides` field', () => {
    const deck: DeckSpec = { slides: [] }
    expect(deck.slides).toEqual([])
    expect(deck.masters).toBeUndefined()
    expect(deck.theme).toBeUndefined()
    expect(deck.title).toBeUndefined()
  })

  it('round-trips a fully populated deck through JSON', () => {
    const deck: DeckSpec = {
      slides: [
        { content: { title: sampleBlock } },
        {
          layout: 'two-column',
          content: { left: sampleBlock, right: sampleBlock2 },
          masterId: 'brand',
        },
      ],
      masters: {
        brand: {
          name: 'brand',
          blocks: { header: sampleBlock },
          background: { type: 'solid', color: '#111111' },
        },
      },
      theme: {
        colors: { accent: '#ff0000' },
        fonts: { heading: 'Poppins' },
      },
      title: 'My Deck',
    }

    const roundTripped: DeckSpec = JSON.parse(JSON.stringify(deck))
    expect(roundTripped).toEqual(deck)
    expect(roundTripped.slides).toHaveLength(2)
    expect(roundTripped.masters!.brand.name).toBe('brand')
    expect(roundTripped.theme!.colors!.accent).toBe('#ff0000')
    expect(roundTripped.title).toBe('My Deck')
  })

  it('round-trips a deck with empty masters and no theme', () => {
    const deck: DeckSpec = {
      slides: [{ content: {} }],
      masters: {},
    }
    const roundTripped: DeckSpec = JSON.parse(JSON.stringify(deck))
    expect(roundTripped).toEqual(deck)
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
    const deck: DeckSpec = {
      slides: [
        { content: { title: sampleBlock }, masterId: 'm1' },
        { content: { body: sampleBlock2 } },
      ],
      masters: {
        m1: {
          name: 'm1',
          blocks: { header: sampleBlock },
          layout: 'title',
        },
      },
      title: 'E2E Test',
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
      masters: deck.masters,
    }

    const roundTripped = JSON.parse(JSON.stringify(doc))
    expect(roundTripped.masters.m1.name).toBe('m1')
    expect(roundTripped.masters.m1.blocks.header.type).toBe('tls.text')
    expect(roundTripped.pages.p1.masterId).toBe('m1')
    expect(roundTripped.pages.p2.masterId).toBeUndefined()
    expect(roundTripped.version).toBe(16)
  })
})
