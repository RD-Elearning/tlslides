/**
 * Graph reading for tls.g.flow: normalises the raw slots, drops what cannot be drawn and reports
 * why. Shared by `layout`, `lint` and `capacity`. Pure.
 */

import { asArr, objs, str } from '../_kit'
import { safeId } from '../_kit'
import type { FlowProps } from './schema'
import { FLOW_MAX_EDGES, FLOW_MAX_NODES } from './schema'

export type FlowKind = 'step' | 'decision' | 'start' | 'end'

export interface Graph {
  nodes: Array<{ id: string; key: string; label: string; kind: FlowKind }>
  /** Drawable edges; `index` is the position in the original `edges` slot. */
  edges: Array<{ from: string; to: string; label: string; index: number }>
  unknown: Array<{ index: number; id: string }>
  duplicates: string[]
  selfLoops: number[]
  hasCycle: boolean
}

export function readGraph(props: FlowProps): Graph {
  const nodes: Graph['nodes'] = []
  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const n of objs(props.nodes).slice(0, FLOW_MAX_NODES)) {
    const id = str(n.id).trim()
    if (!id) continue
    if (seen.has(id)) {
      duplicates.push(id)
      continue
    }
    seen.add(id)
    const kind = (['step', 'decision', 'start', 'end'] as const).find((k) => k === n.kind) ?? 'step'
    nodes.push({ id, key: safeId(id), label: str(n.label), kind })
  }
  const edges: Graph['edges'] = []
  const unknown: Graph['unknown'] = []
  const selfLoops: number[] = []
  const pairs = new Set<string>()
  objs(props.edges)
    .slice(0, FLOW_MAX_EDGES)
    .forEach((e, index) => {
      const from = str(e.from).trim()
      const to = str(e.to).trim()
      let bad = false
      for (const id of [from, to]) {
        if (!seen.has(id)) {
          unknown.push({ index, id })
          bad = true
        }
      }
      if (bad) return
      if (from === to) {
        selfLoops.push(index)
        return
      }
      const key = `${from}\u0000${to}`
      if (pairs.has(key)) return
      pairs.add(key)
      edges.push({ from, to, label: str(e.label), index })
    })
  return { nodes, edges, unknown, duplicates, selfLoops, hasCycle: hasCycle(nodes.map((n) => n.id), edges) }
}

function hasCycle(ids: string[], edges: Array<{ from: string; to: string }>): boolean {
  const out = new Map<string, string[]>(ids.map((i) => [i, []]))
  for (const e of edges) out.get(e.from)?.push(e.to)
  const state = new Map<string, 1 | 2>()
  const visit = (u: string): boolean => {
    state.set(u, 1)
    for (const v of out.get(u) ?? []) {
      const s = state.get(v)
      if (s === 1) return true
      if (!s && visit(v)) return true
    }
    state.set(u, 2)
    return false
  }
  return ids.some((i) => !state.get(i) && visit(i))
}

export const counts = (props: FlowProps) => ({ nodes: asArr(props.nodes).length, edges: asArr(props.edges).length })
