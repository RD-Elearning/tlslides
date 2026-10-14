/**
 * Pure layout function for tls.m.image — image block.
 *
 * Emits an `image` LayoutNode with resolved URL (via `ctx.resolveAsset`), plus an
 * optional caption text node below the image. When the asset cannot be resolved,
 * the image node is emitted without a `url` — the renderers show a dashed frame
 * with the alt text instead.
 *
 * enhance IM4: a contained image whose shape is known (`aspect`, else the asset table) is drawn
 * at that shape, centred, inside its `frame` — a panel, a taped panel or a polaroid print — so a
 * figure with a white page background reads as a placed picture, not a white box on the slide.
 *
 * Layout code is DOM-free: no `document`, no `window`, no `Date.now()`.
 */

import type { Box, LayoutContext, LayoutNode } from '../../../types'
import type { ImageProps } from './schema'
import { imageBacking } from '../_kit'
import { tintOf } from '../../text/_engine/color'

/** Caption height budget in slide units. */
const CAPTION_HEIGHT = 40
/** Gap between image and caption in slide units. */
const CAPTION_GAP = 8
/** Frame insets around the picture: sides, top, bottom (a polaroid's chin). */
const FRAME_PAD: Record<'card' | 'tape' | 'polaroid', [number, number, number]> = { card: [16, 16, 16], tape: [16, 22, 16], polaroid: [18, 18, 58] }

function aspectOf(props: ImageProps, ctx: LayoutContext): number | undefined {
  const a = props.aspect
  if (typeof a === 'number' && Number.isFinite(a) && a > 0) return Math.min(8, Math.max(0.2, a))
  const size = ctx.asset?.(props.src)
  return size && size.width > 0 && size.height > 0 ? size.width / size.height : undefined
}

/** A strip of tape across a corner: a slanted quad, `w` long. */
function tape(cx: number, cy: number, w: number, h: number, turn: number): string {
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c])
  return `M${pts.map((p) => `${Math.round(p[0] * 100) / 100} ${Math.round(p[1] * 100) / 100}`).join(' L')} Z`
}

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
  let picture: Box = { x: 0, y: 0, width: ctx.box.width, height: imageHeight }

  const frame = props.frame && props.frame !== 'none' ? props.frame : undefined
  const ratio = fit === 'contain' ? aspectOf(props, ctx) : undefined
  if (ratio) {
    const [px, pt, pb] = frame ? FRAME_PAD[frame] : [0, 0, 0]
    const room = { width: Math.max(1, ctx.box.width - 2 * px), height: Math.max(1, imageHeight - pt - pb) }
    const width = Math.min(room.width, room.height * ratio)
    const height = width / ratio
    const outer = { width: width + 2 * px, height: height + pt + pb }
    const ox = (ctx.box.width - outer.width) / 2
    const oy = (imageHeight - outer.height) / 2
    picture = { x: ox + px, y: oy + pt, width, height }
    if (frame) {
      const surface = ctx.resolveColor('surface').color
      const line = ctx.resolveColor('line').color
      const panel = frame === 'polaroid' ? '#ffffff' : surface
      children.push({
        k: 'rect',
        part: 'frame',
        box: { x: ox, y: oy, width: outer.width, height: outer.height },
        fill: { type: 'solid', color: panel },
        stroke: { color: line, width: 1.5 },
        ...(frame === 'polaroid' ? { shadow: 1 as const } : { radius: ctx.tokens.radius.md }),
      })
      if (frame === 'tape') {
        const tint = tintOf(surface, ctx.resolveColor('accent2').color, 0.38)
        const w = Math.min(120, outer.width * 0.22)
        for (const [cx, turn] of [[ox + w * 0.35, -0.6], [ox + outer.width - w * 0.35, 0.6]] as const) {
          children.push({ k: 'path', part: 'frame.tape', box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height }, d: tape(cx, oy + 4, w, 28, turn), fill: { type: 'solid', color: tint } })
        }
      }
    }
  }

  // AC4: a tinted backing under a resolved cover-fit image — what shows when it does not load.
  if (url && fit === 'cover') children.push(...imageBacking(ctx, props.src, { x: 0, y: 0, width: ctx.box.width, height: imageHeight }, 'image.fallback', radius))

  // Image node (or missing-asset placeholder handled by renderers)
  children.push({
    k: 'image',
    part: 'image',
    box: picture,
    assetId: props.src,
    alt: props.alt,
    fit,
    focal,
    radius,
    ...(url ? { url } : {}),
  })
  // the tape goes over the picture's corners
  if (frame === 'tape' && ratio) {
    const tapes = children.filter((c) => c.part === 'frame.tape')
    for (const t of tapes) children.splice(children.indexOf(t), 1)
    children.push(...tapes)
  }

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
