/**
 * Layered DAG layout for process flows and dependency diagrams. Pure function, no dependency.
 *
 * Steps: break cycles (DFS back edges are reversed for layering only), longest-path layering,
 * barycentre ordering in two sweeps (down then up), then even placement of layers along the main
 * axis and of the nodes of each layer along the cross axis. Edges are routed as elbows through
 * the gap that follows their source layer.
 *
 * Known limit: an edge that skips layers drops straight down its target column and can pass
 * behind a node of an intermediate layer standing in that column. Nodes never overlap.
 * Capped at 12 nodes and 16 edges; beyond that `fits` is false.
 */

import type { Box, Pt, Size } from '../../types'
import { connectorRoute } from './connector'

export const MAX_DAG_NODES = 12
export const MAX_DAG_EDGES = 16

export interface DagNode {
  id: string
}
export interface DagEdge {
  from: string
  to: string
}

export interface DagResult {
  fits: boolean
  boxes: Record<string, Box>
  /** Layer index per node id. */
  layers: Record<string, number>
  edges: Array<{ from: string; to: string; points: Pt[] }>
}

export function layeredDag(
  nodes: ReadonlyArray<DagNode>,
  edgesIn: ReadonlyArray<DagEdge>,
  direction: 'TB' | 'LR',
  box: Box,
  opts: { nodeSize: Size; minGap?: number }
): DagResult {
  const minGap = opts.minGap ?? 12
  const horizontal = direction === 'LR'
  const nodeMain = horizontal ? opts.nodeSize.width : opts.nodeSize.height
  const nodeCross = horizontal ? opts.nodeSize.height : opts.nodeSize.width
  const mainExtent = horizontal ? box.width : box.height
  const crossExtent = horizontal ? box.height : box.width

  const ids = Array.from(new Set(nodes.map((nd) => nd.id)))
  const idSet = new Set(ids)
  const seenEdge = new Set<string>()
  const edges = edgesIn.filter((e) => {
    const key = `${e.from}\u0000${e.to}`
    if (!idSet.has(e.from) || !idSet.has(e.to) || e.from === e.to || seenEdge.has(key)) return false
    seenEdge.add(key)
    return true
  })

  // 1. Acyclic edge set for layering: reverse DFS back edges.
  const out = new Map<string, string[]>(ids.map((i) => [i, []]))
  for (const e of edges) out.get(e.from)!.push(e.to)
  const state = new Map<string, 0 | 1 | 2>()
  const back = new Set<string>()
  const dfs = (u: string) => {
    state.set(u, 1)
    for (const v of out.get(u)!) {
      const s = state.get(v) ?? 0
      if (s === 1) back.add(`${u}\u0000${v}`)
      else if (s === 0) dfs(v)
    }
    state.set(u, 2)
  }
  for (const i of ids) if (!state.get(i)) dfs(i)
  const dag = edges.map((e) => (back.has(`${e.from}\u0000${e.to}`) ? { from: e.to, to: e.from } : e))

  // 2. Longest-path layering.
  const preds = new Map<string, string[]>(ids.map((i) => [i, []]))
  for (const e of dag) preds.get(e.to)!.push(e.from)
  const layerOf = new Map<string, number>()
  const place = (u: string): number => {
    const known = layerOf.get(u)
    if (known !== undefined) return known
    const l = preds.get(u)!.reduce((m, p) => Math.max(m, place(p) + 1), 0)
    layerOf.set(u, l)
    return l
  }
  for (const i of ids) place(i)
  const layerCount = ids.length === 0 ? 0 : Math.max(...Array.from(layerOf.values())) + 1
  const layers: string[][] = Array.from({ length: layerCount }, () => [])
  for (const i of ids) layers[layerOf.get(i)!].push(i)

  // 3. Barycentre ordering, two sweeps.
  const succs = new Map<string, string[]>(ids.map((i) => [i, []]))
  for (const e of dag) succs.get(e.from)!.push(e.to)
  const pos = new Map<string, number>()
  const reindex = () => layers.forEach((layer) => layer.forEach((id, i) => pos.set(id, i)))
  reindex()
  const sweep = (from: number, to: number, step: number, nbrs: Map<string, string[]>) => {
    for (let l = from; step > 0 ? l < to : l > to; l += step) {
      const bary = new Map<string, number>()
      for (const id of layers[l]) {
        const ns = nbrs.get(id)!.filter((n) => layerOf.get(n) === l - step)
        bary.set(id, ns.length ? ns.reduce((s, n) => s + pos.get(n)!, 0) / ns.length : pos.get(id)!)
      }
      layers[l].sort((a, b) => bary.get(a)! - bary.get(b)! || pos.get(a)! - pos.get(b)!)
      layers[l].forEach((id, i) => pos.set(id, i))
    }
  }
  sweep(1, layerCount, 1, preds)
  sweep(layerCount - 2, -1, -1, succs)

  // 4. Coordinates.
  const widest = layers.reduce((m, l) => Math.max(m, l.length), 0)
  const crossPitch = widest > 0 ? crossExtent / widest : crossExtent
  const mainPitch = layerCount > 1 ? (mainExtent - nodeMain) / (layerCount - 1) : 0
  const fits =
    ids.length <= MAX_DAG_NODES &&
    edges.length <= MAX_DAG_EDGES &&
    (widest === 0 || crossPitch >= nodeCross + minGap) &&
    (layerCount <= 1 || mainPitch >= nodeMain + minGap)

  const boxes: Record<string, Box> = {}
  layers.forEach((layer, l) => {
    const main = l * mainPitch
    const used = layer.length * crossPitch
    const start = (crossExtent - used) / 2
    layer.forEach((id, i) => {
      const crossCentre = start + (i + 0.5) * crossPitch
      boxes[id] = horizontal
        ? { x: box.x + main, y: box.y + crossCentre - nodeCross / 2, width: nodeMain, height: nodeCross }
        : { x: box.x + crossCentre - nodeCross / 2, y: box.y + main, width: nodeCross, height: nodeMain }
    })
  })

  // 5. Routes: elbows from the source side facing the target layer, lane in the gap after the
  //    source layer (or before it for a reversed edge).
  const routes = edges.map((e) => {
    const lf = layerOf.get(e.from)!
    const lt = layerOf.get(e.to)!
    const forward = lt > lf
    const a = boxes[e.from]
    const b = boxes[e.to]
    const sides = horizontal
      ? forward ? ({ from: 'right', to: 'left' } as const) : ({ from: 'left', to: 'right' } as const)
      : forward ? ({ from: 'bottom', to: 'top' } as const) : ({ from: 'top', to: 'bottom' } as const)
    const gap = mainPitch - nodeMain
    let lane: number | undefined
    if (lt !== lf) {
      const step = forward ? 1 : -1
      const edgeMain = horizontal
        ? (forward ? a.x + a.width : a.x)
        : (forward ? a.y + a.height : a.y)
      lane = edgeMain + step * gap / 2
    }
    const { points } = connectorRoute(a, b, { kind: 'elbow', sides, lane })
    return { from: e.from, to: e.to, points }
  })

  const layerRecord: Record<string, number> = {}
  for (const [id, l] of layerOf) layerRecord[id] = l
  return { fits, boxes, layers: layerRecord, edges: routes }
}
