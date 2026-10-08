/**
 * Pure layout function for tls.m.image — image block.
 *
 * Emits an `image` LayoutNode with resolved URL (via `ctx.resolveAsset`), plus an
 * optional caption text node below the image. When the asset cannot be resolved,
 * the image node is emitted without a `url` — the renderers show a dashed frame
 * with the alt text instead.
 *
 * Layout code is DOM-free: no `document`, no `window`, no `Date.now()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { ImageProps } from './schema'

/** Caption height budget in slide units. */
const CAPTION_HEIGHT = 40
/** Gap between image and caption in slide units. */
const CAPTION_GAP = 8

export function layout(props: ImageProps, ctx: LayoutContext): LayoutNode {
  const fit = props.fit ?? 'cover'
  const focal = props.focal ?? [0.5, 0.5]
  const radius = props.radius

  // Resolve the asset URL if a resolver is available.
  const url = ctx.resolveAsset?.(props.src)

  // Caption height: if there's a caption, reserve space for it below the image.
  const hasCaption = !!(props.caption && props.caption.trim())
  const imageHeight = hasCaption
    ? Math.max(0, ctx.box.height - CAPTION_HEIGHT - CAPTION_GAP)
    : ctx.box.height

  const children: LayoutNode[] = []

  // Image node (or missing-asset placeholder handled by renderers)
  children.push({
    k: 'image',
    part: 'image',
    box: { x: 0, y: 0, width: ctx.box.width, height: imageHeight },
    assetId: props.src,
    alt: props.alt,
    fit,
    focal,
    radius,
    ...(url ? { url } : {}),
  })

  // Optional caption
  if (hasCaption) {
    const captionStyle = ctx.resolveText('caption')
    const captionMetrics = ctx.measureText(props.caption!, captionStyle, ctx.box.width)
    children.push({
      k: 'text',
      part: 'caption',
      box: {
        x: 0,
        y: imageHeight + CAPTION_GAP,
        width: ctx.box.width,
        height: CAPTION_HEIGHT,
      },
      lines: captionMetrics.lines,
      style: captionStyle,
    })
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
    part: 'root',
    children,
  }
}
