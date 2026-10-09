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
import type { DeckSpec, DeckStyle, Paint, ResolvedTokens, SlideSpec } from './types'
import { BlockRegistry } from './registry'
import { registerBuiltInBlocks } from './library'
import { deckSpecTokens, getDeckStyle, STYLE_MASTER_PREFIX, styleMasterFor, styleMasters, stylePaletteById, styleTheme } from './styles'
import { resolveMaster } from './master-renderer'

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
export function resolveDeckTheme(theme: DeckSpec['theme'], styleId?: string): DeckTheme {
  // AC1: a styled deck uses one of its style's palettes (the default when `theme` names none).
  const styled = styleTheme(getDeckStyle(styleId), theme)
  if (styled) return styled
  if (typeof theme === 'string') {
    return BUILT_IN_DECK_THEMES.find((t) => t.id === theme) ?? stylePaletteById(theme) ?? DEFAULT_DECK_THEME
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
 * AC1/AC4 — what a style master adds to one slide: the master id (`style:cover|section|content`,
 * by role), its background (used when the slide sets none) and its blocks (mesh, grain, motifs) as
 * locked `style:<page>:<n>` shapes with `childIndex` in (0, 1), under the content's 1..n. Shared by
 * `deckSpecToDocument` and the editor's `Deck.addSlideFromSpec`, so both paths paint the same page.
 * Empty when the deck has no style, the slide authors a `masterId`, or the style has no such master.
 */
export function styleMasterPage(
  style: DeckStyle | undefined,
  slideSpec: SlideSpec,
  pageId: string,
  frame: { width: number; height: number },
  tokens: ResolvedTokens
): { masterId?: string; background?: Paint; shapes: ComponentShape[] } {
  const masterId = styleMasterFor(style, slideSpec)
  const master = masterId ? styleMasters(style).find((m) => m.name === masterId) : undefined
  if (!masterId || !master) return { shapes: [] }
  const shapes: ComponentShape[] = []
  // block ids `style:<name>`, as `analyzeDeck` reports them (the calibration harness pairs by id)
  if (Object.keys(master.blocks).length) {
    const named = { ...master, blocks: Object.fromEntries(Object.entries(master.blocks).map(([k, b]) => [k, { ...b, id: `${STYLE_MASTER_PREFIX}${k}` }])) }
    const m = resolveMaster(masterId, { [masterId]: named }, frame, tokens)
    const n = m?.shapes.length ?? 0
    m?.shapes.forEach((sh, i) => {
      const id = `${STYLE_MASTER_PREFIX}${pageId}:${i}`
      shapes.push({ ...sh, id, childIndex: (i + 1) / (n + 1), isLocked: true })
    })
  }
  return { masterId, ...(master.background ? { background: JSON.parse(JSON.stringify(master.background)) } : {}), shapes }
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
  const theme = resolveDeckTheme(spec.theme, spec.style)
  // AC1: the style resolves under everything the spec authors (ai-curation §3.2).
  const style = getDeckStyle(spec.style)
  const tokens = resolveTokens(theme, deckSpecTokens(spec))
  const masterList = styleMasters(style)
  const motionStyle = spec.motionStyle ?? style?.motionStyle
  const findings: CompileFinding[] = []

  // Shared registry for intrinsic-height measurement during compileSlide.
  const registry = new BlockRegistry()
  registerBuiltInBlocks(registry)

  const pages: TDDocument['pages'] = {}
  const pageStates: TDDocument['pageStates'] = {}

  spec.slides.forEach((slideSpec, index) => {
    const pageId = slideSpec.id
    const result = compileSlide(slideSpec, frame, tokens, registry, {
      motionStyle,
      ...(style ? { blockDefaults: style.blockDefaults } : {}),
    })
    // AC1: a slide with no master gets the style's (`style:cover|section|content`), and with no
    // background that master's background. The decompiler drops both again (`documentToDeckSpec`).
    const sm = styleMasterPage(style, slideSpec, pageId, frame, tokens)
    findings.push(...result.findings)

    const shapes: Record<string, ComponentShape> = {}
    for (const sh of sm.shapes) shapes[sh.id] = sh
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
      background: result.background ?? sm.background,
      notes: result.notes,
      skipInPresentation: result.skipInPresentation,
      layout: result.layout,
      slideSpecId: result.slideSpecId,
      masterId: result.masterId ?? sm.masterId,
    }
    if (slideSpec.motionStyle !== undefined) page.motionStyle = slideSpec.motionStyle
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
    masters:
      spec.masters || masterList.length
        ? Object.fromEntries([...(spec.masters ?? []), ...masterList].map((m) => [m.name, m]))
        : undefined,
  }

  if (spec.motionStyle !== undefined) document.motionStyle = spec.motionStyle
  if (style) document.styleId = style.id

  return { document, findings }
}
