/**
 * Pure layout for tls.g.flow — a flowchart on the P0.8 layered DAG.
 *
 * Node boxes come from `layeredDag` (longest-path layers, barycentre ordering, no overlaps). The
 * node size is solved from the box: a first pass finds the layer count and widest layer, then the
 * size and the gap between layers are chosen so edge labels fit in the gap. Decisions are diamonds,
 * start/end are pills, steps are rounded boxes. Forward edges are elbows (or straight lines) from
 * the source side facing the target; an edge that runs backwards (a cycle) is a curve below (LR)
 * or beside (TB) the nodes. Edges that name an unknown node id are skipped (`lint` reports them).
 * Known limit (from the DAG helper): an edge that skips layers can pass behind a node of an
 * intermediate layer.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { Box, CapacityReport, LayoutContext, LayoutNode, LintFinding, Pt, Size } from '../../../types'
import { connectorRoute, layeredDag } from '../../../layout/diagram'
import { slot } from '../_motion'
import type { DagResult } from '../../../layout/diagram'
import type { FlowProps } from './schema'
import { FLOW_MAX_EDGES, FLOW_MAX_NODES } from './schema'
import { readGraph, type Graph } from './graph'
import {
  TEXT_SLACK, arrowHead, capacityOf, chartColors, clamp, emptyState, enumOf, linesHeight, lineH, mutedStyle, onColor, pathNode, placeLines, polyline, root, strokePath, style, tintOf,
} from '../_kit'

const HEAD = 12
const EDGE_W = 2.5
const CURVE = 36
const MAX_LABEL_W = 110

interface Solved {
  graph: Graph
  dag: DagResult
  dir: 'LR' | 'TB'
  nodeSize: Size
  backReserve: number
}

function solve(props: FlowProps, ctx: LayoutContext, W: number, H: number): Solved {
  const graph = readGraph(props)
  const dir = enumOf(props.direction, ['LR', 'TB'] as const, 'LR')
  const ids = graph.nodes.map((n) => ({ id: n.id }))
  const noteS = mutedStyle(ctx, 'footnote')
  const prov = layeredDag(ids, graph.edges, dir, { x: 0, y: 0, width: W, height: H }, { nodeSize: { width: 100, height: 50 } })
  const layerCount = ids.length ? Math.max(...Object.values(prov.layers)) + 1 : 1
  const perLayer = new Map<number, number>()
  for (const l of Object.values(prov.layers)) perLayer.set(l, (perLayer.get(l) ?? 0) + 1)
  const widest = Math.max(1, ...perLayer.values())
  const hasBack = graph.edges.some((e) => prov.layers[e.from] > prov.layers[e.to])
  const labelled = graph.edges.filter((e) => e.label)
  const lblW = Math.min(MAX_LABEL_W, Math.max(0, ...labelled.map((e) => ctx.measureText(e.label, noteS).width * TEXT_SLACK)))
  const backLabel = graph.edges.some((e) => e.label && prov.layers[e.from] > prov.layers[e.to])
  const backReserve = hasBack ? (dir === 'LR' ? CURVE + 26 + lineH(noteS) : CURVE + 14 + (backLabel ? lblW : 0)) : 0
  const box: Box = { x: 0, y: 0, width: Math.max(1, W - (dir === 'TB' ? backReserve : 0)), height: Math.max(1, H - (dir === 'LR' ? backReserve : 0)) }
  const gap = dir === 'LR' ? Math.max(56, labelled.length ? 2 * (lblW + HEAD + 10) : 0) : Math.max(56, labelled.length ? lineH(noteS) + HEAD + 24 : 0)
  const hasDecision = graph.nodes.some((n) => n.kind === 'decision')
  let nodeSize: Size
  if (dir === 'LR') {
    nodeSize = {
      width: clamp((box.width - (layerCount - 1) * gap) / layerCount, 90, 200),
      height: clamp(box.height / widest - 24, hasDecision ? 60 : 40, 96),
    }
  } else {
    nodeSize = {
      width: clamp(box.width / widest - 24, 80, 240),
      height: clamp((box.height - (layerCount - 1) * gap) / layerCount, hasDecision ? 56 : 36, 84),
    }
  }
  const dag = layeredDag(ids, graph.edges, dir, box, { nodeSize, minGap: Math.min(gap, 40) * 0.8 })
  return { graph, dag, dir, nodeSize, backReserve }
}

export function layout(props: FlowProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const g0 = readGraph(props)
  if (g0.nodes.length < 1) return emptyState(ctx, 'No nodes')
  const { graph, dag, dir } = solve(props, ctx, W, H)
  const c = chartColors(ctx)
  const labelS = style(ctx, 'caption', c.text)
  const noteS = style(ctx, 'footnote', c.text)
  const edgeColor = c.muted
  const nodes: LayoutNode[] = []
  const f = (v: number) => String(Math.round(v * 100) / 100)

  // RVM4: motion slots. Every node sits in the slot of its layer (`layer[k]`), and every edge's
  // stem / head / label in the slots of its *source* layer (`out[k]`, `tip[k]`, `tag[k]`), one of
  // each per layer even when empty, so slot k is layer k for the stagger: a layer fades in, then
  // the edges leaving it draw on towards the next layer as it arrives (a back edge draws once its
  // source is there; an edge that skips layers before its target appears).
  const L = Math.max(1, ...Object.values(dag.layers).map((l) => l + 1))
  const slots = (): LayoutNode[][] => Array.from({ length: L }, () => [])
  const layerKids = slots()
  const outKids = slots()
  const tipKids = slots()
  const tagKids = slots()
  const layerOf = (id: string) => Math.min(L - 1, Math.max(0, dag.layers[id] ?? 0))

  // Nodes in layer order (so a staggered reveal follows the flow).
  const order = [...graph.nodes].sort((a, b) => (dag.layers[a.id] ?? 0) - (dag.layers[b.id] ?? 0))
  for (const n of order) {
    const kids = layerKids[layerOf(n.id)]
    const b = dag.boxes[n.id]
    if (!b) continue
    const part = `node[${graph.nodes.indexOf(n)}]` // numeric: the motion recipe addresses node[*]
    let fill: string
    let stroke: string | undefined
    let ink = c.text
    if (n.kind === 'start') {
      fill = c.accent
      ink = onColor(ctx, fill)
    } else if (n.kind === 'end') {
      fill = ctx.resolveColor('accent2').color
      ink = onColor(ctx, fill)
    } else if (n.kind === 'decision') {
      fill = tintOf(c.surface, ctx.resolveColor('accent2').color, 0.16)
      stroke = ctx.resolveColor('accent2').color
    } else {
      fill = tintOf(c.surface, c.accent, 0.14)
      stroke = c.accent
    }
    if (n.kind === 'decision') {
      const d = `M${f(b.x + b.width / 2)} ${f(b.y)}L${f(b.x + b.width)} ${f(b.y + b.height / 2)}L${f(b.x + b.width / 2)} ${f(b.y + b.height)}L${f(b.x)} ${f(b.y + b.height / 2)}Z`
      kids.push(pathNode(ctx, d, part, { fill, stroke, strokeWidth: 2 }))
    } else {
      kids.push({
        k: 'rect',
        part,
        box: { ...b },
        fill: { type: 'solid', color: fill },
        ...(stroke ? { stroke: { color: stroke, width: 2 } } : {}),
        radius: n.kind === 'step' ? 10 : b.height / 2,
      })
    }
    const tw = Math.max(8, n.kind === 'decision' ? b.width * 0.58 : b.width - 20 - (n.kind === 'step' ? 0 : b.height * 0.3))
    const maxLines = Math.max(1, Math.min(3, Math.floor((n.kind === 'decision' ? b.height * 0.56 : b.height - 8) / lineH(labelS))))
    const th = linesHeight(ctx, n.label, labelS, tw, maxLines)
    kids.push(...placeLines(ctx, n.label, { ...labelS, color: ink }, { x: b.x + (b.width - tw) / 2, y: b.y + Math.max(0, (b.height - th) / 2), width: tw }, 'center', maxLines, `${part}.label`).nodes)
  }

  // Edges.
  const route = new Map(dag.edges.map((e) => [`${e.from}\u0000${e.to}`, e.points]))
  const routing = enumOf(props.routing, ['elbow', 'straight'] as const, 'elbow')
  for (const e of graph.edges) {
    const a = dag.boxes[e.from]
    const b = dag.boxes[e.to]
    if (!a || !b) continue
    const back = (dag.layers[e.from] ?? 0) > (dag.layers[e.to] ?? 0)
    const part = `edge[${e.index}]`
    const k = layerOf(e.from)
    const stems = outKids[k]
    const heads = tipKids[k]
    let labelAt: { x: number; y: number; align: 'start' | 'center' | 'end'; w: number } | null = null
    const lines = dir === 'LR' ? 2 : 1
    const lw = Math.min(MAX_LABEL_W, Math.ceil(ctx.measureText(e.label, noteS).width * TEXT_SLACK) + 2)
    const lh = e.label ? linesHeight(ctx, e.label, noteS, lw, lines) : 0
    if (back) {
      if (dir === 'LR') {
        const ax = a.x + a.width / 2
        const bx = b.x + b.width / 2
        const bottom = Math.max(a.y + a.height, b.y + b.height)
        const y0 = a.y + a.height
        const y1 = b.y + b.height
        const stemEnd = y1 + HEAD
        stems.push(strokePath(ctx, `M${f(ax)} ${f(y0)}C${f(ax)} ${f(bottom + CURVE)} ${f(bx)} ${f(bottom + CURVE)} ${f(bx)} ${f(stemEnd)}`, part, edgeColor, EDGE_W))
        heads.push(arrowHead(ctx, { x: bx, y: y1 }, 0, -1, HEAD, edgeColor, `${part}.head`))
        labelAt = { x: (ax + bx) / 2 - lw / 2, y: bottom + CURVE * 0.75 + 3, align: 'center', w: lw }
      } else {
        const ay = a.y + a.height / 2
        const by = b.y + b.height / 2
        const right = Math.max(a.x + a.width, b.x + b.width)
        const x0 = a.x + a.width
        const x1 = b.x + b.width
        const stemEnd = x1 + HEAD
        stems.push(strokePath(ctx, `M${f(x0)} ${f(ay)}C${f(right + CURVE)} ${f(ay)} ${f(right + CURVE)} ${f(by)} ${f(stemEnd)} ${f(by)}`, part, edgeColor, EDGE_W))
        heads.push(arrowHead(ctx, { x: x1, y: by }, -1, 0, HEAD, edgeColor, `${part}.head`))
        labelAt = { x: right + CURVE * 0.75 + 6, y: (ay + by) / 2 - lh / 2, align: 'start', w: Math.min(lw, Math.max(8, W - (right + CURVE * 0.75 + 6))) }
      }
    } else {
      let pts: Pt[] | undefined
      if (routing === 'elbow') pts = route.get(`${e.from}\u0000${e.to}`)
      if (!pts || pts.length < 2) {
        pts = connectorRoute(a, b, { kind: 'straight', sides: dir === 'LR' ? { from: 'right', to: 'left' } : { from: 'bottom', to: 'top' } }).points
      }
      const tip = pts[pts.length - 1]
      const prev = pts[pts.length - 2]
      const len = Math.hypot(tip.x - prev.x, tip.y - prev.y) || 1
      const ux = (tip.x - prev.x) / len
      const uy = (tip.y - prev.y) / len
      const cut = Math.min(HEAD, len)
      const stem = [...pts.slice(0, -1), { x: tip.x - ux * cut, y: tip.y - uy * cut }]
      stems.push(strokePath(ctx, polyline(stem), part, edgeColor, EDGE_W))
      heads.push(arrowHead(ctx, tip, ux, uy, HEAD, edgeColor, `${part}.head`))
      if (dir === 'LR') labelAt = { x: tip.x - HEAD - 4 - lw, y: tip.y - 3 - lh, align: 'end', w: lw }
      else labelAt = { x: tip.x + 8, y: tip.y - HEAD - 4 - lh, align: 'start', w: lw }
    }
    if (e.label && labelAt) {
      tagKids[k].push(...placeLines(ctx, e.label, { ...noteS, color: c.text }, { x: clamp(labelAt.x, 0, Math.max(0, W - labelAt.w)), y: Math.max(0, labelAt.y), width: labelAt.w }, labelAt.align, lines, `${part}.label`).nodes)
    }
  }
  const box = { width: W, height: H }
  nodes.push(
    ...layerKids.map((kids, l) => slot(`layer[${l}]`, box, kids)),
    ...outKids.map((kids, l) => slot(`out[${l}]`, box, kids)),
    ...tipKids.map((kids, l) => slot(`tip[${l}]`, box, kids)),
    ...tagKids.map((kids, l) => slot(`tag[${l}]`, box, kids))
  )
  return root(ctx, nodes)
}

export function lint(props: FlowProps): LintFinding[] {
  const g = readGraph(props)
  const out: LintFinding[] = []
  for (const u of g.unknown) {
    out.push({ level: 'error', rule: 'flow/unknown-node', part: `edge[${u.index}]`, message: `Edge ${u.index + 1} refers to node id "${u.id}", which is not in nodes; the edge is not drawn.` })
  }
  for (const id of g.duplicates) out.push({ level: 'warning', rule: 'flow/duplicate-id', message: `Node id "${id}" is used twice; only the first is drawn.` })
  for (const i of g.selfLoops) out.push({ level: 'warning', rule: 'flow/self-loop', part: `edge[${i}]`, message: `Edge ${i + 1} points from a node to itself and is not drawn.` })
  if (g.hasCycle) out.push({ level: 'warning', rule: 'flow/cycle', message: 'The edges form a cycle; the returning edge is drawn as a curve. Use tls.g.cycle for a plain loop.' })
  return out
}

export function capacity(props: FlowProps, box: Size, ctx: LayoutContext): CapacityReport {
  const nodesUsed = Array.isArray(props.nodes) ? props.nodes.length : 0
  const edgesUsed = Array.isArray(props.edges) ? props.edges.length : 0
  let fits = true
  try {
    fits = solve(props, ctx, Math.max(1, box.width), Math.max(1, box.height)).dag.fits
  } catch {
    fits = false
  }
  return capacityOf(
    { nodes: { max: FLOW_MAX_NODES, used: nodesUsed }, edges: { max: FLOW_MAX_EDGES, used: edgesUsed } },
    fits,
    [
      { kind: 'reflow', to: props.direction === 'TB' ? 'direction: LR' : 'direction: TB' },
      { kind: 'truncate', slot: 'nodes' },
    ]
  )
}
