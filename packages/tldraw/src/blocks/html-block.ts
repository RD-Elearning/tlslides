/**
 * Shared helpers for `kind: 'html'` (Tier B) blocks.
 *
 * B1: provides `htmlHostNode()` — a single factory that builds the `k: 'host'`
 * LayoutNode with `props` and `vars`, so all 4 Tier B blocks (`tls.c.hero`,
 * `tls.c.feature-grid`, `tls.c.testimonial`, `tls.c.big-stat`) share one
 * code path instead of each duplicating the host-node shape.
 *
 * `vars` maps CSS custom properties for per-instance colour overrides.
 * The rule (B1 H2): emit `vars` only when the block is nested (ctx.depth > 0)
 * or when `ctx.style` sets one of the override keys — otherwise leave
 * `vars` undefined so top-level blocks keep inheriting deck-level vars
 * and theme-switch still works.
 */

import type { LayoutContext, LayoutNode, BlockStyleSpec } from './types'
import type { ColorRole } from './types'

/**
 * Build a `k: 'host'` LayoutNode for a Tier B block.
 *
 * - `props` carries the block's own props so `HostMount` renders the child's
 *   content, not the parent's.
 * - `vars` carries per-instance colour-override CSS custom properties,
 *   computed only when needed (see H2 rule below).
 *
 * @param posterFn The block's poster function (def.poster).
 * @param type The block's type string (e.g. 'tls.c.hero').
 * @param props The block's own props.
 * @param ctx The layout context.
 */
export function htmlHostNode(
  posterFn: (props: Record<string, unknown>, ctx: LayoutContext) => LayoutNode,
  type: string,
  props: Record<string, unknown>,
  ctx: LayoutContext,
): LayoutNode {
  const posterNode = posterFn(props, ctx)

  const node: LayoutNode = {
    k: 'host',
    box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
    part: 'root',
    render: type,
    poster: posterNode,
    props,
  }

  // H2 rule: emit `vars` only when nested (depth > 0) OR ctx.style sets
  // on/accent/surface. Otherwise vars is `undefined` and today's output
  // (deck-level vars via HostMount's inline style) is untouched.
  const style = ctx.style
  const hasOverride = !!style && (
    style.on !== undefined ||
    style.accent !== undefined ||
    style.surface !== undefined
  )
  const isNested = ctx.depth > 0

  if (isNested || hasOverride) {
    node.vars = buildColorVars(style, ctx)
  }

  return node as LayoutNode
}

/**
 * Build the `vars` object — CSS custom properties for per-instance colour
 * overrides.
 *
 * Mapping (real names from CSS_VAR_MAP in render-dom.tsx):
 * - `'--tls-on' ← ctx.resolveColor('text').color`  (when on is set)
 * - `'--tls-accent' ← ctx.resolveColor('accent').color`  (when accent is set)
 * - `'--tls-text-muted' ← ctx.resolveColor('textMuted').color`  (always, when emitting)
 * - `'--tls-surface'` and `'--tls-surface-color' ← ctx.resolveColor('surface').color`
 *   (only when ctx.style.surface is a string override, or nested)
 *
 * A Paint surface is already handled by `createLayoutContext`'s
 * `effectiveSurface`, so we skip it here to avoid double-setting.
 */
function buildColorVars(
  style: BlockStyleSpec | undefined,
  ctx: LayoutContext,
): Record<string, string> {
  const vars: Record<string, string> = {}

  if (style?.on !== undefined) {
    vars['--tls-on'] = ctx.resolveColor('text' as ColorRole).color
  }
  if (style?.accent !== undefined) {
    vars['--tls-accent'] = ctx.resolveColor('accent' as ColorRole).color
  }
  // surface: only when it's a string override (Paint handled by context).
  // When nested, also emit surface so the child gets its own background.
  if (style?.surface !== undefined) {
    if (typeof style.surface === 'string') {
      vars['--tls-surface'] = ctx.resolveColor('surface' as ColorRole).color
      vars['--tls-surface-color'] = vars['--tls-surface']
    }
  }
  // textMuted: always emit when we're in the vars-emitting branch
  vars['--tls-text-muted'] = ctx.resolveColor('textMuted' as ColorRole).color

  return vars
}
