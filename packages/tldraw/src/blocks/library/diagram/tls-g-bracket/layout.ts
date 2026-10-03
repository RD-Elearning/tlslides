/**
 * Pure layout for tls.g.bracket — 2 to 6 item pills, a brace (or square bracket) and one label.
 *
 * `right`: items on the left, the brace on their right edge pointing out to the label. `left` is the
 * mirror. `top`: items in a row at the bottom, the brace above them, the label above the brace.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { BracketProps } from './schema'
import { BRACKET_MAX } from './schema'
import { bracePath } from '../tls-g-breakdown/layout'
import { asArr, capacityOf, chartColors, clamp, emptyState, enumOf, linesHeight, lineH, pathNode, placeLines, rampColor, root, str, style, tintOf } from '../_kit'

const GAP = 12

/** Square bracket with a stem at its middle, same coordinate system as `bracePath`. */
function squarePath(length: number, depth: number, map: (u: number, v: number) => { x: number; y: number }): string {
  const f = (v: number) => String(Math.round(v * 100) / 100)
  const P = (u: number, v: number) => {
    const p = map(u, v)
    return `${f(p.x)} ${f(p.y)}`
  }
  return `M${P(0, 0)}L${P(0, -depth / 2)}L${P(length, -depth / 2)}L${P(length, 0)}M${P(length / 2, -depth / 2)}L${P(length / 2, -depth)}`
}

export function layout(props: BracketProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const items = asArr(props.items).map(str).filter((s) => s.trim() !== '').slice(0, BRACKET_MAX)
  const label = str(props.label).trim()
  const N = items.length
  if (N < 1 || !label) return emptyState(ctx, 'Add a label and items')
  const c = chartColors(ctx)
  const side = enumOf(props.side, ['right', 'left', 'top'] as const, 'right')
  const square = enumOf(props.style, ['brace', 'bracket'] as const, 'brace') === 'bracket'
  const labelS = style(ctx, 'subheading', c.text)
  const itemS = style(ctx, 'caption', c.text)
  const nodes: LayoutNode[] = []
  const group = (part: string, children: LayoutNode[]): LayoutNode => ({ k: 'group', part, box: { x: 0, y: 0, width: W, height: H }, children })
  const shape = (len: number, depth: number, map: (u: number, v: number) => { x: number; y: number }) => (square ? squarePath(len, depth, map) : bracePath(len, depth, map))

  const itemNodes: LayoutNode[] = []
  const drawItem = (i: number, box: { x: number; y: number; width: number; height: number }) => {
    const color = rampColor(ctx, 'gradient', i, N)
    itemNodes.push({ k: 'rect', part: `item[${i}]`, box, fill: { type: 'solid', color: tintOf(c.surface, color, 0.16) }, stroke: { color, width: 2 }, radius: Math.min(14, box.height / 3) })
    const pad = box.height < 48 ? 6 : 12
    const w = Math.max(10, box.width - 2 * pad)
    const lines = clamp(Math.floor((box.height - 2 * Math.min(pad, 6)) / lineH(itemS)), 1, 2)
    const h = linesHeight(ctx, items[i], itemS, w, lines)
    itemNodes.push(...placeLines(ctx, items[i], itemS, { x: box.x + pad, y: box.y + (box.height - h) / 2, width: w }, 'start', lines, `item[${i}].text`).nodes)
  }

  if (side === 'top') {
    const labelH = lineH(labelS) + 8
    const braceD = clamp(H * 0.14, 24, 48)
    const rowTop = labelH + braceD + 14
    const rowH = Math.max(30, Math.min(H - rowTop, 90))
    const cw = Math.max(20, (W - (N - 1) * GAP) / N)
    for (let i = 0; i < N; i++) drawItem(i, { x: i * (cw + GAP), y: rowTop, width: cw, height: rowH })
    const yRef = rowTop - 8
    nodes.push(group('items', itemNodes))
    nodes.push(group('brace', [pathNode(ctx, shape(W, braceD - 6, (u, v) => ({ x: u, y: yRef + v })), 'brace[path]', { stroke: c.muted, strokeWidth: 3 })]))
    nodes.push(group('label', placeLines(ctx, label, labelS, { x: 0, y: yRef - braceD - labelH + 6, width: W }, 'center', 1, 'label[text]').nodes))
    return root(ctx, nodes)
  }

  const braceW = clamp(W * 0.06, 28, 56)
  const labelW = clamp(W * 0.3, 120, 320)
  const itemsW = Math.max(40, W - braceW - labelW - 40)
  const rowH = Math.min(86, Math.max(26, (H - (N - 1) * GAP) / N))
  const total = N * rowH + (N - 1) * GAP
  const y0 = Math.max(0, (H - total) / 2)
  const right = side === 'right'
  const ix = right ? 0 : W - itemsW
  for (let i = 0; i < N; i++) drawItem(i, { x: ix, y: y0 + i * (rowH + GAP), width: itemsW, height: rowH })
  nodes.push(group('items', itemNodes))
  const xRef = right ? itemsW + 10 : W - itemsW - 10
  const depth = braceW - 8
  nodes.push(group('brace', [pathNode(ctx, shape(total, depth, (u, v) => ({ x: right ? xRef - v : xRef + v, y: y0 + u })), 'brace[path]', { stroke: c.muted, strokeWidth: 3 })]))
  const lw = Math.max(10, labelW)
  const lx = right ? xRef + depth + 14 : xRef - depth - 14 - lw
  const lines = clamp(Math.floor(total / lineH(labelS)), 1, 3)
  const lh = linesHeight(ctx, label, labelS, lw, lines)
  nodes.push(group('label', placeLines(ctx, label, labelS, { x: lx, y: y0 + (total - lh) / 2, width: lw }, right ? 'start' : 'end', lines, 'label[text]').nodes))
  return root(ctx, nodes)
}

export function capacity(props: BracketProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ items: { max: BRACKET_MAX, used: asArr(props.items).length } }, true, [
    { kind: 'truncate', slot: 'items' },
    { kind: 'paginate' },
  ])
}
