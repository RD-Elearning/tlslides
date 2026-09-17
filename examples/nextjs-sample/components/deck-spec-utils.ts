/**
 * Utility: convert a DeckSpec (pure JSON) into a TDDocument that can be loaded into <Tldraw>.
 *
 * Uses compileSlide (Q7) to turn each SlideSpec into ComponentShapes, and builds a
 * fully-formed TDDocument with page states, theme, and tokens.
 *
 * This is the "addDeckFromSpec" path: DeckSpec → TDDocument, offline, no editor needed.
 */

import type {
  DeckSpec,
  SlideSpec,
  TDDocument,
  DeckTheme,
  ResolvedTokens,
} from '@tlslides/tldraw'
import { compileSlide, resolveTokens, getSlideLayout } from '@tlslides/tldraw'

/**
 * Resolve the frame dimensions for a DeckSpec's aspect ratio.
 */
function resolveFrame(aspect: DeckSpec['aspect']): { width: number; height: number } {
  if (typeof aspect === 'string') {
    const presets: Record<string, [number, number]> = {
      widescreen: [1920, 1080],
      standard: [1440, 1080],
      square: [1080, 1080],
    }
    const preset = presets[aspect]
    if (preset) return { width: preset[0], height: preset[1] }
  }
  if (Array.isArray(aspect)) {
    return { width: aspect[0], height: aspect[1] }
  }
  // Fallback to widescreen
  return { width: 1920, height: 1080 }
}

/**
 * Resolve a DeckTheme from a DeckSpec.theme string or object.
 * When a string is given, looks it up in built-in themes by id; falls back to mono-grid.
 */
function resolveTheme(theme: DeckSpec['theme']): DeckTheme {
  if (typeof theme === 'object') return theme
  // Import at the module level would be circular; use the same fallback as activeDeckTheme.
  // The built-in theme ids: 'midnight', 'mono-grid', 'pastel-sky', 'warm-sand', 'ocean-deep'.
  // mono-grid is the default.
  return { id: theme, name: theme, colors: {} as any }
}

/**
 * Convert a DeckSpec into a TDDocument that can be loaded into <Tldraw>.
 *
 * Each slide in the spec becomes a TDPage with compiled ComponentShapes.
 */
export function deckSpecToDocument(spec: DeckSpec): TDDocument {
  const frame = resolveFrame(spec.aspect)
  const theme = resolveTheme(spec.theme)
  const tokens: ResolvedTokens = resolveTokens(theme, spec.tokens)

  const pages: TDDocument['pages'] = {}
  const pageStates: TDDocument['pageStates'] = {}

  spec.slides.forEach((slideSpec: SlideSpec, index: number) => {
    const pageId = slideSpec.id || `slide-${index}`
    const result = compileSlide(slideSpec, frame, tokens)

    // Build the shapes record from the compiled shapes array.
    const shapes: Record<string, any> = {}
    for (const shape of result.shapes) {
      shapes[shape.id] = shape
    }

    pages[pageId] = {
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

    pageStates[pageId] = {
      id: pageId,
      selectedIds: [],
      camera: { point: [0, 0], zoom: 1 },
    }
  })

  return {
    id: spec.id,
    name: spec.title,
    version: 16,
    pages,
    pageStates,
    assets: {},
    defaultPageSize: [frame.width, frame.height],
    theme: typeof spec.theme === 'string' ? undefined : spec.theme,
    tokens: spec.tokens,
    masters: spec.masters
      ? Object.fromEntries(spec.masters.map((m) => [m.name, m]))
      : undefined,
  }
}
