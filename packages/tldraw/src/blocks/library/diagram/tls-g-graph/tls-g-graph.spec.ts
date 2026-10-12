/** tls.g.graph — in-order columns, sides kept, hostile input, list, visit order. */

import { tlsGGraph } from './index'
import { placeTree } from './layout'
import { standardBlockSuite, leavesOf } from '../../text/standard-suite'
import { layoutOf } from '../diagram-test'

const lay = (props: Record<string, unknown>, size = { width: 1200, height: 640 }) => layoutOf(tlsGGraph, { ...(tlsGGraph.defaults as any), ...props }, size)

standardBlockSuite(tlsGGraph, { noCapacity: true })

describe('tls.g.graph', () => {
  it('a left child sits left of its parent and a missing child leaves its gap', () => {
    const p = placeTree([
      { id: 'r', label: '8' },
      { id: 'x', label: '10', parent: 'r', side: 'right' },
      { id: 'y', label: '9', parent: 'x', side: 'left' },
    ])
    const col = Object.fromEntries(p.map((n) => [n.id, n.col]))
    expect(col.r).toBeLessThan(col.y)
    expect(col.y).toBeLessThan(col.x)
    expect(p.find((n) => n.id === 'y')!.depth).toBe(2)
  })

  it('drops cycles, unknown parents and a second child on a taken side', () => {
    const p = placeTree([
      { id: 'r', label: '1' },
      { id: 'a', label: '2', parent: 'r', side: 'left' },
      { id: 'b', label: '3', parent: 'r', side: 'left' },
      { id: 'c', label: '4', parent: 'zz', side: 'left' },
    ])
    expect(p.map((n) => n.id).sort()).toEqual(['a', 'r'])
  })

  it('numbers the visit order on the nodes and writes the sequence below', () => {
    const tree = lay({})
    expect(leavesOf(tree, 'order').filter((l) => l.k === 'rect')).toHaveLength(6)
    const seq = leavesOf(tree, 'sequence')
    expect(seq.length).toBeGreaterThan(0)
    const lastNode = Math.max(...leavesOf(tree, 'node').map((n) => n.y + n.height))
    expect(seq[0].y).toBeGreaterThan(lastNode)
  })

  it('a list is a row of boxes joined by arrows, NULL at the end', () => {
    const tree = lay({ kind: 'list', nodes: [{ id: 'a', label: '3' }, { id: 'b', label: '7' }, { id: 'c', label: '9' }], order: [] })
    const boxes = leavesOf(tree, 'node')
    expect(boxes).toHaveLength(3)
    expect(boxes[1].x).toBeGreaterThan(boxes[0].x + boxes[0].width)
    expect(Math.abs(boxes[1].y - boxes[0].y)).toBeLessThan(1)
    expect(leavesOf(tree, 'null').length).toBeGreaterThan(0)
  })
})

describe('tls.g.graph — robust input, token sizes', () => {
  it('a tree written as edges is laid out like parent/side', () => {
    const tree = lay({ nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }], edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }], order: [] })
    const nodes = leavesOf(tree, 'node')
    expect(nodes).toHaveLength(3)
    expect(nodes[0].x).toBeLessThan(nodes[1].x) // b (left) before a before c
  })
  it('labels and badges use sizes of the type scale', () => {
    const { makeCtx, makeRegistry } = require('../../text/test-helpers')
    const ctx = makeCtx({ width: 1200, height: 640 }, makeRegistry())
    const scale = new Set(['heading', 'subheading', 'lead', 'body', 'caption', 'footnote'].map((t) => ctx.resolveText(t).size))
    const sizes = leavesOf(lay({}), 'label').concat(leavesOf(lay({}), 'order')).filter((l) => l.k === 'text').map((l) => (l.node as any).style.size)
    for (const s of sizes) expect(scale.has(s)).toBe(true)
  })
})
