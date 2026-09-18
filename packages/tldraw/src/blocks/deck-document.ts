/**
 * W1 — `DeckSpec → TDDocument`, the compile-side counterpart to `documentToDeckSpec`
 * (`slide-decompiler.ts`). Both the edit route and `<DeckViewer>` need this: a `DeckSpec`
 * fetched from FastAPI has to become a `TDDocument` before `<Tldraw>` (or the viewer's own
 * `compileSlide` walk) can render it.
 *
 * A draft of this existed at `examples/nextjs-sample/components/deck-spec-utils.ts`. It got
 * one thing wrong: `resolveTheme` fabricated `{ id: theme, name: theme, colors: {} as any }`
 * for a theme-id string instead of looking up the real built-in theme, which would have shipped
 * an uncontrasted, colourless theme to every block that resolves a colour role. This version
 * looks the id up in `BUILT_IN_DECK_THEMES` and falls back the way `activeDeckTheme` already
 * does for a full `DeckTheme` value.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { ComponentShape, DeckTheme, TDDocument, TDPage } from '~types'
import { BUILT_IN_DECK_THEMES, DEFAULT_DECK_THEME, activeDeckTheme } from '~state/shapes/shared/deck-theme'
import { compileSlide, type CompileFinding } from './slide-compiler'
import { resolveTokens } from './tokens'
import type { DeckSpec } from './types'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks } from './library'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* resolveDeckFrame                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Named `DeckSpec.aspect` presets, in slide units. */
const ASPECT_PRESETS: Record<'widescreen' | 'standard' | 'square', { width: number; height: number }> = {
  widescreen: { width: 1920, height: 1080 },
  standard: { width: 1440, height: 1080 },
  square: { width: 1080, height: 1080 },
}

/**
 * Resolve the slide frame (in slide units) for a `DeckSpec.aspect` value.
 *
 * - A named preset (`'widescreen'`/`'standard'`/`'square'`) maps directly to its fixed frame.
 * - A `[width, height]` tuple is ambiguous by design (`BACKLOG-demo.md` §2.2 doesn't say which),
 *   so the rule applied here — and the only one this function applies — is: when BOTH values
 *   are greater than 100, the tuple is an explicit frame already authored in slide units (e.g.
 *   `[1600, 900]`) and is used as-is. Otherwise it's a small aspect RATIO (e.g. `[9, 16]`) and is
 *   scaled to a 1920-wide-equivalent frame, preserving the ratio: `width: 1920, height: 1920 *
 *   h/w`. 100 is comfortably above any realistic ratio pair and comfortably below any realistic
 *   slide-unit frame, so it never misclassifies either shape of input.
 * - Anything else (absent, malformed) falls back to widescreen.
 */
export function resolveDeckFrame(aspect: DeckSpec['aspect']): { width: number; height: number } {
  if (typeof aspect === 'string' && aspect in ASPECT_PRESETS) {
    const preset = ASPECT_PRESETS[aspect as keyof typeof ASPECT_PRESETS]
    return { width: preset.width, height: preset.height }
  }
  if (Array.isArray(aspect) && aspect.length === 2) {
    const [w, h] = aspect
    if (w > 100 && h > 100) {
      return { width: w, height: h }
    }
    return { width: 1920, height: Math.round((1920 * h) / w) }
  }
  return { width: ASPECT_PRESETS.widescreen.width, height: ASPECT_PRESETS.widescreen.height }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* resolveDeckTheme                                                                 */
/* ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Resolve a `DeckSpec.theme` value to a real `DeckTheme`.
 *
 * - A string is looked up by `id` in `BUILT_IN_DECK_THEMES`. An id that doesn't match falls back
 *   to `DEFAULT_DECK_THEME` — the same "known-good default rather than no theme at all" fallback
 *   `activeDeckTheme` already uses for a missing `TDDocument.theme`.
 * - A full `DeckTheme` object (a host's own brand kit) passes through via `activeDeckTheme`,
 *   which is a no-op for a defined value and only exists here for defence against a `theme:
 *   undefined` that the type doesn't allow but a non-TS caller (FastAPI, a hand-built payload)
 *   could still send.
 */
export function resolveDeckTheme(theme: DeckSpec['theme']): DeckTheme {
  if (typeof theme === 'string') {
    return BUILT_IN_DECK_THEMES.find((t) => t.id === theme) ?? DEFAULT_DECK_THEME
  }
  return activeDeckTheme(theme)
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* deckSpecToDocument                                                               */
/* ─────────────────────────────────────────────────────────────────────────────── */

export interface DeckDocumentResult {
  document: TDDocument
  /** Concatenated `CompileFinding`s from every slide's `compileSlide` call, in slide order. */
  findings: CompileFinding[]
}

/**
 * Compile a `DeckSpec` into a `TDDocument` ready to load into `<Tldraw>` or walk headlessly
 * (`<DeckViewer>`, export). Each `SlideSpec` becomes one `TDPage` via `compileSlide` — the same
 * function the editor's own `Deck.addSlideFromSpec` uses, so this and the live editor path are
 * structurally the same compile, just without an `TldrawApp` in the loop.
 *
 * The resolved `DeckTheme` (never `undefined`, and never the raw theme-id string) is written
 * onto `document.theme` — this is what lets the editor and `<DeckViewer>` resolve real tokens
 * and real colour roles instead of falling back to a colourless placeholder.
 */
export function deckSpecToDocument(spec: DeckSpec): DeckDocumentResult {
  const frame = resolveDeckFrame(spec.aspect)
  const theme = resolveDeckTheme(spec.theme)
  const tokens = resolveTokens(theme, spec.tokens)
  const findings: CompileFinding[] = []

  // Shared registry for intrinsic-height measurement during compileSlide.
  const registry = new BlockRegistry()
  registerBuiltInBlocks(registry)

  const pages: TDDocument['pages'] = {}
  const pageStates: TDDocument['pageStates'] = {}

  spec.slides.forEach((slideSpec, index) => {
    const pageId = slideSpec.id
    const result = compileSlide(slideSpec, frame, tokens, registry)
    findings.push(...result.findings)

    const shapes: Record<string, ComponentShape> = {}
    for (const shape of result.shapes) {
      shapes[shape.id] = shape
    }

    const page: TDPage = {
      id: pageId,
      name: `Slide ${index + 1}`,
      childIndex: index + 1,
      shapes,
      bindings: {},
      size: [frame.width, frame.height],
      background: result.background,
      notes: result.notes,
      skipInPresentation: result.skipInPresentation,
      layout: result.layout,
      slideSpecId: result.slideSpecId,
      masterId: result.masterId,
    }
    pages[pageId] = page

    pageStates[pageId] = {
      id: pageId,
      selectedIds: [],
      camera: { point: [0, 0], zoom: 1 },
    }
  })

  const document: TDDocument = {
    id: spec.id,
    name: spec.title,
    version: 16,
    pages,
    pageStates,
    assets: {},
    defaultPageSize: [frame.width, frame.height],
    theme,
    tokens: spec.tokens,
    masters: spec.masters
      ? Object.fromEntries(spec.masters.map((m) => [m.name, m]))
      : undefined,
  }

  return { document, findings }
}
