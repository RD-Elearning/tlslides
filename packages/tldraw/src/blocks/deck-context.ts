/**
 * Q9 — deckLayoutContext: one context, three consumers.
 *
 * Builds a `LayoutContext` by composing the three steps that were previously
 * disconnected across ComponentUtil (editor), DeckViewer (read-only), and the
 * export callback:
 *
 *   resolveTokens → surfaceFromBackground → createLayoutContext
 *
 * This is the **single** place those three are wired together. All three
 * consumers call it:
 *   - ComponentUtil (headless: false)
 *   - DeckViewer (headless: false)
 *   - Export callback (headless: true)
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now`, `Math.random`.
 */

import type { TDDocument, SlideBackground } from '~types'
import { DEFAULT_SLIDE_SIZE } from '~constants'
import { activeDeckTheme } from '~state/shapes/shared/deck-theme'
import { resolveTokens, surfaceFromBackground } from './tokens'
import { createLayoutContext } from './layout'
import type { Box, LayoutContext, Size } from './types'

/**
 * Build a `LayoutContext` from a document and a block's box.
 *
 * @param doc   The full `TDDocument` — source of theme, tokens, and default page size.
 * @param box   The box this block must fill, in slide units. Pass the block's **page-absolute**
 *              `{ x, y, width, height }` whenever it is known: the surface behind a block sitting
 *              on a gradient background depends on where on the slide it sits, so a position-less
 *              `Size` makes every block sample the background as if it were at (0,0). `x`/`y`
 *              default to 0 for callers that genuinely have only a size (a nested child laying
 *              itself out inside its parent's own coordinate space).
 * @param opts  `headless` distinguishes editor (`false`) from export (`true`).
 *              `slideBackground` is the slide's resolved background; when absent,
 *              the theme's own `colors.background` is used (matching the existing
 *              "no background resolved" fallback in `surfaceFromBackground`).
 *              `depth` is the current nesting depth; defaults to 0.
 */
export function deckLayoutContext(
  doc: TDDocument,
  box: Size | Box,
  opts: {
    headless: boolean
    slideBackground?: SlideBackground | string
    depth?: number
  }
): LayoutContext {
  const theme = activeDeckTheme(doc.theme)
  const tokens = resolveTokens(theme, doc.tokens)
  const pageSize: [number, number] = [
    doc.defaultPageSize?.[0] ?? DEFAULT_SLIDE_SIZE[0],
    doc.defaultPageSize?.[1] ?? DEFAULT_SLIDE_SIZE[1],
  ]
  const surface = surfaceFromBackground(
    opts.slideBackground,
    { x: 0, y: 0, ...box },
    pageSize,
    theme
  )

  return createLayoutContext({
    box: { width: box.width, height: box.height },
    tokens,
    surface,
    headless: opts.headless,
    depth: opts.depth,
  })
}
