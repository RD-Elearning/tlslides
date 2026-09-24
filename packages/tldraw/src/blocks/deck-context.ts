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

import type { TDAssets, TDDocument, SlideBackground } from '~types'
import { DEFAULT_SLIDE_SIZE } from '~constants'
import { activeDeckTheme } from '~state/shapes/shared/deck-theme'
import { resolveTokens, surfaceFromBackground } from './tokens'
import { createLayoutContext } from './layout'
import { BLOCK_PROP_KEY } from './shape-bridge'
import type { BlockStyleSpec, Box, LayoutContext, Size } from './types'
import type { BlockRegistry } from './registry'
import type { ComponentShape } from '~types'

/** An already-absolute URL or root-relative path — used as-is, never looked up. */
const ABSOLUTE_URL_RE = /^(https?:\/\/|\/)/

/**
 * Resolve a media block's `src` prop (`tls.m.image`, and any future asset-bearing block) to a
 * renderable URL. `tls-m-image/schema.ts`'s own doc comment already promises `src` may hold
 * *either* a real asset id (looked up in the document's own `TDAssets` table, the pre-existing
 * tldraw image/video upload mechanism) *or* an already-absolute URL, used as-is. This is the one
 * place that promise is kept, so the two meanings can't drift apart across the editor and the
 * read-only viewer (G8.2, BACKLOG-visual-fix-2.md §8.2 — the design fork was real; this is
 * Option B, with the "or URL" half of the schema's own contract implemented here rather than
 * inside the block, which stays asset-scheme-agnostic as its file doc already promises).
 */
export function resolveAssetUrl(id: string, assets: TDAssets | undefined): string | undefined {
  if (ABSOLUTE_URL_RE.test(id)) return id
  return assets?.[id]?.src
}

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
 *              `style` is the per-instance BlockStyleSpec override (from `$block.style`).
 */
export function deckLayoutContext(
  doc: TDDocument,
  box: Size | Box,
  opts: {
    headless: boolean
    slideBackground?: SlideBackground | string
    depth?: number
    style?: BlockStyleSpec
    /** Block registry, so container blocks' `layoutChild` can resolve their children. */
    registry?: BlockRegistry
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
    style: opts.style,
    // The real luminance-aware solver lives in `tokens.ts`; passing the theme lets
    // `theme:`-sentinel literals (`'theme:accent1'`) resolve, and `createLayoutContext`
    // defaults `resolveColor` to it so production rendering is contrast-correct.
    theme,
    // R8 — resolve an asset id to its renderable URL from the document's own asset table,
    // so `tls.m.image` (and any future media block) renders the real image rather than the
    // dashed fallback frame. G8.2: also accepts an already-absolute URL, per the schema's own
    // documented "asset id or URL" contract — see `resolveAssetUrl` above.
    resolveAsset: (id: string) => resolveAssetUrl(id, doc.assets),
    // Container blocks (card/section/overlay/…) resolve their `props.children` through this.
    registry: opts.registry,
  })
}

/**
 * Build a `LayoutContext` for a specific block shape, forwarding its `style` override
 * from `$block.style` (if any) into the layout context. This is the single helper all
 * three consumers (`ComponentUtil`, `DeckViewer`, headless export) must call, so style
 * cannot drift between them.
 *
 * @param shape  The `ComponentShape` — source of position, size, and `$block.style`.
 * @param doc    The full `TDDocument`.
 * @param opts   `headless` and optional `slideBackground` override.
 */
export function contextForBlock(
  shape: ComponentShape,
  doc: TDDocument,
  opts: {
    headless: boolean
    slideBackground?: SlideBackground | string
    depth?: number
    /** Block registry, so container blocks' `layoutChild` can resolve their children. */
    registry?: BlockRegistry
  }
): LayoutContext {
  const box: Box = {
    x: shape.point[0],
    y: shape.point[1],
    width: shape.size[0],
    height: shape.size[1],
  }
  const meta = (shape.props as Record<string, unknown>)?.[BLOCK_PROP_KEY] as
    | Record<string, unknown>
    | undefined
  const style = meta?.style as BlockStyleSpec | undefined
  return deckLayoutContext(doc, box, { ...opts, style })
}
