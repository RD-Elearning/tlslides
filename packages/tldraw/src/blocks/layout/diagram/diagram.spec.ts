/**
 * P0.8 — diagram helpers. Geometry properties: a connector never crosses its endpoint boxes, a
 * DAG / tree layout never overlaps its node boxes, and every box stays inside the target box.
 */
import { connector, connectorRoute, autoSides, anchor } from './connector'
import { radial, ringBoxes } from './radial'
import { layeredDag, MAX_DAG_NODES } from './layered-dag'
import { tidyTree, type TreeNode } from './tidy-tree'
import { chevronPath, trapezoidPath } from './shape-paths'
import type { Box, Pt } from '../../types'

/** Does the segment pass through the open interior of `box`? (Liang–Barsky, strict.) */
function segmentCrossesInterior(a: Pt, b: Pt, box: Box): boolean {
  const eps = 1e-6
  const x0 = box.x + eps
  const x1 = box.x + box.width - eps
  const y0 = box.y + eps
  const y1 = box.y + box.height - eps
  let t0 = 0
  let t1 = 1
  const dx = b.x - a.x
  const dy = b.y - a.y
  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-12) return q >= 0
    const r = q / p
    if (p < 0) {
      if (r > t1) return false
      if (r > t0) t0 = r
    } else {
      if (r < t0) return false
      if (r < t1) t1 = r
    }
    return true
  }
  if (!clip(-dx, a.x - x0) || !clip(dx, x1 - a.x) || !clip(-dy, a.y - y0) || !clip(dy, y1 - a.y)) return false
  return t1 - t0 > 1e-9
}

function polylineCrosses(points: Pt[], box: Box): boolean {
  for (let i = 0; i < points.length - 1; i++) if (segmentCrossesInterior(points[i], points[i + 1], box)) return true
  return false
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width - 1e-9 && b.x < a.x + a.width - 1e-9 && a.y < b.y + b.height - 1e-9 && b.y < a.y + a.height - 1e-9
}

function inside(inner: Box, outer: Box): boolean {
  const e = 1e-6
  return inner.x >= outer.x - e && inner.y >= outer.y - e && inner.x + inner.width <= outer.x + outer.width + e && inner.y + inner.height <= outer.y + outer.height + e
}

const A: Box = { x: 200, y: 200, width: 100, height: 60 }
// Eight neighbours, all separated from A by a clear gap.
const NEIGHBOURS: Array<[string, Box]> = [
  ['right', { x: 400, y: 200, width: 100, height: 60 }],
  ['left', { x: 0, y: 200, width: 100, height: 60 }],
  ['above', { x: 200, y: 60, width: 100, height: 60 }],
  ['below', { x: 200, y: 340, width: 100, height: 60 }],
  ['right-up', { x: 400, y: 60, width: 100, height: 60 }],
  ['right-down', { x: 400, y: 340, width: 100, height: 60 }],
  ['left-up', { x: 0, y: 60, width: 100, height: 60 }],
  ['left-down', { x: 0, y: 340, width: 100, height: 60 }],
]

describe('connector', () => {
  for (const kind of ['straight', 'elbow'] as const) {
    it.each(NEIGHBOURS)(`${kind}: never crosses either box (auto sides, %s)`, (_name, other) => {
      for (const [from, to] of [[A, other], [other, A]] as Array<[Box, Box]>) {
        const { points } = connectorRoute(from, to, { kind })
        expect(polylineCrosses(points, from)).toBe(false)
        expect(polylineCrosses(points, to)).toBe(false)
      }
    })
  }

  it('anchors on box edge midpoints', () => {
    const { points, fromSide, toSide } = connectorRoute(A, NEIGHBOURS[0][1], { kind: 'straight' })
    expect([fromSide, toSide]).toEqual(['right', 'left'])
    expect(points[0]).toEqual({ x: 300, y: 230 })
    expect(points[1]).toEqual({ x: 400, y: 230 })
    expect(anchor(A, 'top')).toEqual({ x: 250, y: 200 })
  })

  it('auto picks the dominant axis', () => {
    expect(autoSides(A, NEIGHBOURS[0][1])).toEqual({ from: 'right', to: 'left' })
    expect(autoSides(A, NEIGHBOURS[2][1])).toEqual({ from: 'top', to: 'bottom' })
    expect(autoSides(A, NEIGHBOURS[1][1])).toEqual({ from: 'left', to: 'right' })
    expect(autoSides(A, NEIGHBOURS[3][1])).toEqual({ from: 'bottom', to: 'top' })
  })

  it('elbow between offset boxes is axis-aligned with the middle lane in the gap', () => {
    const { points } = connectorRoute(A, NEIGHBOURS[4][1], { kind: 'elbow' }) // right-up
    expect(points).toEqual([
      { x: 300, y: 230 },
      { x: 350, y: 230 },
      { x: 350, y: 90 },
      { x: 400, y: 90 },
    ])
  })

  it('elbow between aligned boxes collapses to a straight run', () => {
    expect(connectorRoute(A, NEIGHBOURS[0][1], { kind: 'elbow' }).points).toHaveLength(2)
  })

  it('same-side elbow (right -> right) leaves through a lane clear of both boxes', () => {
    const to: Box = { x: 200, y: 340, width: 100, height: 60 }
    const { points } = connectorRoute(A, to, { kind: 'elbow', sides: { from: 'right', to: 'right' } })
    expect(points[1].x).toBeGreaterThan(300)
    expect(polylineCrosses(points, A)).toBe(false)
    expect(polylineCrosses(points, to)).toBe(false)
  })

  it('straight + arrow gives a line node with a marker; none gives no marker', () => {
    const withHead = connector(A, NEIGHBOURS[0][1], { kind: 'straight', head: 'arrow', color: '#111' })
    expect(withHead.k).toBe('line')
    expect(withHead.k === 'line' && withHead.marker).toEqual({ kind: 'arrow', color: '#111' })
    const none = connector(A, NEIGHBOURS[0][1], { kind: 'straight', head: 'none', color: '#111' })
    expect(none.k === 'line' && none.marker).toBeUndefined()
  })

  it('elbow + arrow is a group of stem and head; the head tip sits on the target edge', () => {
    const node = connector(A, NEIGHBOURS[4][1], { kind: 'elbow', head: 'arrow', color: '#111' })
    expect(node.k).toBe('group')
    if (node.k !== 'group') return
    const head = node.children.find((c) => c.part === 'connector/head')
    expect(head && head.k === 'path' && head.d.startsWith('M400 90')).toBe(true)
    const stem = node.children.find((c) => c.part === 'connector/stem')
    expect(stem && stem.k === 'path' && stem.d.endsWith('L392 90')).toBe(true)
  })

  it('elbow without a head is a single path', () => {
    expect(connector(A, NEIGHBOURS[4][1], { kind: 'elbow', head: 'none', color: '#111' }).k).toBe('path')
  })
})

describe('radial / ringBoxes', () => {
  it('4 points start at 12 o clock and go clockwise', () => {
    const p = radial(4, { x: 100, y: 100 }, 50)
    expect(p.map((q) => [Math.round(q.x), Math.round(q.y)])).toEqual([[100, 50], [150, 100], [100, 150], [50, 100]])
  })

  it('custom start angle', () => {
    const p = radial(2, { x: 0, y: 0 }, 10, 0)
    expect([Math.round(p[0].x), Math.round(p[1].x)]).toEqual([10, -10])
  })

  it('ring boxes stay inside the box, do not overlap, and are centred', () => {
    const box: Box = { x: 10, y: 20, width: 600, height: 400 }
    const boxes = ringBoxes(6, box, { width: 120, height: 60 })
    expect(boxes).toHaveLength(6)
    for (const b of boxes) expect(inside(b, box)).toBe(true)
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlaps(boxes[i], boxes[j])).toBe(false)
    // first node centred on the vertical axis at the top of the circle
    expect(boxes[0].x + 60).toBeCloseTo(310, 6)
    expect(boxes[0].y).toBeCloseTo(20, 6)
  })

  it('degenerate: n = 0 and box smaller than the node', () => {
    expect(ringBoxes(0, { x: 0, y: 0, width: 100, height: 100 }, { width: 10, height: 10 })).toEqual([])
    expect(() => ringBoxes(3, { x: 0, y: 0, width: 5, height: 5 }, { width: 10, height: 10 })).not.toThrow()
  })
})

describe('layeredDag', () => {
  const box: Box = { x: 0, y: 0, width: 900, height: 500 }
  const nodeSize = { width: 100, height: 50 }
  const nodes = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id }))
  const edges = [
    { from: 'a', to: 'b' },
    { from: 'a', to: 'c' },
    { from: 'b', to: 'd' },
    { from: 'c', to: 'd' },
    { from: 'd', to: 'e' },
    { from: 'a', to: 'f' },
  ]

  for (const dir of ['TB', 'LR'] as const) {
    describe(dir, () => {
      const r = layeredDag(nodes, edges, dir, box, { nodeSize })

      it('fits and layers by longest path', () => {
        expect(r.fits).toBe(true)
        expect(r.layers).toEqual({ a: 0, b: 1, c: 1, f: 1, d: 2, e: 3 })
      })

      it('has no overlapping node boxes and keeps every box inside', () => {
        const ids = Object.keys(r.boxes)
        expect(ids).toHaveLength(6)
        for (const id of ids) expect(inside(r.boxes[id], box)).toBe(true)
        for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) expect(overlaps(r.boxes[ids[i]], r.boxes[ids[j]])).toBe(false)
      })

      it('layers advance along the main axis', () => {
        const main = (id: string) => (dir === 'TB' ? r.boxes[id].y : r.boxes[id].x)
        expect(main('a')).toBeLessThan(main('b'))
        expect(main('b')).toBeLessThan(main('d'))
        expect(main('d')).toBeLessThan(main('e'))
        expect(main('b')).toBe(main('c'))
      })

      it('routes start and end on the endpoint boxes without crossing them', () => {
        expect(r.edges).toHaveLength(6)
        for (const e of r.edges) {
          const from = r.boxes[e.from]
          const to = r.boxes[e.to]
          expect(polylineCrosses(e.points, from)).toBe(false)
          expect(polylineCrosses(e.points, to)).toBe(false)
          const p0 = e.points[0]
          const pn = e.points[e.points.length - 1]
          const onEdge = (p: Pt, b: Box) =>
            (Math.abs(p.x - b.x) < 1e-6 || Math.abs(p.x - (b.x + b.width)) < 1e-6 || Math.abs(p.y - b.y) < 1e-6 || Math.abs(p.y - (b.y + b.height)) < 1e-6) &&
            p.x >= b.x - 1e-6 && p.x <= b.x + b.width + 1e-6 && p.y >= b.y - 1e-6 && p.y <= b.y + b.height + 1e-6
          expect(onEdge(p0, from)).toBe(true)
          expect(onEdge(pn, to)).toBe(true)
        }
      })
    })
  }

  it('barycentre ordering uncrosses a simple X', () => {
    // a->d and b->c would cross if ordered [a, b] / [c, d]; the sweep should reorder layer 1.
    const r = layeredDag(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
      [{ from: 'a', to: 'd' }, { from: 'b', to: 'c' }],
      'TB',
      { x: 0, y: 0, width: 600, height: 400 },
      { nodeSize: { width: 80, height: 40 } }
    )
    expect(r.boxes.a.x < r.boxes.b.x).toBe(r.boxes.d.x < r.boxes.c.x)
  })

  it('tolerates a cycle, duplicate / self / unknown edges, and still places every node', () => {
    const r = layeredDag(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }, { from: 'a', to: 'b' }, { from: 'a', to: 'a' }, { from: 'a', to: 'zzz' }],
      'LR',
      box,
      { nodeSize }
    )
    expect(Object.keys(r.boxes).sort()).toEqual(['a', 'b', 'c'])
    expect(r.edges).toHaveLength(3)
    expect(r.layers.a).toBeLessThan(r.layers.b)
    expect(r.layers.b).toBeLessThan(r.layers.c)
  })

  it(`capacity: more than ${MAX_DAG_NODES} nodes does not fit`, () => {
    const many = Array.from({ length: 13 }, (_, i) => ({ id: `n${i}` }))
    expect(layeredDag(many, [], 'TB', box, { nodeSize: { width: 40, height: 20 } }).fits).toBe(false)
  })

  it('capacity: more than 16 edges does not fit; and a too-small box does not fit', () => {
    const ns = Array.from({ length: 8 }, (_, i) => ({ id: `n${i}` }))
    const es: Array<{ from: string; to: string }> = []
    for (let i = 0; i < 8 && es.length < 17; i++) for (let j = i + 1; j < 8 && es.length < 17; j++) es.push({ from: `n${i}`, to: `n${j}` })
    expect(layeredDag(ns, es, 'TB', box, { nodeSize: { width: 40, height: 20 } }).fits).toBe(false)
    expect(layeredDag(nodes, edges, 'TB', { x: 0, y: 0, width: 100, height: 100 }, { nodeSize }).fits).toBe(false)
  })

  it('empty input is safe', () => {
    const r = layeredDag([], [], 'TB', box, { nodeSize })
    expect(r.fits).toBe(true)
    expect(r.boxes).toEqual({})
  })
})

describe('tidyTree', () => {
  const root: TreeNode = {
    id: 'r',
    children: [
      { id: 'a', children: [{ id: 'a1' }, { id: 'a2' }] },
      { id: 'b' },
      { id: 'c', children: [{ id: 'c1', children: [{ id: 'c11' }] }] },
    ],
  }
  const box: Box = { x: 0, y: 0, width: 900, height: 500 }
  const nodeSize = { width: 100, height: 50 }

  for (const dir of ['TB', 'LR'] as const) {
    it(`${dir}: no overlaps, inside the box, parents centred over children`, () => {
      const r = tidyTree(root, dir, box, { nodeSize })
      expect(r.fits).toBe(true)
      const ids = Object.keys(r.boxes)
      expect(ids).toHaveLength(8)
      for (const id of ids) expect(inside(r.boxes[id], box)).toBe(true)
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) expect(overlaps(r.boxes[ids[i]], r.boxes[ids[j]])).toBe(false)
      const cross = (id: string) => (dir === 'TB' ? r.boxes[id].x + r.boxes[id].width / 2 : r.boxes[id].y + r.boxes[id].height / 2)
      expect(cross('a')).toBeCloseTo((cross('a1') + cross('a2')) / 2, 6)
      expect(cross('r')).toBeCloseTo((cross('a') + cross('c')) / 2, 6)
      expect(r.edges).toHaveLength(7)
    })
  }

  it('TB: depth increases down the page and siblings share a row', () => {
    const r = tidyTree(root, 'TB', box, { nodeSize })
    expect(r.boxes.r.y).toBeLessThan(r.boxes.a.y)
    expect(r.boxes.a.y).toBe(r.boxes.b.y)
    expect(r.boxes.a.y).toBeLessThan(r.boxes.a1.y)
  })

  it('more than 4 levels does not fit', () => {
    const deep: TreeNode = { id: '1', children: [{ id: '2', children: [{ id: '3', children: [{ id: '4', children: [{ id: '5' }] }] }] }] }
    expect(tidyTree(deep, 'TB', { x: 0, y: 0, width: 900, height: 900 }, { nodeSize }).fits).toBe(false)
  })

  it('single node and a cyclic / duplicated child do not loop or throw', () => {
    expect(tidyTree({ id: 'x' }, 'TB', box, { nodeSize }).fits).toBe(true)
    const cyc: TreeNode = { id: 'p', children: [] }
    cyc.children!.push(cyc, { id: 'q' })
    expect(Object.keys(tidyTree(cyc, 'TB', box, { nodeSize }).boxes).sort()).toEqual(['p', 'q'])
  })

  it('too many leaves for the width does not fit', () => {
    const wide: TreeNode = { id: 'r', children: Array.from({ length: 12 }, (_, i) => ({ id: `k${i}` })) }
    expect(tidyTree(wide, 'TB', { x: 0, y: 0, width: 400, height: 300 }, { nodeSize }).fits).toBe(false)
  })
})

describe('shape paths', () => {
  const b: Box = { x: 0, y: 0, width: 100, height: 40 }
  it('middle chevron has head and tail notch', () => {
    expect(chevronPath(b, 10)).toBe('M0 0L90 0L100 20L90 40L0 40L10 20Z')
  })
  it('first chevron has a flat tail; last has a flat head', () => {
    expect(chevronPath(b, 10, true)).toBe('M0 0L90 0L100 20L90 40L0 40Z')
    expect(chevronPath(b, 10, false, true)).toBe('M0 0L100 0L100 40L0 40L10 20Z')
  })
  it('notch is clamped to half the width', () => {
    expect(chevronPath(b, 500)).toBe('M0 0L50 0L100 20L50 40L0 40L50 20Z')
  })
  it('trapezoid golden (funnel and pyramid layer)', () => {
    expect(trapezoidPath(b, 0, 20)).toBe('M0 0L100 0L80 40L20 40Z')
    expect(trapezoidPath(b, 10, 30)).toBe('M10 0L90 0L70 40L30 40Z')
  })
})
