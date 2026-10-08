/**
 * W1 — `deckSpecToDocument` / `resolveDeckFrame` / `resolveDeckTheme`.
 *
 * Covers:
 * - `resolveDeckFrame`: the three named presets, a `[w,h]` tuple in both its "explicit frame"
 *   and "ratio" interpretations, and the fallback.
 * - `resolveDeckTheme`: a built-in theme id, an unknown id (falls back to the default, the way
 *   `activeDeckTheme` already does), and a full `DeckTheme` object passed straight through.
 * - `deckSpecToDocument`: the document carries a *resolved* theme (never `undefined`, never the
 *   raw theme-id string), tokens, defaultPageSize, and per-page layout/slideSpecId/masterId/
 *   notes/skipInPresentation/background exactly as `compileSlide` produced them; findings are
 *   concatenated across slides.
 * - Round-trip sanity: `documentToDeckSpec(deckSpecToDocument(spec).document)` preserves slide
 *   ids, layouts, region names and block types.
 */

import { deckSpecToDocument, resolveDeckFrame, resolveDeckTheme } from './deck-document'
import { documentToDeckSpec } from './slide-decompiler'
import { BUILT_IN_DECK_THEMES, DEFAULT_DECK_THEME } from '~state/shapes/shared/deck-theme'
import { FontStyle } from '~types'
import type { DeckSpec, BlockSpec } from './types'

/* ── resolveDeckFrame ─────────────────────────────────────────────────────────── */

describe('resolveDeckFrame', () => {
  it('resolves the widescreen preset', () => {
    expect(resolveDeckFrame('widescreen')).toEqual({ width: 1920, height: 1080 })
  })

  it('resolves the standard preset', () => {
    expect(resolveDeckFrame('standard')).toEqual({ width: 1440, height: 1080 })
  })

  it('resolves the square preset', () => {
    expect(resolveDeckFrame('square')).toEqual({ width: 1080, height: 1080 })
  })

  it('treats a [w,h] tuple with both values > 100 as an explicit frame', () => {
    expect(resolveDeckFrame([1600, 900])).toEqual({ width: 1600, height: 900 })
  })

  it('treats a [w,h] tuple with a value <= 100 as an aspect ratio, scaled to width 1920', () => {
    // 9:16 portrait ratio -> width 1920, height 1920 * 16/9
    expect(resolveDeckFrame([9, 16])).toEqual({ width: 1920, height: 3413 })
  })

  it('falls back to widescreen for a malformed aspect', () => {
    expect(resolveDeckFrame(undefined as any)).toEqual({ width: 1920, height: 1080 })
  })
})

/* ── resolveDeckTheme ─────────────────────────────────────────────────────────── */

describe('resolveDeckTheme', () => {
  it('looks up a built-in theme id', () => {
    const theme = resolveDeckTheme('midnight')
    expect(theme.id).toBe('midnight')
    expect(theme).toEqual(BUILT_IN_DECK_THEMES.find((t) => t.id === 'midnight'))
  })

  it('falls back to DEFAULT_DECK_THEME for an unknown id', () => {
    const theme = resolveDeckTheme('not-a-real-theme')
    expect(theme).toEqual(DEFAULT_DECK_THEME)
  })

  it('passes a full DeckTheme object through unchanged', () => {
    const custom = {
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
    }
    expect(resolveDeckTheme(custom)).toEqual(custom)
  })
})

/* ── deckSpecToDocument ───────────────────────────────────────────────────────── */

const blockA: BlockSpec = { id: 'b-a', type: 'tls.text', props: { text: 'Title' } }
const blockB: BlockSpec = { id: 'b-b', type: 'tls.text', props: { text: 'Left' } }
const blockC: BlockSpec = { id: 'b-c', type: 'tls.text', props: { text: 'Right' } }

function makeDeck(): DeckSpec {
  return {
    version: 1,
    id: 'deck-1',
    title: 'Test Deck',
    theme: 'mono-grid',
    aspect: 'widescreen',
    slides: [
      {
        id: 'slide-1',
        layout: 'title',
        regions: { title: [blockA] },
        background: { type: 'solid', color: '#112233' },
        notes: 'opening notes',
      },
      {
        id: 'slide-2',
        layout: 'two-column',
        regions: { left: [blockB], right: [blockC] },
        skip: true,
      },
    ],
  }
}

describe('deckSpecToDocument', () => {
  it('resolves the theme to a real DeckTheme, never undefined and never the raw id string', () => {
    const { document } = deckSpecToDocument(makeDeck())
    expect(document.theme).toBeDefined()
    expect(typeof document.theme).not.toBe('string')
    expect(document.theme).toEqual(BUILT_IN_DECK_THEMES.find((t) => t.id === 'mono-grid'))
  })

  it('carries tokens and defaultPageSize', () => {
    const spec = makeDeck()
    spec.tokens = { density: 'compact' }
    const { document } = deckSpecToDocument(spec)
    expect(document.tokens).toEqual({ density: 'compact' })
    expect(document.defaultPageSize).toEqual([1920, 1080])
  })

  it('writes per-page layout, slideSpecId, notes, skipInPresentation, background', () => {
    const { document } = deckSpecToDocument(makeDeck())
    const page1 = document.pages['slide-1']
    const page2 = document.pages['slide-2']

    expect(page1.layout).toBe('title')
    expect(page1.slideSpecId).toBe('slide-1')
    expect(page1.notes).toBe('opening notes')
    expect(page1.background).toEqual({ type: 'solid', color: '#112233' })

    expect(page2.layout).toBe('two-column')
    expect(page2.slideSpecId).toBe('slide-2')
    expect(page2.skipInPresentation).toBe(true)
  })

  it('every shape gets a unique id and childIndex across the whole deck', () => {
    const { document } = deckSpecToDocument(makeDeck())
    const allShapes = Object.values(document.pages).flatMap((p) => Object.values(p.shapes))
    const ids = allShapes.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('concatenates findings across slides', () => {
    const spec = makeDeck()
    spec.slides.push({
      id: 'slide-3',
      layout: 'not-a-real-layout',
      regions: {},
    })
    const { findings } = deckSpecToDocument(spec)
    expect(findings.some((f) => f.slideId === 'slide-3' && f.rule === 'region/unknown')).toBe(true)
  })

  it('is pure: calling twice with the same input produces the same page/shape structure', () => {
    // Shape ids are minted per call (`blockToShape` -> `Utils.uniqueId()`), so they legitimately
    // differ between calls — that's not a purity violation, it's why every shape gets a *unique*
    // id (the P18 bug this repo has already paid for once). Purity is checked on everything
    // deckSpecToDocument itself controls: page keys, per-page metadata, and shape shape (type,
    // componentId, point, size) with ids stripped.
    const spec = makeDeck()
    const a = deckSpecToDocument(spec)
    const b = deckSpecToDocument(spec)

    expect(a.document).not.toBe(b.document)
    expect(Object.keys(a.document.pages)).toEqual(Object.keys(b.document.pages))

    for (const pageId of Object.keys(a.document.pages)) {
      const pageA = a.document.pages[pageId]
      const pageB = b.document.pages[pageId]
      expect(pageA.layout).toBe(pageB.layout)
      expect(pageA.slideSpecId).toBe(pageB.slideSpecId)
      expect(pageA.size).toEqual(pageB.size)

      const shapesA = Object.values(pageA.shapes).map(({ id: _id, ...rest }) => rest)
      const shapesB = Object.values(pageB.shapes).map(({ id: _id, ...rest }) => rest)
      expect(shapesA).toEqual(shapesB)
    }
  })
})

/* ── round-trip sanity: DeckSpec -> deckSpecToDocument -> documentToDeckSpec -> DeckSpec' ──── */

describe('round-trip: deckSpecToDocument -> documentToDeckSpec', () => {
  it('preserves slide ids, layouts, region names and block types', () => {
    const original = makeDeck()
    const { document } = deckSpecToDocument(original)
    const { spec: reconstructed } = documentToDeckSpec(document)

    expect(reconstructed.slides).toHaveLength(original.slides.length)

    for (let i = 0; i < original.slides.length; i++) {
      const origSlide = original.slides[i]
      const reconSlide = reconstructed.slides[i]

      expect(reconSlide.id).toBe(origSlide.id)
      expect(reconSlide.layout).toBe(origSlide.layout)

      const origRegions = Object.keys(origSlide.regions)
      const reconRegions = Object.keys(reconSlide.regions)
      expect(reconRegions.sort()).toEqual(origRegions.sort())

      for (const region of origRegions) {
        const origTypes = origSlide.regions[region].map((b) => b.type)
        const reconTypes = reconSlide.regions[region].map((b) => b.type)
        expect(reconTypes).toEqual(origTypes)
      }
    }
  })
})
