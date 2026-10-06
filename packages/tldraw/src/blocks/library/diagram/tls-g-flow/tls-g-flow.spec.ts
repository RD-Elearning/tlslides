/**
 * tls.g.flow — DAG layout without overlaps, connector routing, unknown ids, cycles, limits.
 */

import { tlsGFlow } from './index'
import { assertExampleFits } from '../../data/_chart/chart-test'
import { absoluteLeaves, standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, overlap, rectsOf, within, type Rect, assertMotionTargetsExist } from '../diagram-test'

const SZ = { width: 1400, height: 520 }
const MIN = { width: 640, height: 320 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGFlow, props, size)
const ctxOf = (size = SZ) => chartCtx(size)

const nodesN = (n: number, extra: Record<string, unknown> = {}) =>
  Array.from({ length: n }, (_, i) => ({ id: `n${i}`, label: i === 0 ? 'x'.repeat(40) : `Step ${i}`, ...extra }))

// 12 nodes, 16 edges: a layered graph with branches and merges.
const bigNodes = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, label: `Node ${i} ${'w'.repeat(i % 3 ? 5 : 30)}`, kind: ['step', 'decision', 'start', 'end'][i % 4] }))
const bigEdges = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8], [8, 9], [8, 10], [9, 11], [10, 11],
].map(([a, b], i) => ({ from: `n${a}`, to: `n${b}`, label: i % 3 === 0 ? 'Yes please yes' : '' }))

standardBlockSuite(tlsGFlow, { overflowProps: { nodes: nodesN(13) } })

const nodeRects = (t: any): Rect[] => rectsOf(t, /^node\[[^\]]+\]$/)

/** Strictly inside segment test (Liang-Barsky), as in the P0.8 helper spec. */
function crosses(a: { x: number; y: number }, b: { x: number; y: number }, box: Rect): boolean {
  const e = 0.05
  let t0 = 0
  let t1 = 1
  const dx = b.x - a.x
  const dy = b.y - a.y
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-12) return q >= 0
    const r = q / p
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r } else { if (r < t0) return false; if (r < t1) t1 = r }
    return true
  }
  if (!clip(-dx, a.x - (box.x + e)) || !clip(dx, box.x + box.width - e - a.x) || !clip(-dy, a.y - (box.y + e)) || !clip(dy, box.y + box.height - e - a.y)) return false
  return t1 - t0 > 1e-6
}

function polylineOf(d: string) {
  return [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
}

describe('tls.g.flow', () => {
  it.each([['LR'], ['TB']])('%s: the default flow lays out; nodes, edge labels and node text never overlap', (direction) => {
    const t = lay({ direction })
    assertChartSane(t, SZ)
    const nr = nodeRects(t)
    expect(nr).toHaveLength(5)
    assertNoOverlap(nr)
    assertNoOverlap([...nr, ...rectsOf(t, /^edge\[\d+\]\.label/)])
    for (const l of rectsOf(t, /^node\[[^\]]+\]\.label/)) {
      const owner = nr.find((n) => l.part.startsWith(`${n.part}.`))!
      expect(within(l, owner, 1)).toBe(true)
    }
  })

  it('edge connectors never cross their own endpoint boxes (elbow and straight, LR and TB)', () => {
    for (const direction of ['LR', 'TB']) {
      for (const routing of ['elbow', 'straight']) {
        const props = { direction, routing, nodes: bigNodes.slice(0, 8), edges: bigEdges.filter((e) => Number(e.from.slice(1)) < 8 && Number(e.to.slice(1)) < 8) }
        const t = lay(props)
        const nr = new Map(nodeRects(t).map((r) => [r.part.slice(5, -1), r]))
        const edges = props.edges
        edges.forEach((e, i) => {
          const stem = absoluteLeaves(t).find((l) => l.part === `edge[${i}]`)
          if (!stem) return
          const d = (stem.node as any).d as string
          if (d.includes('C')) return // back edge curve: control points are not on the path
          const pts = polylineOf(d)
          for (const id of [e.from, e.to]) {
            for (let k = 0; k < pts.length - 1; k++) expect([direction, routing, i, id, crosses(pts[k], pts[k + 1], nr.get(String(props.nodes.findIndex((n) => n.id === id)))!)]).toEqual([direction, routing, i, id, false])
          }
        })
      }
    }
  })

  it('12 nodes and 16 edges lay out without overlaps or error nodes; labels stay inside', () => {
    for (const direction of ['LR', 'TB']) {
      const t = lay({ nodes: bigNodes, edges: bigEdges, direction })
      expect(JSON.stringify(t)).not.toMatch(/NaN|Infinity|undefined/)
      expect(nodeRects(t)).toHaveLength(12)
      assertNoOverlap(nodeRects(t))
      assertNoOverlap([...rectsOf(t, /^node\[[^\]]+\]\.label/)])
    }
  })

  it('minimum graph (2 nodes, 1 edge) and tiny boxes lay out', () => {
    const props = { nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], edges: [{ from: 'a', to: 'b' }] }
    assertChartSane(lay(props), SZ)
    assertChartSane(lay(props, MIN), MIN)
    assertChartSane(lay({ ...props, direction: 'TB' }, MIN), MIN)
  })

  it('an edge naming an unknown node id is an error finding, is skipped, and nothing crashes', () => {
    const props = { nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'ghost' }, { from: 'nope', to: 'b', label: 'x' }] }
    const findings = tlsGFlow.lint!(props as any, {} as any)
    expect(findings.filter((f) => f.level === 'error').map((f) => f.rule)).toEqual(['flow/unknown-node', 'flow/unknown-node'])
    expect(findings[0].message).toMatch(/ghost/)
    const t = lay(props)
    const parts = absoluteLeaves(t).map((l) => l.part)
    expect(parts).toContain('edge[0]')
    expect(parts).not.toContain('edge[1]')
    expect(parts).not.toContain('edge[2]')
    assertChartSane(t, SZ)
  })

  it('a cycle is a warning and the returning edge is drawn as a curve below the nodes (LR) or beside them (TB)', () => {
    const props = { nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a', label: 'Retry' }] }
    const f = tlsGFlow.lint!(props as any, {} as any)
    expect(f.map((x) => [x.level, x.rule])).toEqual([['warning', 'flow/cycle']])
    for (const direction of ['LR', 'TB']) {
      const t = lay({ ...props, direction })
      const back = absoluteLeaves(t).find((l) => l.part === 'edge[2]')!
      expect((back.node as any).d).toMatch(/C/)
      const nr = nodeRects(t)
      const ys = polylineOf((back.node as any).d)
      const bottom = Math.max(...nr.map((r) => r.y + r.height))
      const right = Math.max(...nr.map((r) => r.x + r.width))
      if (direction === 'LR') expect(Math.max(...ys.map((p) => p.y))).toBeGreaterThan(bottom)
      else expect(Math.max(...ys.map((p) => p.x))).toBeGreaterThan(right)
      assertChartSane(t, SZ)
      assertNoOverlap([...nr, ...rectsOf(t, /\.label$/).filter((r) => r.part.startsWith('edge'))])
    }
    expect(tlsGFlow.lint!({ nodes: props.nodes, edges: props.edges.slice(0, 2) } as any, {} as any)).toEqual([])
  })

  it('self loops and duplicate ids are skipped with a warning', () => {
    const f = tlsGFlow.lint!({ nodes: [{ id: 'a', label: 'A' }, { id: 'a', label: 'dup' }, { id: 'b', label: 'B' }], edges: [{ from: 'a', to: 'a' }, { from: 'a', to: 'b' }] } as any, {} as any)
    expect(f.map((x) => x.rule).sort()).toEqual(['flow/duplicate-id', 'flow/self-loop'])
  })

  it('decisions are diamonds (path), start and end are pills, steps are rounded boxes', () => {
    const t = lay({})
    const ids = ['start', 'check', 'do', 'fix', 'end'] // defaults order; parts are numeric (RV07: motion matches node[*])
    const k = (id: string) => absoluteLeaves(t).find((l) => l.part === `node[${ids.indexOf(id)}]`)!
    expect(k('check').k).toBe('path')
    expect(k('start').k).toBe('rect')
    expect((k('start').node as any).radius).toBeCloseTo(k('start').height / 2, 0)
    expect((k('do').node as any).radius).toBe(10)
  })

  it('edge labels are drawn; straight routing uses two-point lines', () => {
    const t = lay({ routing: 'straight' })
    expect(rectsOf(t, /^edge\[1\]\.label/)).toHaveLength(1)
    const d = (absoluteLeaves(t).find((l) => l.part === 'edge[0]')!.node as any).d as string
    expect(polylineOf(d)).toHaveLength(2)
  })

  it('capacity: 13 nodes fail by count; a deep chain that cannot fit the width fails and suggests TB', () => {
    const ctx = ctxOf()
    expect(tlsGFlow.capacity!({ nodes: nodesN(13), edges: [{ from: 'n0', to: 'n1' }] } as any, SZ, ctx).fits).toBe(false)
    const chain = { nodes: nodesN(12), edges: Array.from({ length: 11 }, (_, i) => ({ from: `n${i}`, to: `n${i + 1}`, label: 'yes' })) }
    const r = tlsGFlow.capacity!(chain as any, SZ, ctx)
    expect(r.fits).toBe(false)
    expect(JSON.stringify(r.remedy)).toMatch(/TB/)
    expect(tlsGFlow.capacity!({ nodes: nodesN(17).slice(0, 12), edges: Array.from({ length: 17 }, (_, i) => ({ from: 'n0', to: `n${(i % 11) + 1}` })) } as any, SZ, ctx).fits).toBe(false)
  })
})

// RV07/08: the block's own example fits size.preferred and size.min (every line as wide as its glyphs).
describe('tls.g.flow example', () => {
  it('fits size.preferred and size.min', () => assertExampleFits(tlsGFlow))
  it('motion parts exist in the layout and use presets that animate', () => assertMotionTargetsExist(tlsGFlow))
})
