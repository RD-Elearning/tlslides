/**
 * Pure layout for tls.t.marker — a numbered disc, or an oversized numeral (CMP3 atom, SURVEY A4,
 * ppt-master "numbered circle or badge").
 *
 * `circle`: a disc of the size step (48 / 72 / 104) with the number centred in the heading face;
 * paint from `atomPaint` (solid / soft / outline, the style's border and hard shadow). `numeral`: the
 * number set large in the heading face, tight tracking, in the accent — the editorial "01". A box
 * smaller than the step scales the marker down. One group part `marker`; the root reports the
 * marker's own size and sits it at the top-left of the box.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle, Size } from '../../../types'
import type { MarkerProps } from './schema'
import { atomPaint, type AtomTone } from '../_engine/atom'
import { withRealWidths } from '../../data/_chart/kit'

export const MARKER_DISC = { sm: 48, md: 72, lg: 104 } as const
export const MARKER_NUMERAL = { sm: 64, md: 112, lg: 168 } as const
/** Number size inside a disc, as a share of the diameter. */
const DISC_TYPE = 0.44

function sizeOf(props: MarkerProps): 'sm' | 'md' | 'lg' {
  return props.size === 'sm' || props.size === 'lg' ? props.size : 'md'
}

function valueOf(props: MarkerProps): string {
  return typeof props.value === 'string' || typeof props.value === 'number' ? String(props.value).slice(0, 4) : ''
}

interface MarkerGeom {
  w: number
  h: number
  style: ResolvedTextStyle
  tw: number
  th: number
  lines: ReturnType<LayoutContext['measureText']>['lines']
  circle: boolean
}

function geometry(props: MarkerProps, ctx0: LayoutContext, maxW: number, maxH: number): MarkerGeom {
  const ctx = withRealWidths(ctx0)
  const circle = props.variant !== 'numeral'
  const size = sizeOf(props)
  const text = valueOf(props)
  const room = Math.max(1, Math.min(maxW, maxH))
  if (circle) {
    const d = Math.min(MARKER_DISC[size], room)
    const style: ResolvedTextStyle = { ...ctx.resolveText('heading'), size: Math.round(d * DISC_TYPE), lineHeight: 1.2, letterSpacing: -0.01 }
    // Two digits sit inside the disc; more shrink to fit its width.
    let s = style
    let m = ctx.measureText(text, s)
    for (let k = 0; k < 6 && m.width > d * 0.72; k++) {
      s = { ...s, size: s.size * 0.88 }
      m = ctx.measureText(text, s)
    }
    return { w: d, h: d, style: s, tw: Math.ceil(m.width), th: s.size * s.lineHeight, lines: m.lines.slice(0, 1), circle }
  }
  let s: ResolvedTextStyle = { ...ctx.resolveText('display'), size: MARKER_NUMERAL[size], lineHeight: 1.0, letterSpacing: -0.04 }
  let m = ctx.measureText(text, s)
  // Scale straight to the box, then trim (widths are not exactly linear in size).
  for (let k = 0; k < 6 && (m.width > maxW || s.size * s.lineHeight > maxH) && s.size > 6; k++) {
    const f = Math.min(maxW / Math.max(1, m.width), maxH / (s.size * s.lineHeight), 0.97)
    s = { ...s, size: Math.max(6, Math.floor(s.size * f)) }
    m = ctx.measureText(text, s)
  }
  const th = s.size * s.lineHeight
  return { w: Math.ceil(m.width), h: Math.ceil(th), style: s, tw: Math.ceil(m.width), th, lines: m.lines.slice(0, 1), circle }
}

export function layout(props: MarkerProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = ctx.box.height > 0 ? ctx.box.height : Infinity
  const g = geometry(props, ctx, W, H)
  const children: LayoutNode[] = []
  let ink: string
  if (g.circle) {
    const tone: AtomTone = props.tone === 'soft' || props.tone === 'outline' ? props.tone : 'solid'
    const paint = atomPaint(ctx, tone, ctx.resolveColor('accent').color)
    ink = paint.ink
    children.push({
      k: 'rect',
      part: 'marker.disc',
      box: { x: 0, y: 0, width: g.w, height: g.h },
      ...(paint.fill ? { fill: paint.fill } : {}),
      ...(paint.stroke ? { stroke: { ...paint.stroke, width: Math.max(paint.stroke.width, Math.round(g.w / 28)) } } : {}),
      ...(paint.shadow ? { shadow: paint.shadow } : {}),
      radius: g.w / 2,
    } as LayoutNode)
  } else {
    ink = ctx.resolveColor('accent').color
  }
  children.push({
    k: 'text',
    part: 'marker.value',
    box: { x: (g.w - g.tw) / 2, y: (g.h - g.th) / 2, width: Math.max(1, g.tw), height: g.th },
    lines: g.lines,
    style: { ...g.style, color: ink },
    propPath: 'value',
    align: 'center',
  })
  const marker: LayoutNode = { k: 'group', part: 'marker', box: { x: 0, y: 0, width: g.w, height: g.h }, children }
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: g.h }, children: [marker] }
}

/** The marker's own size (a stack or an anchor gives it exactly this). */
export function intrinsicSize(props: MarkerProps, ctx: LayoutContext): Size {
  const g = geometry(props, ctx, Math.max(1, ctx.box.width || 4000), Infinity)
  return { width: g.w, height: g.h }
}
