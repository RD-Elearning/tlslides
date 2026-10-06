/**
 * Pure layout for tls.g.hub-spoke — a hub circle with 3 to 8 spoke cards around it.
 *
 * `circle` places the spokes on an ellipse (clockwise from 12 o'clock) around a centred hub;
 * `half` fans them over the top half with the hub at the bottom centre. Card and hub sizes shrink
 * together until no two boxes touch, so the maximum count always lays out. Links run along the
 * hub-to-spoke ray, starting on the hub circle and ending on the spoke card's edge (with an arrow
 * head at either end for `arrow-out` / `arrow-in`).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { Box, CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { iconLeaf } from '../../text/_engine/icon'
import type { HubSpokeProps } from './schema'
import { SPOKE_MAX } from './schema'
import { arrowHead, asArr, capacityOf, chartColors, clamp, emptyState, enumOf, linesHeight, lineH, mutedStyle, objs, onColor, placeLines, polyline, rampColor, root, str, strokePath, style, tintOf } from '../_kit'

const hit = (a: Box, b: Box, pad = 6) => a.x < b.x + b.width + pad && b.x < a.x + a.width + pad && a.y < b.y + b.height + pad && b.y < a.y + a.height + pad

export function layout(props: HubSpokeProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const hubObj = objs([props.hub])[0] ?? {}
  const spokes = objs(props.spokes)
    .slice(0, SPOKE_MAX)
    .map((s) => ({ label: str(s.label), text: str(s.text), icon: typeof s.icon === 'string' ? s.icon : '' }))
  const N = spokes.length
  if (N < 1 || !str(hubObj.label)) return emptyState(ctx, 'Add a hub and spokes')
  const c = chartColors(ctx)
  const half = enumOf(props.layout, ['circle', 'half'] as const, 'circle') === 'half'
  const conn = enumOf(props.connector, ['line', 'arrow-out', 'arrow-in', 'none'] as const, 'line')
  const labelS = style(ctx, 'caption', c.text)
  const noteS = mutedStyle(ctx, 'footnote')

  // ---- sizes: shrink until nothing touches ------------------------------------------------------
  let cw = clamp(W * 0.2, 130, 270)
  let ch = clamp(H * 0.19, 60, 110)
  let dh = clamp(Math.min(W, H) * 0.3, 80, 230)
  const cx = W / 2
  const cy = half ? H - dh / 2 - 4 : H / 2
  let boxes: Box[] = []
  let hubBox: Box = { x: 0, y: 0, width: 0, height: 0 }
  for (let iter = 0; iter < 40; iter++) {
    hubBox = { x: cx - dh / 2, y: cy - dh / 2, width: dh, height: dh }
    const rx = Math.max(10, (W - cw) / 2)
    const ry = Math.max(10, half ? cy - ch / 2 - 4 : (H - ch) / 2)
    boxes = spokes.map((_, i) => {
      const t = half ? -Math.PI + (N === 1 ? Math.PI / 2 : (i * Math.PI) / (N - 1)) : -Math.PI / 2 + (i * 2 * Math.PI) / N
      const x = cx + rx * Math.cos(t)
      const y = cy + ry * Math.sin(t)
      return { x: x - cw / 2, y: y - ch / 2, width: cw, height: ch }
    })
    const bad = boxes.some((b, i) => hit(b, hubBox, 14) || boxes.some((o, j) => j > i && hit(b, o, 8)))
    if (!bad || (cw < 56 && ch < 30)) break
    cw *= 0.93
    ch *= 0.95
    dh *= 0.95
  }

  const nodes: LayoutNode[] = []
  const hcx = hubBox.x + hubBox.width / 2
  const hcy = hubBox.y + hubBox.height / 2
  const rHub = hubBox.width / 2

  // ---- links ---------------------------------------------------------------------------------------
  if (conn !== 'none') {
    boxes.forEach((b, i) => {
      const sx = b.x + b.width / 2
      const sy = b.y + b.height / 2
      const dx = sx - hcx
      const dy = sy - hcy
      const dist = Math.hypot(dx, dy)
      if (dist < 1) return
      const u0 = rHub / dist
      const tBox = Math.min(dx !== 0 ? b.width / 2 / Math.abs(dx) : Infinity, dy !== 0 ? b.height / 2 / Math.abs(dy) : Infinity)
      const u1 = 1 - tBox
      const head = conn === 'line' ? 0 : 12
      if (u1 - u0 <= (head * 2) / dist + 0.01) return
      const p0 = { x: hcx + dx * u0, y: hcy + dy * u0 }
      const p1 = { x: hcx + dx * u1, y: hcy + dy * u1 }
      const ux = dx / dist
      const uy = dy / dist
      // The line stops at the arrow head's base so the stroke never pokes through the head.
      const a = conn === 'arrow-in' ? { x: p0.x + ux * head, y: p0.y + uy * head } : p0
      const z = conn === 'arrow-out' ? { x: p1.x - ux * head, y: p1.y - uy * head } : p1
      nodes.push(strokePath(ctx, polyline([a, z]), `link[${i}]`, c.muted, 3))
      if (conn === 'arrow-out') nodes.push(arrowHead(ctx, p1, ux, uy, head, c.muted, `link[${i}].head`))
      if (conn === 'arrow-in') nodes.push(arrowHead(ctx, p0, -ux, -uy, head, c.muted, `link[${i}].head`))
    })
  }

  // ---- hub -----------------------------------------------------------------------------------------
  const hubFill = c.accent
  const hubInk = onColor(ctx, hubFill)
  nodes.push({ k: 'rect', part: 'hub', box: hubBox, fill: { type: 'solid', color: hubFill }, radius: rHub })
  const hubIcon = typeof hubObj.icon === 'string' ? hubObj.icon : ''
  const hw = Math.max(10, dh * 0.8)
  const hubLines = clamp(Math.floor((dh * 0.5) / lineH(labelS)), 1, 2)
  const hlh = linesHeight(ctx, str(hubObj.label), labelS, hw, hubLines)
  const isz = hubIcon && dh >= 110 ? Math.min(44, dh * 0.28) : 0
  const stackH = hlh + (isz ? isz + 6 : 0)
  const top = hcy - stackH / 2
  if (isz) nodes.push(iconLeaf(hubIcon, { x: hcx - isz / 2, y: top, width: isz, height: isz }, hubInk, 'hub.icon'))
  nodes.push(...placeLines(ctx, str(hubObj.label), { ...labelS, color: hubInk }, { x: hcx - hw / 2, y: top + (isz ? isz + 6 : 0), width: hw }, 'center', hubLines, 'hub.label').nodes)

  // ---- spokes ----------------------------------------------------------------------------------------
  boxes.forEach((b, i) => {
    const s = spokes[i]
    const color = rampColor(ctx, 'gradient', i, N)
    nodes.push({ k: 'rect', part: `spoke[${i}]`, box: b, fill: { type: 'solid', color: tintOf(c.surface, color, 0.16) }, stroke: { color, width: 2 }, radius: Math.min(14, b.height / 3) })
    const pad = b.height < 56 ? 4 : 10
    const isIcon = s.icon && b.width >= 150 && b.height >= 56
    const isz2 = isIcon ? Math.min(28, b.height - 2 * pad) : 0
    const x = b.x + pad + (isz2 ? isz2 + 8 : 0)
    const w = Math.max(8, b.width - (x - b.x) - pad)
    if (isz2) nodes.push(iconLeaf(s.icon, { x: b.x + pad, y: b.y + (b.height - isz2) / 2, width: isz2, height: isz2 }, color, `icon[${i}]`))
    const room = b.height - 2 * Math.min(pad, 4)
    const nl = s.text && room >= lineH(labelS) + lineH(noteS) + 2 ? Math.min(2, Math.floor((room - lineH(labelS) - 2) / lineH(noteS))) : 0
    const lh = linesHeight(ctx, s.label, labelS, w, 1)
    const nh = nl > 0 ? linesHeight(ctx, s.text, noteS, w, nl) : 0
    const total = lh + (nh ? 2 + nh : 0)
    const ty = b.y + (b.height - total) / 2
    nodes.push(...placeLines(ctx, s.label, labelS, { x, y: ty, width: w }, isz2 ? 'start' : 'center', 1, `label[${i}]`).nodes)
    if (nh) nodes.push(...placeLines(ctx, s.text, noteS, { x, y: ty + lh + 2, width: w }, isz2 ? 'start' : 'center', nl, `text[${i}]`).nodes)
  })
  return root(ctx, nodes)
}

export function capacity(props: HubSpokeProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ spokes: { max: SPOKE_MAX, used: asArr(props.spokes).length } }, true, [
    { kind: 'truncate', slot: 'spokes' },
    { kind: 'reflow', to: 'tls.g.tree' },
  ])
}
