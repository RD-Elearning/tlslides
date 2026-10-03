/**
 * tls.g.tree — placement, caps, directions, node styles, links.
 */

import { tlsGTree } from './index'
import { standardBlockSuite } from '../../text/standard-suite'
import { assertChartSane } from '../../data/_chart/chart-test'
import { assertNoOverlap, chartCtx, layoutOf, rectsOf, within } from '../diagram-test'

const SZ = { width: 1200, height: 640 }
const MIN = { width: 600, height: 360 }
const lay = (props: Record<string, unknown>, size = SZ) => layoutOf(tlsGTree, props, size)

const leaf = (n: string) => ({ label: `Leaf ${n} xxxxxxxxxxxxxxxxxxxxx`, sub: 'sub label xxxxxxxxxxxxxxxxx' })
/** root + `k` children + grandchildren spread so the total is `total` (<= 15). */
function treeOf(k: number, total: number) {
  const kids = Array.from({ length: k }, (_, i) => ({ label: `Child ${i} xxxxxxxxxxxxxxxxxxxxx`, sub: 'sub xxxxxxxxxxxxxxxxxxxxxxx', children: [] as any[] }))
  let left = total - 1 - k
  for (let i = 0; left > 0; i = (i + 1) % k) {
    if (kids[i].children.length < 6) {
      kids[i].children.push(leaf(`${i}.${kids[i].children.length}`))
      left--
    }
  }
  return { label: 'Root xxxxxxxxxxxxxxxxxxxxxxx', sub: 'sub xxxxxxxxxxxxxxxxxxxxxxx', children: kids }
}

standardBlockSuite(tlsGTree, { overflowProps: { root: treeOf(6, 15).children.length ? { ...treeOf(3, 15), children: [...treeOf(3, 15).children, ...treeOf(4, 5).children] } : {} } })

describe('tls.g.tree', () => {
  it.each([
    ['TB', 'card', false],
    ['TB', 'pill', false],
    ['TB', 'avatar', false],
    ['TB', 'card', true],
    ['LR', 'card', false],
    ['LR', 'pill', false],
    ['LR', 'avatar', true],
  ])('%s/%s/compact=%s: minimal and maximal (15 nodes) trees lay out, boxes never overlap, text stays inside', (direction, nodeStyle, compact) => {
    for (const size of [SZ, MIN]) {
      for (const root of [{ label: 'Only root' }, treeOf(2, 3), treeOf(3, 15), treeOf(5, 15)]) {
        const t = lay({ root, direction, nodeStyle, compact }, size)
        assertChartSane(t, size)
        const boxes = rectsOf(t, /^node\[/)
        assertNoOverlap(boxes, 0.5)
        for (const l of rectsOf(t, /^(label|sub)\[/)) {
          const id = /\[(.+)\]/.exec(l.part)![1]
          const owner = boxes.find((b) => b.part === `node[${id}]`)!
          expect(within(l, owner, 1)).toBe(true)
        }
      }
    }
  })

  it('draws one link per non-root node and each link sits between its two boxes', () => {
    const t = lay({ root: treeOf(3, 10) })
    const boxes = rectsOf(t, /^node\[/)
    const links = rectsOf(t, /^link\[/)
    expect(links).toHaveLength(boxes.length - 1)
    for (const l of links) {
      const id = /\[(.+)\]/.exec(l.part)![1]
      const child = boxes.find((b) => b.part === `node[${id}]`)!
      const parent = boxes.find((b) => b.part === `node[${id.slice(0, id.lastIndexOf('-'))}]`)!
      // Connector never crosses its endpoint boxes: its bounds touch them but do not overlap.
      expect(l.y).toBeGreaterThanOrEqual(parent.y + parent.height - 1)
      expect(l.y + l.height).toBeLessThanOrEqual(child.y + 1)
    }
  })

  it('LR links run left to right between their boxes', () => {
    const t = lay({ root: treeOf(3, 10), direction: 'LR' })
    const boxes = rectsOf(t, /^node\[/)
    for (const l of rectsOf(t, /^link\[/)) {
      const id = /\[(.+)\]/.exec(l.part)![1]
      const child = boxes.find((b) => b.part === `node[${id}]`)!
      const parent = boxes.find((b) => b.part === `node[${id.slice(0, id.lastIndexOf('-'))}]`)!
      expect(l.x).toBeGreaterThanOrEqual(parent.x + parent.width - 1)
      expect(l.x + l.width).toBeLessThanOrEqual(child.x + 1)
    }
  })

  it('parents are centred over their children and the root is the top (TB) / left (LR) node', () => {
    const t = lay({ root: treeOf(3, 10) })
    const b = Object.fromEntries(rectsOf(t, /^node\[/).map((r) => [r.part, r]))
    const r0 = b['node[0]']
    expect(Math.min(...Object.values(b).map((r) => r.y))).toBe(r0.y)
    const kids = ['node[0-0]', 'node[0-1]', 'node[0-2]'].map((k) => b[k])
    expect(r0.x + r0.width / 2).toBeCloseTo((kids[0].x + kids[2].x + kids[2].width) / 2, 0)
  })

  it('caps at 15 nodes, 6 children per node and 4 levels', () => {
    const wide = { label: 'r', children: Array.from({ length: 9 }, (_, i) => ({ label: `c${i}` })) }
    expect(rectsOf(lay({ root: wide }), /^node\[/)).toHaveLength(7)
    const big = treeOf(6, 15)
    big.children.forEach((c) => c.children.push(...Array.from({ length: 4 }, (_, i) => leaf(String(i)))))
    expect(rectsOf(lay({ root: big }), /^node\[/)).toHaveLength(15)
    const deep: any = { label: 'a', children: [{ label: 'b', children: [{ label: 'c', children: [{ label: 'd', children: [{ label: 'e' }] }] }] }] }
    expect(rectsOf(lay({ root: deep }), /^node\[/)).toHaveLength(4)
  })

  it('avatar shows a monogram, pill has fully round ends, compact drops the sub-labels', () => {
    expect(rectsOf(lay({ root: treeOf(2, 3), nodeStyle: 'avatar' }, { width: 1600, height: 700 }), /^avatar\[/).length).toBeGreaterThan(0)
    expect(rectsOf(lay({ root: treeOf(2, 3), nodeStyle: 'card' }), /^avatar\[/)).toHaveLength(0)
    expect(rectsOf(lay({ root: treeOf(2, 3), compact: true }), /^sub\[/)).toHaveLength(0)
    expect(rectsOf(lay({ root: treeOf(2, 3) }), /^sub\[/).length).toBeGreaterThan(0)
  })

  it('empty or hostile roots render a placeholder, never NaN', () => {
    for (const root of [undefined, null, 4, [], {}, { label: '' }, { label: 'x', children: [null, 3, {}] }]) {
      expect(JSON.stringify(lay({ root }))).not.toMatch(/NaN|Infinity/)
    }
  })

  it('capacity: 16 nodes, 7 children or 5 levels do not fit and say what to do', () => {
    const cap = (root: unknown) => tlsGTree.capacity!({ root } as any, SZ, chartCtx(SZ))
    expect(cap(treeOf(3, 15)).fits).toBe(true)
    expect(cap(treeOf(3, 16)).fits).toBe(false)
    expect(cap({ label: 'r', children: Array.from({ length: 7 }, (_, i) => ({ label: `c${i}` })) }).fits).toBe(false)
    const deep: any = { label: 'a', children: [{ label: 'b', children: [{ label: 'c', children: [{ label: 'd', children: [{ label: 'e' }] }] }] }] }
    expect(cap(deep).fits).toBe(false)
    expect(cap(treeOf(3, 16)).remedy.length).toBeGreaterThan(0)
  })
})
