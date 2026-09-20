/**
 * Pure layout function for tls.c.image-text — image beside/above a text cluster.
 *
 * Layout logic:
 * - `left`/`right`: split box horizontally — image on one side, text stack on
 *   the other, separated by a gutter.
 * - `top`: image fills the top portion (imageRatio of height), text below fills
 *   the rest.
 *
 * The image is delegated to `tls.m.image` via `ctx.layoutChild` (no new
 * LayoutNode kind). Text parts (kicker, title, body) are rendered directly with
 * `ctx.resolveText`/`ctx.measureText`, giving us the exact part names the
 * motion recipe needs. This matches the hero poster's pattern.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { BlockSpec, LayoutContext, LayoutNode, SpaceToken } from '../../../types'
import type { ImageTextProps } from './schema'

/** Minimum height for the image area in slide units. */
const MIN_IMAGE_DIM = 80

/**
 * Render a kicker text node (small label above the title).
 */
function renderKicker(
  text: string,
  width: number,
  ctx: LayoutContext,
  yOffset: number,
): LayoutNode {
  const style = ctx.resolveText('caption', { letterSpacing: 0.08 })
  const resolved = { ...style, color: ctx.resolveColor('accent').color }
  const displayText = text.toUpperCase()
  const m = ctx.measureText(displayText, resolved, width)
  return {
    k: 'text',
    part: 'kicker',
    box: { x: 0, y: yOffset, width, height: m.height },
    lines: m.lines,
    style: resolved,
  }
}

/**
 * Render a title text node.
 */
function renderTitle(
  text: string,
  width: number,
  ctx: LayoutContext,
  yOffset: number,
): LayoutNode {
  const style = ctx.resolveText('title', { letterSpacing: -0.03 })
  const resolved = { ...style, color: ctx.resolveColor('text').color }
  const m = ctx.measureText(text, resolved, width)
  return {
    k: 'text',
    part: 'title',
    box: { x: 0, y: yOffset, width, height: m.height },
    lines: m.lines,
    style: resolved,
  }
}

/**
 * Render a body text node.
 */
function renderBody(
  text: string,
  width: number,
  ctx: LayoutContext,
  yOffset: number,
): LayoutNode {
  const style = ctx.resolveText('body')
  const resolved = { ...style, color: ctx.resolveColor('text').color }
  const m = ctx.measureText(text, resolved, width)
  return {
    k: 'text',
    part: 'body',
    box: { x: 0, y: yOffset, width, height: m.height },
    lines: m.lines,
    style: resolved,
  }
}

export function layout(props: ImageTextProps, ctx: LayoutContext): LayoutNode {
  const placement = props.placement ?? 'left'
  const imageRatio = Math.max(0.2, Math.min(0.8, props.imageRatio ?? 0.48))
  const gutterToken = (props.gutter ?? 'lg') as SpaceToken
  const gutter = ctx.tokens.space[gutterToken] ?? ctx.tokens.space.lg
  const W = ctx.box.width
  const H = ctx.box.height

  const isHorizontal = placement === 'left' || placement === 'right'
  const imageOnLeft = placement === 'left'

  // ── Image spec (delegated to tls.m.image via layoutChild) ──
  const imageSpec: BlockSpec = {
    id: 'img',
    type: 'tls.m.image',
    props: {
      src: props.image,
      alt: props.alt,
      fit: 'cover',
    },
  }

  if (isHorizontal) {
    // ── Left / Right: horizontal split ──
    const imageW = Math.max(MIN_IMAGE_DIM, Math.round((W - gutter) * imageRatio))
    const textW = Math.max(MIN_IMAGE_DIM, W - gutter - imageW)

    // Position image and text cluster side by side, respecting placement.
    const imageBox = imageOnLeft
      ? { x: 0, y: 0, width: imageW, height: H }
      : { x: textW + gutter, y: 0, width: imageW, height: H }
    const textBox = imageOnLeft
      ? { x: imageW + gutter, y: 0, width: textW, height: H }
      : { x: 0, y: 0, width: textW, height: H }

    // Delegate the image to tls.m.image
    const imageNode = ctx.layoutChild(imageSpec, imageBox)

    // Render text cluster directly
    const textNodes = buildTextCluster(props, textW, H, ctx)
    const textGroup: LayoutNode = {
      k: 'group',
      box: textBox,
      part: 'text-cluster',
      children: textNodes,
    }

    const children: LayoutNode[] = imageOnLeft
      ? [imageNode, textGroup]
      : [textGroup, imageNode]

    return {
      k: 'group',
      box: { x: 0, y: 0, width: W, height: H },
      part: 'root',
      children,
    }
  }

  // ── Top: vertical split ──
  const imageH = Math.max(MIN_IMAGE_DIM, Math.round(H * imageRatio))
  const textH = Math.max(MIN_IMAGE_DIM, H - imageH)

  const imageBox = { x: 0, y: 0, width: W, height: imageH }
  const textBox = { x: 0, y: imageH, width: W, height: textH }

  const imageNode = ctx.layoutChild(imageSpec, imageBox)
  const textNodes = buildTextCluster(props, W, textH, ctx)
  const textGroup: LayoutNode = {
    k: 'group',
    box: textBox,
    part: 'text-cluster',
    children: textNodes,
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: W, height: H },
    part: 'root',
    children: [imageNode, textGroup],
  }
}

/**
 * Build the kicker + title + body text nodes, stacked vertically.
 * Each node's x/y is relative to the text column's origin.
 * All nodes are clamped to maxHeight so nothing spills outside the group.
 */
function buildTextCluster(
  props: ImageTextProps,
  width: number,
  maxHeight: number,
  ctx: LayoutContext,
): LayoutNode[] {
  const nodes: LayoutNode[] = []
  let y = 0
  const gap = ctx.tokens.space.sm

  if (props.kicker) {
    const kickerNode = renderKicker(props.kicker, width, ctx, y)
    // Leave room for the gap after this node so y doesn't overshoot maxHeight.
    const available = Math.max(0, maxHeight - y - gap)
    const clampedHeight = Math.min(kickerNode.box.height, available)
    if (clampedHeight > 0) {
      nodes.push({
        ...kickerNode,
        box: { ...kickerNode.box, height: clampedHeight },
      })
      y += clampedHeight + gap
    }
  }

  if (props.title) {
    const titleNode = renderTitle(props.title, width, ctx, y)
    const available = Math.max(0, maxHeight - y - gap)
    const clampedHeight = Math.min(titleNode.box.height, available)
    if (clampedHeight > 0) {
      nodes.push({
        ...titleNode,
        box: { ...titleNode.box, height: clampedHeight },
      })
      y += clampedHeight + gap
    }
  }

  if (props.body) {
    // Allocate remaining height to body
    const bodyHeight = Math.max(0, maxHeight - y)
    const bodyNode = renderBody(props.body, width, ctx, y)
    // Clamp body height to available space
    const clampedBody = {
      ...bodyNode,
      box: { ...bodyNode.box, height: Math.min(bodyNode.box.height, bodyHeight) },
    }
    // Always push the body node (even at height 0) so the part name is present
    // in the tree for motion targeting.
    nodes.push(clampedBody)
  }

  return nodes
}
