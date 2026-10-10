/**
 * Pure layout function for tls.l.overlay — layered children (z-stacked).
 *
 * By default every child fills the full box, layered in document order (last child on top).
 *
 * CMP1 — layers inside a container. A child may set:
 * - `anchor` (LO2.1 vocabulary): any value but `fill` places the child at its natural size at
 *   that edge / corner / centre of the overlay box, inset by `space.lg` (the overlay's
 *   `style.padding`, when set, replaces that inset). `fill` or absent = the whole box.
 * - `layer`: `backdrop` children paint first, then content (absent), then `overlay` children;
 *   authored order within each layer. Motion parts (`child/<i>`) keep the authored order.
 *
 * The overlay's surface paint is passed to every child as the surface it sits on.
 */

import type { BlockAnchor, BlockSpec, Box, LayoutContext, LayoutNode, Paint, SpaceToken } from '../../../types'
import type { OverlayProps } from './schema'
import { tagChildren } from '../_motion'
import { collectPaintedLeaves, paintedBounds } from '../../../layout/measure-block'

/** Anchor → [column, row] in halves: 0 = start, 1 = centre, 2 = end (same grid as LO2.1). */
const ANCHOR_GRID: Record<Exclude<BlockAnchor, 'fill'>, [number, number]> = {
  'top-left': [0, 0],
  top: [1, 0],
  'top-right': [2, 0],
  left: [0, 1],
  center: [1, 1],
  right: [2, 1],
  'bottom-left': [0, 2],
  bottom: [1, 2],
  'bottom-right': [2, 2],
}

const LAYER_ORDER = { backdrop: 0, content: 1, overlay: 2 } as const

function insetOf(ctx: LayoutContext): [number, number] {
  const p = ctx.style?.padding
  if (typeof p === 'number') return [p, p]
  if (Array.isArray(p)) return [p[0], p[1]]
  if (typeof p === 'string') {
    const v = ctx.tokens.space[p as SpaceToken] ?? ctx.tokens.space.lg
    return [v, v]
  }
  return [ctx.tokens.space.lg, ctx.tokens.space.lg]
}

/** The box of an anchored child: its natural size (painted bounds of a probe layout inside the
 *  inset box) at the anchor. */
function anchoredChildBox(ctx: LayoutContext, child: BlockSpec, anchor: Exclude<BlockAnchor, 'fill'>, full: Box, surface: Paint): Box {
  const [padV, padH] = insetOf(ctx)
  const inner: Box =
    full.width > 2 * padH && full.height > 2 * padV
      ? { x: padH, y: padV, width: full.width - 2 * padH, height: full.height - 2 * padV }
      : full
  let w = inner.width
  let h = inner.height
  try {
    const probe = ctx.layoutChild(child, { x: 0, y: 0, width: inner.width, height: inner.height }, { surface })
    const b = paintedBounds(collectPaintedLeaves(probe, { width: inner.width, height: inner.height }))
    if (b) {
      // A little slack so the re-layout at the natural width wraps the same lines.
      w = Math.min(inner.width, Math.ceil(Math.max(0, b.x) + b.width + 2))
      h = Math.min(inner.height, Math.ceil(Math.max(0, b.y) + b.height + 1))
    }
  } catch {
    /* keep the whole inner box */
  }
  const [col, row] = ANCHOR_GRID[anchor]
  return { x: inner.x + ((inner.width - w) * col) / 2, y: inner.y + ((inner.height - h) * row) / 2, width: w, height: h }
}

export function layout(props: OverlayProps, ctx: LayoutContext): LayoutNode {
  const children = props.children ?? []
  const W = ctx.box.width
  const H = ctx.box.height
  const fullBox = { x: 0, y: 0, width: W, height: H }

  // The overlay's own background: the instance's Paint when set, else the resolved
  // surface role. Rendered first so it sits behind every layered child.
  const surfacePaint: Paint =
    ctx.style?.surface && typeof ctx.style.surface !== 'string'
      ? ctx.style.surface
      : { type: 'solid', color: ctx.resolveColor('surface').color }

  const childNodes: LayoutNode[] = children.map((child) => {
    const anchor = child && typeof child === 'object' ? child.anchor : undefined
    const box = anchor && anchor !== 'fill' && anchor in ANCHOR_GRID ? anchoredChildBox(ctx, child, anchor as Exclude<BlockAnchor, 'fill'>, fullBox, surfacePaint) : fullBox
    return ctx.layoutChild(child, box, { surface: surfacePaint })
  })

  // RVM2: child/<i> motion parts in authored order; then paint order by layer (stable).
  const tagged = tagChildren(childNodes)
  const layerOf = (i: number): number => {
    const l = children[i]?.layer
    return l === 'backdrop' || l === 'overlay' ? LAYER_ORDER[l] : LAYER_ORDER.content
  }
  const order = tagged.map((_, i) => i).sort((a, b) => layerOf(a) - layerOf(b) || a - b)

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    clip: true,
    children: [
      {
        k: 'rect',
        part: 'surface',
        box: fullBox,
        fill: surfacePaint,
      },
      ...order.map((i) => tagged[i]),
    ],
  }
}
