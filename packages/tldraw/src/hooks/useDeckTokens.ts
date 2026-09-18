import * as React from 'react'
import { useTldrawApp } from './useTldrawApp'
import { resolveTokens, surfaceFromBackground } from '~blocks/tokens'
import { createLayoutContext } from '~blocks/layout'
import { activeDeckTheme } from '~state/shapes/shared/deck-theme'
import { DEFAULT_SLIDE_SIZE } from '~constants'
import type { BlockStyleSpec, Box, LayoutContext, ResolvedTokens, SurfaceContext } from '~blocks/types'

/**
 * Derive the deck's resolved design tokens from the live document (`TDDocument.theme` +
 * `TDDocument.tokens`). This replaces `ComponentUtil`'s old hardcoded constant that duplicated a
 * second scale system disagreeing with `scales.ts` (P19).
 *
 * Memoised on `doc.theme` / `doc.tokens` *identity* — `resolveTokens` allocates a fresh object
 * each call, so memoising on the resolved value would defeat the purpose (an unmemoised call
 * re-lays-out every block on every store tick).
 */
export function useDeckTokens(): ResolvedTokens {
  const app = useTldrawApp()
  const doc = app.useStore((s) => s.document)
  return React.useMemo(
    () => resolveTokens(activeDeckTheme(doc.theme), doc.tokens),
    [doc.theme, doc.tokens],
  )
}

/**
 * Derive the `SurfaceContext` behind a block sitting at `box` (slide units, page-absolute — the
 * same convention `surfaceFromBackground` and every other `Box` in `blocks/` use) on the
 * document's current page, via `surfaceFromBackground` — the function P19 built for exactly this.
 *
 * Deliberately does **not** go through `blocks/deck-context.ts`'s `deckLayoutContext`: that
 * helper's `box` parameter is typed `Size` (width/height only, no position) and internally calls
 * `surfaceFromBackground(bg, { x: 0, y: 0, ...box }, ...)`. That is correct for a block that fills
 * the whole slide, but wrong for any block positioned away from the page's top-left corner — a
 * gradient background would be sampled as if every block sat at (0, 0). This hook instead passes
 * the block's real page-absolute `{x, y}`, so a gradient (or any position-dependent background)
 * is sampled where the block actually is. Worth fixing in `deckLayoutContext` itself (its `box`
 * type would need widening to carry position), but that file belongs to a different task/agent;
 * flagged here rather than changed there.
 *
 * Memoised on the box's primitive fields, not the `box` object's identity — callers (like
 * `ComponentUtil`) construct a fresh `{ x, y, width, height }` literal every render, so memoising
 * on identity would never hit and every store tick would re-sample the background.
 */
export function useBlockSurface(box: Box): SurfaceContext {
  const app = useTldrawApp()
  const doc = app.useStore((s) => s.document)
  const currentPageId = app.useStore((s) => s.appState.currentPageId)
  const page = doc.pages[currentPageId]
  const background = page?.background
  const pageWidth = page?.size?.[0] ?? DEFAULT_SLIDE_SIZE[0]
  const pageHeight = page?.size?.[1] ?? DEFAULT_SLIDE_SIZE[1]
  const theme = activeDeckTheme(doc.theme)

  return React.useMemo(
    () => surfaceFromBackground(background, box, [pageWidth, pageHeight], theme),
    [background, pageWidth, pageHeight, theme, box.x, box.y, box.width, box.height],
  )
}

/**
 * Build the full `LayoutContext` a block needs to render: the deck's real tokens
 * (`useDeckTokens`) plus the real surface behind it (`useBlockSurface`), composed via
 * `createLayoutContext`. This is the one place a shape util should call to get a `LayoutContext`
 * — it keeps the memoisation story (tokens, surface, and the composed context itself) in a single
 * spot instead of every consumer re-deriving its own dependency array.
 *
 * `createLayoutContext` itself is cheap (it deep-copies its inputs and returns a fresh object
 * every call — see `layout-child.ts`), so the win from memoising here is upstream: `tokens` and
 * `surface` only change identity when the theme, tokens override, page background, or page size
 * actually change, not on every unrelated store tick.
 */
export function useBlockLayoutContext(
  box: Box,
  opts: { headless?: boolean; depth?: number; style?: BlockStyleSpec } = {},
): LayoutContext {
  const tokens = useDeckTokens()
  const surface = useBlockSurface(box)
  const { headless = false, depth, style } = opts

  return React.useMemo(
    () =>
      createLayoutContext({
        box: { width: box.width, height: box.height },
        tokens,
        surface,
        headless,
        depth,
        style,
      }),
    [box.width, box.height, tokens, surface, headless, depth, style],
  )
}
