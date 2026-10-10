/**
 * Pure layout for tls.t.badge — [icon] label on a pill (CMP3 atom, SURVEY A4).
 *
 * The pill hugs its label (browser-true widths) and sits at the top-left of its box; the root
 * reports the pill's height. A box narrower than the pill shrinks the type, never the padding, so
 * the pill never overflows. One group part `badge` holds the fill, the icon and the label, so the
 * badge enters as one object. Paint from `atomPaint` (tone + the deck style's surface rules);
 * corners from the style (`chipRadius`: a pill, or square tags in a sharp style).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle, Size, TypeToken } from '../../../types'
import type { BadgeProps } from './schema'
import { atomPaint, chipRadius, type AtomTone } from '../_engine/atom'
import { iconLeaf } from '../_engine/icon'
import { withRealWidths } from '../../data/_chart/kit'
import { hasIcon } from '../../../icons'

const TOKEN: Record<string, TypeToken> = { sm: 'footnote', md: 'caption', lg: 'body' }
/** Tracking of the label: a touch open, as small labels set best. */
const TRACKING = 0.02

interface BadgeGeom {
  w: number
  h: number
  padX: number
  icon: number
  gap: number
  text: string
  style: ResolvedTextStyle
  lines: ReturnType<LayoutContext['measureText']>['lines']
  th: number
  tw: number
}

function geometry(props: BadgeProps, ctx0: LayoutContext, maxW: number, maxH: number): BadgeGeom {
  const ctx = withRealWidths(ctx0)
  const size = props.size === 'sm' || props.size === 'lg' ? props.size : 'md'
  const text = typeof props.text === 'string' ? props.text.slice(0, 80) : ''
  const showIcon = typeof props.icon === 'string' && props.icon !== '' && hasIcon(props.icon)
  let style: ResolvedTextStyle = ctx.resolveText(TOKEN[size], { letterSpacing: TRACKING })
  let g: BadgeGeom | undefined
  for (let k = 0; k < 10; k++) {
    const padX = Math.round(style.size * 0.75)
    const padY = Math.round(style.size * 0.32)
    const icon = showIcon ? Math.round(style.size * 1.05) : 0
    const gap = showIcon ? Math.round(style.size * 0.4) : 0
    const room = Math.max(1, maxW - 2 * padX - icon - gap)
    const m = ctx.measureText(text, style)
    const tw = Math.ceil(Math.min(m.width, room))
    const th = style.size * style.lineHeight
    const h = Math.round(th + 2 * padY)
    const w = Math.ceil(2 * padX + icon + gap + tw)
    g = { w, h, padX, icon, gap, text, style, lines: m.lines.slice(0, 1), th, tw }
    // Shrink the type (never the padding) until the pill fits the box.
    if ((m.width <= room + 0.5 && h <= maxH + 0.5) || style.size < 8) break
    style = { ...style, size: style.size * 0.88 }
  }
  return g as BadgeGeom
}

export function layout(props: BadgeProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = ctx.box.height > 0 ? ctx.box.height : Infinity
  const g = geometry(props, ctx, W, H)
  const tone: AtomTone = props.tone === 'soft' || props.tone === 'outline' ? props.tone : 'solid'
  const paint = atomPaint(ctx, tone, ctx.resolveColor('accent').color)
  const w = Math.min(W, g.w)
  const h = g.h
  const pill: LayoutNode = {
    k: 'rect',
    part: 'badge.pill',
    box: { x: 0, y: 0, width: w, height: h },
    ...(paint.fill ? { fill: paint.fill } : {}),
    ...(paint.stroke ? { stroke: paint.stroke } : {}),
    ...(paint.shadow ? { shadow: paint.shadow } : {}),
    radius: chipRadius(ctx, h),
  } as LayoutNode
  const children: LayoutNode[] = [pill]
  if (g.icon > 0) children.push(iconLeaf(props.icon, { x: g.padX, y: (h - g.icon) / 2, width: g.icon, height: g.icon }, paint.ink, 'badge.icon'))
  children.push({
    k: 'text',
    part: 'badge.text',
    box: { x: g.padX + g.icon + g.gap, y: (h - g.th) / 2, width: Math.max(1, g.tw), height: g.th },
    lines: g.lines,
    style: { ...g.style, color: paint.ink },
    propPath: 'text',
  })
  const badge: LayoutNode = { k: 'group', part: 'badge', box: { x: 0, y: 0, width: w, height: h }, children }
  // The content height (a region stacks by it); the pill sits at the box's top-left.
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: h }, children: [badge] }
}

/** The pill's own size: what a stack or an anchor gives the badge. */
export function intrinsicSize(props: BadgeProps, ctx: LayoutContext): Size {
  const g = geometry(props, ctx, Math.max(1, ctx.box.width || 4000), Infinity)
  return { width: g.w, height: g.h }
}
