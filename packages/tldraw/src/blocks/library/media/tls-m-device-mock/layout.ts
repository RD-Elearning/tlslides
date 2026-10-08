/**
 * Pure layout for tls.m.device-mock — a screenshot inside a browser, laptop, phone or tablet frame.
 *
 * The device is drawn from rects (constants below are the proportions of each device), fitted
 * inside the box and centred; the screenshot is an `image` with `fit: cover`, top-aligned
 * (`focal: [0.5, 0]`) so the top of a long page shows. Everything is a flat list of absolute leaves.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, LintFinding } from '../../../types'
import type { DeviceMockProps } from './schema'
import { altFindings, clamp, enumOf, imageLeaf, onColor, readableOn, side, str, tintOf } from '../_kit'
import { lumOf } from '../../text/_engine/color'
import { placeLines } from '../../diagram/_kit'

/** Width / height of the whole device, including a laptop's base. */
export const DEVICE_ASPECT = { browser: 1.45, laptop: 1.6, phone: 0.5, tablet: 0.75 } as const

export function fitDevice(device: keyof typeof DEVICE_ASPECT, W: number, H: number): { x: number; y: number; w: number; h: number } {
  const aspect = DEVICE_ASPECT[device]
  const w = Math.max(1, Math.min(W, H * aspect))
  const h = w / aspect
  return { x: (W - w) / 2, y: (H - h) / 2, w, h }
}

export function layout(props: DeviceMockProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const device = enumOf(props.device, ['browser', 'laptop', 'phone', 'tablet'] as const, 'browser')
  const dark = props.tone === 'dark'
  const surface = ctx.resolveColor('surface').color
  const text = ctx.resolveColor('text').color
  const darkest = lumOf(surface) < lumOf(text) ? surface : text
  const frameColor = dark ? tintOf(darkest, ctx.resolveColor('line').color, 0.12) : tintOf(surface, ctx.resolveColor('line').color, 0.7)
  const edge = dark ? tintOf(darkest, '#ffffff', 0.18) : ctx.resolveColor('line').color
  // Room for the shadow (a quarter-pixel-free offset rect) so nothing leaves the box.
  const m = props.shadow === false ? 0 : clamp(Math.min(W, H) * 0.03, 0, 24)
  const fit = fitDevice(device, Math.max(1, W - 2 * m), Math.max(1, H - 2 * m))
  const d = { x: fit.x + m, y: fit.y + m, w: fit.w, h: fit.h }
  const out: LayoutNode[] = []
  const rect = (part: string, x: number, y: number, w: number, h: number, fill: string, radius?: number, stroke?: string): LayoutNode => ({
    k: 'rect',
    part,
    box: { x, y, width: Math.max(0, w), height: Math.max(0, h) },
    fill: { type: 'solid', color: fill },
    ...(radius !== undefined ? { radius: Math.min(radius, Math.max(0, w) / 2, Math.max(0, h) / 2) } : {}),
    ...(stroke ? { stroke: { color: stroke, width: 2 } } : {}),
  })
  const screen = (x: number, y: number, w: number, h: number, radius: number) =>
    imageLeaf(ctx, props.image, props.alt, { x, y, width: w, height: h }, { part: 'screen', focal: [0.5, 0], radius })

  let body: { x: number; y: number; w: number; h: number; r: number }
  if (device === 'browser') {
    const bar = clamp(d.h * 0.085, 24, 64)
    const bez = clamp(d.w * 0.008, 2, 8)
    body = { ...d, r: clamp(d.w * 0.02, 4, 24) }
    out.push(rect('frame', d.x, d.y, d.w, d.h, frameColor, body.r, edge))
    const dotR = bar * 0.15
    ;[ctx.resolveColor('negative').color, ctx.resolveColor('warning').color, ctx.resolveColor('positive').color].forEach((c, i) => {
      out.push(rect(`frame.dot[${i}]`, d.x + bar * 0.5 + i * dotR * 3.2, d.y + bar / 2 - dotR, dotR * 2, dotR * 2, c, dotR))
    })
    const ax = d.x + bar * 0.5 + dotR * 3.2 * 3 + bar * 0.2
    const aw = Math.max(0, d.x + d.w - bar * 0.5 - ax)
    const ah = bar * 0.56
    const barFill = dark ? tintOf(frameColor, '#ffffff', 0.1) : surface
    if (aw > 40) {
      out.push(rect('frame.address', ax, d.y + (bar - ah) / 2, aw, ah, barFill, ah / 2))
      const url = str(props.url).trim()
      if (url) {
        const sz = clamp(Math.round(ah * 0.5), 10, 22)
        const s = { ...ctx.resolveText('footnote', { size: sz }), color: readableOn(ctx.resolveColor('textMuted').color, barFill) }
        out.push(...placeLines(ctx, url, s, { x: ax + ah * 0.5, y: d.y + (bar - sz * s.lineHeight) / 2, width: Math.max(1, aw - ah) }, 'start', 1, 'frame.url').nodes)
      }
    }
    out.push(screen(d.x + bez, d.y + bar, d.w - 2 * bez, d.h - bar - bez, Math.min(6, body.r / 2)))
  } else if (device === 'laptop') {
    const baseH = d.h * 0.06
    const lidH = d.h - baseH
    const lidW = d.w * 0.86
    const lx = d.x + (d.w - lidW) / 2
    const bez = clamp(lidW * 0.02, 3, 16)
    out.push(rect('frame', lx, d.y, lidW, lidH, frameColor, clamp(lidW * 0.02, 4, 18), edge))
    out.push(screen(lx + bez, d.y + bez, lidW - 2 * bez, lidH - 2 * bez, 4))
    out.push(rect('frame.base', d.x, d.y + lidH, d.w, baseH, tintOf(frameColor, dark ? '#ffffff' : '#000000', 0.06), baseH / 2, edge))
    out.push(rect('frame.notch', d.x + d.w / 2 - d.w * 0.06, d.y + lidH, d.w * 0.12, baseH * 0.45, edge, baseH * 0.2))
  } else {
    const phone = device === 'phone'
    const bez = clamp(d.w * (phone ? 0.035 : 0.04), 3, 28)
    const r = d.w * (phone ? 0.13 : 0.06)
    out.push(rect('frame', d.x, d.y, d.w, d.h, frameColor, r, edge))
    out.push(screen(d.x + bez, d.y + bez * (phone ? 2.2 : 1), d.w - 2 * bez, d.h - bez * (phone ? 4.4 : 2), Math.max(2, r - bez)))
    if (phone) out.push(rect('frame.notch', d.x + d.w / 2 - d.w * 0.14, d.y + bez * 0.7, d.w * 0.28, bez * 0.9, edge, bez * 0.45))
    else out.push(rect('frame.camera', d.x + d.w / 2 - bez * 0.25, d.y + bez * 0.35, bez * 0.5, bez * 0.3, edge, bez * 0.15))
  }
  const children: LayoutNode[] = []
  if (props.shadow !== false) {
    const sh = m * 0.8
    children.push({
      k: 'group',
      part: 'frame.shadow',
      opacity: 0.16,
      box: { x: 0, y: 0, width: W, height: H },
      children: [rect('frame.shadow.rect', d.x + sh * 0.3, d.y + sh, d.w - sh * 0.6, d.h, onColor(ctx, surface) === text ? text : darkest, clamp(d.w * 0.03, 6, 30))],
    })
  }
  children.push(...out)
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children }
}

export function lint(props: DeviceMockProps): LintFinding[] {
  return altFindings([{ src: props.image, alt: props.alt, part: 'screen' }])
}
