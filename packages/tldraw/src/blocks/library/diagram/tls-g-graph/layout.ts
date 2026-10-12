/**
 * Pure layout for tls.g.graph.
 *
 * binary-tree: a node's column is its in-order rank, so a left child always sits left of its
 * parent and a missing child leaves its gap; rows are depths (≤ 5). The node diameter is the
 * largest that keeps a gap between columns and between rows. Edges run centre to centre, cut at
 * the circles. list: boxes in a row joined by arrows, `head` over the first, NULL after the last.
 * The visit order (`order`) puts a small numbered badge on each node and writes the sequence
 * under the diagram ("In-order (LNR): 20 → 30 → 40 …").
 *
 * Hostile input (cycles, unknown parents, two left children) is dropped, never thrown: a node
 * whose parent is unknown or whose side is taken is left out. Pure and DOM-free.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle } from '../../../types'
import type { GraphNode, GraphProps } from './schema'
import { GRAPH_MAX_LEVELS, GRAPH_MAX_NODES } from './schema'
import { arrowHead, chartColors, clamp, emptyState, objs, onColor, placeLines, root, str, strokePath, style, tintOf } from '../_kit'

interface Placed {
  id: string
  label: string
  depth: number
  col: number
  parent?: string
}

/** The tree's nodes with depth and in-order column, or [] when there is no root. */
export function placeTree(nodes: GraphNode[]): Placed[] {
  const byId = new Map<string, GraphNode>()
  for (const n of nodes) if (n.id && !byId.has(n.id)) byId.set(n.id, n)
  const roots = [...byId.values()].filter((n) => !n.parent || !byId.has(n.parent))
  const rootNode = roots.find((n) => !n.parent) ?? roots[0]
  if (!rootNode) return []
  const kids = new Map<string, { left?: GraphNode; right?: GraphNode }>()
  for (const n of byId.values()) {
    if (n === rootNode || !n.parent || !byId.has(n.parent)) continue
    const k = kids.get(n.parent) ?? {}
    const side = n.side === 'right' ? 'right' : n.side === 'left' ? 'left' : !k.left ? 'left' : 'right'
    if (k[side]) continue // that side is taken
    k[side] = n
    kids.set(n.parent, k)
  }
  const out: Placed[] = []
  const seen = new Set<string>()
  let col = 0
  const walk = (n: GraphNode, depth: number, parent?: string) => {
    if (seen.has(n.id) || depth >= GRAPH_MAX_LEVELS || out.length >= GRAPH_MAX_NODES) return
    seen.add(n.id)
    const k = kids.get(n.id) ?? {}
    if (k.left) walk(k.left, depth + 1, n.id)
    out.push({ id: n.id, label: str(n.label), depth, col: col++, parent })
    if (k.right) walk(k.right, depth + 1, n.id)
  }
  walk(rootNode, 0)
  return out
}

/** Nodes; a node without `parent` takes it from `edges` (from → to, a parent's first edge is its
 *  left child) — the form models write for a tree when they think of it as a graph. */
function readNodes(raw: unknown, rawEdges?: unknown): GraphNode[] {
  const nodes = objs(raw)
    .slice(0, GRAPH_MAX_NODES)
    .map((o) => ({ id: str(o.id), label: str(o.label), parent: str(o.parent) || undefined, side: o.side === 'left' || o.side === 'right' ? (o.side as 'left' | 'right') : undefined }))
    .filter((n) => n.id)
  const kidsSeen = new Map<string, number>()
  for (const e of objs(rawEdges)) {
    const from = str(e.from)
    const to = str(e.to)
    const n = nodes.find((x) => x.id === to)
    if (!n || n.parent || !from || from === to) continue
    const k = kidsSeen.get(from) ?? 0
    kidsSeen.set(from, k + 1)
    n.parent = from
    n.side = n.side ?? (k === 0 ? 'left' : 'right')
  }
  return nodes
}

/** The largest type-scale size at most `px` (a token size: `type/too-many-sizes` counts sizes). */
function tokenAtMost(ctx: LayoutContext, px: number): ResolvedTextStyle {
  for (const t of ['heading', 'subheading', 'lead', 'body', 'caption', 'footnote'] as const) {
    const s = ctx.resolveText(t)
    if (s.size <= px) return s
  }
  return ctx.resolveText('footnote')
}

const ids = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])

export function layout(props: GraphProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const nodes = readNodes(props.nodes, (props as Record<string, unknown>).edges)
  if (!nodes.length) return emptyState(ctx, 'No nodes')
  const c = chartColors(ctx)
  const accent = ctx.resolveColor('accent').color
  const sp = ctx.tokens.space
  const list = props.kind === 'list'
  const order = ids(props.order)
  const hi = new Set(ids(props.highlight))
  const children: LayoutNode[] = []

  // the order sequence under the diagram
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const seq = order.filter((id) => byId.has(id)).map((id) => byId.get(id)!.label)
  const seqText = seq.length ? `${str(props.orderLabel) ? `${str(props.orderLabel)}: ` : ''}${seq.join(' → ')}` : ''
  const seqStyle = style(ctx, 'lead', c.text)
  const seqH = seqText ? Math.ceil(seqStyle.size * seqStyle.lineHeight) * 2 + sp.md : 0
  const areaH = Math.max(1, H - seqH)
  const rank = new Map(order.map((id, i) => [id, i + 1]))

  const drawNode = (id: string, label: string, cx: number, cy: number, d: number, i: number, rect = false) => {
    const fill = hi.has(id) ? accent : tintOf(c.surface, accent, 0.14)
    const ink = hi.has(id) ? onColor(ctx, accent) : c.text
    const w = rect ? d * 1.5 : d
    children.push({ k: 'rect', part: `node[${i}]`, box: { x: cx - w / 2, y: cy - d / 2, width: w, height: d }, fill: { type: 'solid', color: fill }, stroke: { color: accent, width: 2 }, radius: rect ? ctx.tokens.radius.sm : d / 2 })
    const ts: ResolvedTextStyle = { ...tokenAtMost(ctx, d * 0.4), color: ink, lineHeight: 1.15 }
    const t = placeLines(ctx, label, ts, { x: cx - w / 2 + 4, y: cy - (ts.size * ts.lineHeight) / 2, width: w - 8 }, 'center', 1, `label[${i}]`)
    children.push(...t.nodes)
    const r = rank.get(id)
    if (r) {
      const b = Math.max(22, Math.round(d * 0.42))
      const bx = cx + w / 2 - b * 0.35
      const by = cy - d / 2 - b * 0.55
      children.push({ k: 'rect', part: `order[${r - 1}]`, box: { x: bx - b / 2, y: by, width: b, height: b }, fill: { type: 'solid', color: accent }, radius: b / 2 })
      const bs: ResolvedTextStyle = { ...tokenAtMost(ctx, b * 0.6), color: onColor(ctx, accent), lineHeight: 1.1 }
      children.push(...placeLines(ctx, String(r), bs, { x: bx - b / 2, y: by + (b - bs.size * bs.lineHeight) / 2, width: b }, 'center', 1, `order[${r - 1}].n`).nodes)
    }
  }

  if (list) {
    const n = nodes.length
    const extra = props.showNull === false ? 0 : 1
    const slots = n + extra
    const gap = clamp(W / slots / 3, 24, 80)
    const d = clamp(Math.min((W - gap * (slots - 1)) / slots / 1.5, areaH * 0.45, 110), 36, 110)
    const w = d * 1.5
    const total = slots * w + (slots - 1) * gap
    let x = Math.max(0, (W - total) / 2) + w / 2
    const cy = areaH / 2 + d * 0.2
    const head = placeLines(ctx, 'head', style(ctx, 'caption', c.muted), { x: x - w / 2, y: cy - d / 2 - d * 0.9, width: w }, 'center', 1, 'head')
    children.push(...head.nodes)
    children.push(strokePath(ctx, `M${x} ${cy - d / 2 - d * 0.45}L${x} ${cy - d / 2 - 6}`, 'head.arrow', c.muted, 2))
    children.push(arrowHead(ctx, { x, y: cy - d / 2 - 2 }, 0, 1, 12, c.muted, 'head.tip'))
    nodes.forEach((node, i) => {
      drawNode(node.id, node.label, x, cy, d, i, true)
      const nextX = x + w + gap
      if (i < n - 1 || extra) {
        const x0 = x + w / 2 + 4
        const x1 = nextX - w / 2 - 4
        children.push(strokePath(ctx, `M${x0} ${cy}L${x1 - 10} ${cy}`, `edge[${i}]`, c.text, 3))
        children.push(arrowHead(ctx, { x: x1, y: cy }, 1, 0, 14, c.text, `edge[${i}].tip`))
      }
      x = nextX
    })
    if (extra) {
      children.push(...placeLines(ctx, 'NULL', style(ctx, 'body', c.muted), { x: x - w / 2, y: cy - 16, width: w }, 'center', 1, 'null').nodes)
    }
  } else {
    const placed = placeTree(nodes)
    if (!placed.length) return emptyState(ctx, 'No root')
    const cols = Math.max(1, placed.length)
    const levels = Math.max(1, ...placed.map((p) => p.depth + 1))
    const pitchX = W / cols
    const d = clamp(Math.min(pitchX * 0.78, (areaH / levels) * 0.62, 120), 30, 120)
    const pitchY = levels > 1 ? (areaH - d - d * 0.5) / (levels - 1) : 0
    const pos = new Map(placed.map((p) => [p.id, { x: pitchX * (p.col + 0.5), y: d * 0.5 + d * 0.5 + p.depth * pitchY }]))
    placed.forEach((p, i) => {
      if (!p.parent) return
      const a = pos.get(p.parent)!
      const b = pos.get(p.id)!
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const ux = (b.x - a.x) / len
      const uy = (b.y - a.y) / len
      const r = d / 2 + 2
      children.push(strokePath(ctx, `M${a.x + ux * r} ${a.y + uy * r}L${b.x - ux * r} ${b.y - uy * r}`, `edge[${i}]`, c.muted, 3))
    })
    placed.forEach((p, i) => drawNode(p.id, p.label, pos.get(p.id)!.x, pos.get(p.id)!.y, d, i))
  }

  if (seqText) {
    const t = placeLines(ctx, seqText, seqStyle, { x: 0, y: areaH + sp.md, width: W }, 'center', 2, 'sequence')
    children.push(...t.nodes)
  }
  return root(ctx, children)
}
