/**
 * Pure layout for tls.g.orbit — the centre concept on a disc, 3-8 satellites (icon discs) evenly
 * on an orbit around it, clockwise from 12 o'clock, each with its label and note beside it on the
 * outer side (right half to the right, left half to the left), spokes from the centre, and small
 * sparks on the orbit between the satellites (they twinkle in the viewer).
 *
 * The orbit is an ellipse a little wider than tall, as wide as the label columns allow; the
 * satellite discs and the centre scale with it.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { OrbitProps } from './schema'
import { ORBIT_MAX } from './schema'
import { asArr, capacityOf, chartColors, dot, emptyState, lineH, linesHeight, mutedStyle, objs, onColor, placeLines, root, str, strokePath, style, tintOf } from '../_kit'
import { iconLeaf } from '../../text/_engine/icon'
import { around, slotsByIndex } from '../_motion'

const f = (v: number) => Math.round(v * 100) / 100

/** An ellipse as four cubic segments (no arcs). */
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  const kx = 0.5523 * rx
  const ky = 0.5523 * ry
  return (
    `M${f(cx)} ${f(cy - ry)}` +
    `C${f(cx + kx)} ${f(cy - ry)} ${f(cx + rx)} ${f(cy - ky)} ${f(cx + rx)} ${f(cy)}` +
    `C${f(cx + rx)} ${f(cy + ky)} ${f(cx + kx)} ${f(cy + ry)} ${f(cx)} ${f(cy + ry)}` +
    `C${f(cx - kx)} ${f(cy + ry)} ${f(cx - rx)} ${f(cy + ky)} ${f(cx - rx)} ${f(cy)}` +
    `C${f(cx - rx)} ${f(cy - ky)} ${f(cx - kx)} ${f(cy - ry)} ${f(cx)} ${f(cy - ry)}Z`
  )
}

export function layout(props: OrbitProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const items = objs(props.items)
    .slice(0, ORBIT_MAX)
    .map((s) => ({ label: str(s.label), text: str(s.text), icon: str(s.icon) }))
  const N = items.length
  if (N < 1) return emptyState(ctx, 'No satellites')
  const c = chartColors(ctx)
  const accent = ctx.resolveColor('accent').color
  const accent2 = ctx.resolveColor('accent2').color
  const sp = ctx.tokens.space
  const labelS = style(ctx, 'subheading', c.text)
  const noteS = mutedStyle(ctx, 'caption')

  // label columns on both sides take about 28 % of the width each; the orbit gets the middle
  const colW = Math.max(160, W * 0.28)
  const r = Math.max(10, Math.min(48, H * 0.1, W * 0.045))
  const ry = Math.max(r, H / 2 - r - 4)
  const rx = Math.max(r, Math.min(W / 2 - colW + r * 0.5, ry * 1.35))
  const cx = W / 2
  const cy = H / 2
  const cR = Math.max(r * 1.3, Math.min(rx, ry) * 0.36)

  const nodes: LayoutNode[] = []
  nodes.push(strokePath(ctx, ellipsePath(cx, cy, rx, ry), 'orbit', tintOf(c.surface, accent, 0.35), 2))

  const pos = items.map((_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / N
    return { a, x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }
  })
  // sparks halfway between neighbours on the orbit
  pos.forEach((p, i) => {
    const a = p.a + Math.PI / N
    nodes.push(dot(cx + rx * Math.cos(a), cy + ry * Math.sin(a), Math.max(2, r * 0.1), accent2, `spark[${i}]`))
  })
  if (props.spokes !== 'none') pos.forEach((p, i) => nodes.push(strokePath(ctx, `M${f(cx)} ${f(cy)}L${f(p.x)} ${f(p.y)}`, `spoke[${i}]`, tintOf(c.surface, accent, 0.3), 1.5)))

  // the centre disc over the spokes
  nodes.push({ k: 'rect', part: 'hub', box: { x: cx - cR, y: cy - cR, width: 2 * cR, height: 2 * cR }, radius: cR, fill: { type: 'solid', color: accent } })
  const hubInk = onColor(ctx, accent)
  const ci = str(props.centerIcon)
  let hs = { ...style(ctx, 'subheading', hubInk) }
  const hw = cR * 1.5
  if (lineH(hs) * 2 > cR * 1.1) hs = { ...hs, size: Math.max(1, (cR * 0.55) / hs.lineHeight) }
  const iconS = ci ? Math.min(cR * 0.55, 64) : 0
  const hl = linesHeight(ctx, str(props.center), hs, hw, 2)
  const hTop = cy - (iconS + (iconS ? 4 : 0) + hl) / 2
  const hubText: LayoutNode[] = []
  if (ci) hubText.push(iconLeaf(ci, { x: cx - iconS / 2, y: hTop, width: iconS, height: iconS }, hubInk, 'hub.icon'))
  hubText.push(...placeLines(ctx, str(props.center), hs, { x: cx - hw / 2, y: hTop + iconS + (iconS ? 4 : 0), width: hw }, 'center', 2, 'hub.label').nodes)
  if (hubText.length) nodes.push(around('core', hubText))

  items.forEach((it, i) => {
    const p = pos[i]
    const fill = tintOf(c.surface, i % 2 === 0 ? accent : accent2, 0.22)
    nodes.push({ k: 'rect', part: `sat[${i}]`, box: { x: p.x - r, y: p.y - r, width: 2 * r, height: 2 * r }, radius: r, fill: { type: 'solid', color: fill }, stroke: { color: i % 2 === 0 ? accent : accent2, width: 2 } })
    if (it.icon) nodes.push(iconLeaf(it.icon, { x: p.x - r * 0.55, y: p.y - r * 0.55, width: r * 1.1, height: r * 1.1 }, i % 2 === 0 ? accent : accent2, `glyph[${i}]`))
  })

  // the texts in two columns outside the orbit, each at its satellite's height, pushed apart
  // where they would touch (fewer note lines first), with a leader from its disc
  const gapX = sp['2xs']
  const rightX = cx + rx + r + gapX
  const leftEnd = cx - rx - r - gapX
  const sideOf = (i: number) => Math.cos(pos[i].a) > 0.01 || (Math.abs(Math.cos(pos[i].a)) <= 0.01 && Math.sin(pos[i].a) < 0)
  for (const right of [true, false]) {
    const idx = items.map((_, i) => i).filter((i) => sideOf(i) === right).sort((a, b) => pos[a].y - pos[b].y)
    if (!idx.length) continue
    const tw = Math.max(20, right ? W - rightX : leftEnd)
    const tx = right ? rightX : 0
    const measure = (noteLines: number, labelLines = 2) =>
      idx.map((i) => {
        const it = items[i]
        const ll = linesHeight(ctx, it.label, labelS, tw, labelLines)
        const nh = it.text && noteLines > 0 ? linesHeight(ctx, it.text, noteS, tw, noteLines) : 0
        return { i, ll, lines: labelLines, nl: nh ? noteLines : 0, h: ll + (nh ? sp['3xs'] + nh : 0) }
      })
    const place = (blocks: ReturnType<typeof measure>) => {
      const tops = blocks.map((b) => pos[b.i].y - b.h / 2)
      for (let k = 0; k < blocks.length; k++) {
        tops[k] = Math.max(tops[k], k ? tops[k - 1] + blocks[k - 1].h + sp['2xs'] : 0)
      }
      const over = tops[blocks.length - 1] + blocks[blocks.length - 1].h - H
      if (over > 0) {
        tops[blocks.length - 1] -= over
        for (let k = blocks.length - 2; k >= 0; k--) tops[k] = Math.min(tops[k], tops[k + 1] - blocks[k].h - sp['2xs'])
      }
      return { tops, ok: tops[0] >= -0.5 }
    }
    let blocks = measure(2)
    let placed = place(blocks)
    for (const [n, l] of [[1, 2], [0, 2], [0, 1]]) {
      if (placed.ok) break
      blocks = measure(n, l)
      placed = place(blocks)
    }
    blocks.forEach((b, k) => {
      const it = items[b.i]
      const ty = Math.max(0, placed.tops[k])
      nodes.push(...placeLines(ctx, it.label, labelS, { x: tx, y: ty, width: tw }, right ? 'start' : 'end', b.lines, `label[${b.i}]`).nodes)
      if (b.nl) nodes.push(...placeLines(ctx, it.text, noteS, { x: tx, y: ty + b.ll + sp['3xs'], width: tw }, right ? 'start' : 'end', b.nl, `note[${b.i}]`).nodes)
      const p = pos[b.i]
      const ly = ty + Math.min(b.ll, lineH(labelS)) / 2
      const from = right ? p.x + r : p.x - r
      const to = right ? rightX - 4 : leftEnd + 4
      if (Math.abs(to - from) > 6) nodes.push(strokePath(ctx, `M${f(from)} ${f(p.y)}L${f(to)} ${f(ly)}`, `lead[${b.i}]`, tintOf(c.surface, c.text, 0.4), 1.25))
    })
  }

  return root(
    ctx,
    slotsByIndex(nodes, N, { width: W, height: H }, [
      { name: 'moon', match: /^(?:sat|glyph)\[(\d+)\]$/ },
      { name: 'cap', match: /^(?:label|note|lead)\[(\d+)\](?:\.\d+)?$/ },
      { name: 'ray', match: /^spoke\[(\d+)\]$/ },
      { name: 'star', match: /^spark\[(\d+)\]$/, tight: true },
    ])
  )
}

export function capacity(props: OrbitProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ items: { max: ORBIT_MAX, used: asArr(props.items).length } }, true, [
    { kind: 'truncate', slot: 'items' },
    { kind: 'paginate' },
  ])
}
