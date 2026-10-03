/**
 * Pure layout for tls.g.cycle — 3 to 6 steps on a ring, arrows looping from each to the next.
 *
 * `circle` nodes are round (number or icon inside) with label and note OUTSIDE the ring, on the
 * side away from the centre (above / below for the nodes at 12 and 6 o'clock). `card` nodes carry
 * their label and note inside and sit on an ellipse sized so neighbours never touch. Arrows are
 * elliptical arcs on the same path, trimmed where they leave and enter a node, with a filled head.
 * The first step sits at 12 o'clock; `counter` runs the loop the other way.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { iconLeaf } from '../../text/_engine/icon'
import type { CycleProps } from './schema'
import { CYCLE_MAX } from './schema'
import {
  arrowHead, asArr, capacityOf, chartColors, clamp, emptyState, enumOf, linesHeight, lineH, mutedStyle, objs, onColor, placeLines, rampColor, root, str, strokePath, style, tintOf,
} from '../_kit'

interface NodeBox {
  cx: number
  cy: number
  w: number
  h: number
  round: boolean
}

const HEAD = 14
const ARROW_W = 3
const PAD = 6

function inside(n: NodeBox, x: number, y: number, pad: number): boolean {
  if (n.round) return Math.hypot(x - n.cx, y - n.cy) <= n.w / 2 + pad
  return Math.abs(x - n.cx) <= n.w / 2 + pad && Math.abs(y - n.cy) <= n.h / 2 + pad
}

export function layout(props: CycleProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const steps = objs(props.steps)
    .slice(0, CYCLE_MAX)
    .map((s) => ({ label: str(s.label), text: str(s.text), icon: typeof s.icon === 'string' && s.icon ? s.icon : '' }))
  const N = steps.length
  if (N < 1) return emptyState(ctx, 'No steps')

  const c = chartColors(ctx)
  const sgn = enumOf(props.direction, ['clockwise', 'counter'] as const, 'clockwise') === 'counter' ? -1 : 1
  const card = enumOf(props.nodeStyle, ['circle', 'card'] as const, 'circle') === 'card'
  const arrows = enumOf(props.arrowStyle, ['arc', 'none'] as const, 'arc') === 'arc'
  const showText = isShown(props, 'showText')
  const centerText = isShown(props, 'showCenter') ? str(props.center) : ''
  const labelS = style(ctx, 'caption', c.text)
  const textS = mutedStyle(ctx, 'footnote')
  const cx = W / 2
  const cy = H / 2
  const tOf = (i: number) => -Math.PI / 2 + (sgn * i * 2 * Math.PI) / N
  const nodes: LayoutNode[] = []
  const boxes: NodeBox[] = []
  let rx = 0
  let ry = 0

  if (!card) {
    const D = clamp(Math.min(W, H) * 0.14, 28, 64)
    const wV = clamp(W * 0.3, 90, 300)
    const labelH = (s: { label: string; text: string }, w: number, textLines: number) =>
      linesHeight(ctx, s.label, labelS, w, 2) + (showText && s.text ? 2 + linesHeight(ctx, s.text, textS, w, textLines) : 0)
    const reserve = Math.max(...steps.map((s) => labelH(s, wV, 2))) + 8
    const R = Math.max(8, Math.min((H - D) / 2 - reserve, (W - D) / 2 - 120))
    rx = R
    ry = R
    steps.forEach((s, i) => {
      const t = tOf(i)
      const nx = cx + R * Math.cos(t)
      const ny = cy + R * Math.sin(t)
      boxes.push({ cx: nx, cy: ny, w: D, h: D, round: true })
      const fill = rampColor(ctx, 'gradient', i, N)
      const ink = onColor(ctx, fill)
      nodes.push({ k: 'rect', part: `node[${i}]`, box: { x: nx - D / 2, y: ny - D / 2, width: D, height: D }, fill: { type: 'solid', color: fill }, radius: D / 2 })
      if (s.icon) nodes.push(iconLeaf(s.icon, { x: nx - D * 0.3, y: ny - D * 0.3, width: D * 0.6, height: D * 0.6 }, ink, `icon[${i}]`))
      else nodes.push(...placeLines(ctx, String(i + 1), { ...labelS, color: ink }, { x: nx - D / 2, y: ny - lineH(labelS) / 2, width: D }, 'center', 1, `num[${i}]`).nodes)

      // Label + note, away from the centre.
      const cs = Math.cos(t)
      const sn = Math.sin(t)
      const place = (x: number, y: number, w: number, align: 'start' | 'center' | 'end', anchor: 'top' | 'bottom' | 'mid') => {
        const lh = linesHeight(ctx, s.label, labelS, w, 2)
        const th = showText && s.text ? linesHeight(ctx, s.text, textS, w, 3) : 0
        const total = lh + (th ? 2 + th : 0)
        const y0 = anchor === 'top' ? y : anchor === 'bottom' ? y - total : y - total / 2
        nodes.push(...placeLines(ctx, s.label, labelS, { x, y: y0, width: w }, align, 2, `label[${i}]`).nodes)
        if (th) nodes.push(...placeLines(ctx, s.text, textS, { x, y: y0 + lh + 2, width: w }, align, 3, `text[${i}]`).nodes)
      }
      if (Math.abs(cs) < 0.25) {
        const x = clamp(nx - wV / 2, 0, Math.max(0, W - wV))
        if (sn < 0) place(x, ny - D / 2 - 6, wV, 'center', 'bottom')
        else place(x, ny + D / 2 + 6, wV, 'center', 'top')
      } else if (cs > 0) {
        const x = nx + D / 2 + 10
        place(x, ny, Math.max(20, Math.min(260, W - x)), 'start', 'mid')
      } else {
        const w = Math.max(20, Math.min(260, nx - D / 2 - 10))
        place(nx - D / 2 - 10 - w, ny, w, 'end', 'mid')
      }
    })
  } else {
    const CW = clamp(W * 0.24, 130, 240)
    const CHmax = Math.max(40, H / 3)
    const pad = 12
    const iw = CW - 2 * pad
    const parts = steps.map((s) => {
      const iconW = s.icon ? 28 : 0
      const lw = iw - iconW
      const lh = linesHeight(ctx, s.label, labelS, lw, 2)
      const room = CHmax - 2 * pad - lh - 4
      const tl = showText && s.text ? Math.max(0, Math.floor(room / lineH(textS))) : 0
      const th = tl > 0 ? linesHeight(ctx, s.text, textS, iw, tl) : 0
      return { iconW, lw, lh, tl, th }
    })
    const CH = Math.min(CHmax, Math.max(56, Math.max(...parts.map((p) => 2 * pad + Math.max(p.lh, p.iconW ? 24 : 0) + (p.th ? 4 + p.th : 0)))))
    rx = Math.max(4, (W - CW) / 2)
    ry = Math.max(4, (H - CH) / 2)
    steps.forEach((s, i) => {
      const t = tOf(i)
      const nx = cx + rx * Math.cos(t)
      const ny = cy + ry * Math.sin(t)
      boxes.push({ cx: nx, cy: ny, w: CW, h: CH, round: false })
      const fill = tintOf(c.surface, rampColor(ctx, 'gradient', i, N), 0.16)
      const edge = rampColor(ctx, 'gradient', i, N)
      const p = parts[i]
      nodes.push({ k: 'rect', part: `node[${i}]`, box: { x: nx - CW / 2, y: ny - CH / 2, width: CW, height: CH }, fill: { type: 'solid', color: fill }, stroke: { color: edge, width: 2 }, radius: 14 })
      const top = ny - CH / 2 + pad
      const left = nx - CW / 2 + pad
      if (s.icon) nodes.push(iconLeaf(s.icon, { x: left, y: top, width: 24, height: 24 }, edge, `icon[${i}]`))
      nodes.push(...placeLines(ctx, s.label, labelS, { x: left + p.iconW, y: top, width: p.lw }, 'start', 2, `label[${i}]`).nodes)
      if (p.tl > 0) nodes.push(...placeLines(ctx, s.text, textS, { x: left, y: top + Math.max(p.lh, p.iconW ? 24 : 0) + 4, width: iw }, 'start', p.tl, `text[${i}]`).nodes)
    })
  }

  // Arrows along the ellipse.
  if (arrows && rx >= 4 && ry >= 4) {
    const f = (v: number) => String(Math.round(v * 100) / 100)
    const P = (t: number) => ({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) })
    const stepT = (2 * Math.PI) / N / 360
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N
      let ta = tOf(i)
      for (let k = 0; k < 360; k++) {
        ta += sgn * stepT
        const p = P(ta)
        if (!inside(boxes[i], p.x, p.y, PAD)) break
      }
      let tb = tOf(i) + sgn * (2 * Math.PI) / N
      for (let k = 0; k < 360; k++) {
        tb -= sgn * stepT
        const p = P(tb)
        if (!inside(boxes[j], p.x, p.y, PAD + 2)) break
      }
      if (sgn * (tb - ta) < HEAD / Math.max(rx, ry) * 2) continue
      const tip = P(tb)
      let te = tb
      for (let k = 0; k < 360; k++) {
        te -= sgn * stepT
        const p = P(te)
        if (Math.hypot(p.x - tip.x, p.y - tip.y) >= HEAD) break
      }
      if (sgn * (te - ta) <= 0) continue
      const a = P(ta)
      const b = P(te)
      nodes.push(strokePath(ctx, `M${f(a.x)} ${f(a.y)}A${f(rx)} ${f(ry)} 0 0 ${sgn > 0 ? 1 : 0} ${f(b.x)} ${f(b.y)}`, `arrow[${i}]`, c.muted, ARROW_W))
      const ux = tip.x - b.x
      const uy = tip.y - b.y
      const len = Math.hypot(ux, uy) || 1
      nodes.push(arrowHead(ctx, tip, ux / len, uy / len, HEAD, c.muted, `arrow[${i}].head`))
    }
  }

  // Centre text.
  if (centerText) {
    const cs = style(ctx, 'body', c.accent)
    // Circle nodes: the text box must fit the circle inside the ring (corner distance <= r).
    const lines = card ? 3 : 2
    const r = Math.min(rx, ry) - clamp(Math.min(W, H) * 0.14, 28, 64) / 2 - 8
    const w = card ? Math.max(40, Math.min(280, W - 2 * clamp(W * 0.24, 130, 240) - 24)) : Math.max(30, Math.min(300, 2 * Math.sqrt(Math.max(0, r * r - (lines * lineH(cs)) ** 2 / 4))))
    const h = linesHeight(ctx, centerText, cs, w, lines)
    nodes.push(...placeLines(ctx, centerText, cs, { x: cx - w / 2, y: cy - h / 2, width: w }, 'center', lines, 'center').nodes)
  }
  return root(ctx, nodes)
}

export function capacity(props: CycleProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ steps: { max: CYCLE_MAX, used: asArr(props.steps).length } }, true, [
    { kind: 'reflow', to: 'tls.g.chevrons' },
    { kind: 'truncate', slot: 'steps' },
  ])
}
