/**
 * Pure layout for tls.g.tree — a root box linked to children and grandchildren by elbow links.
 *
 * Positions come from `tidyTree` (leaves take consecutive slots on the cross axis, parents are
 * centred over their children). The box size is derived from the slot pitch so boxes on one level
 * can never touch, and from the level count so there is always a link-sized gap between levels.
 * Labels are clipped to their box (ellipsis), never wrapped per letter.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { tidyTree, MAX_TREE_LEVELS } from '../../../layout/diagram'
import type { TreeNode } from '../../../layout/diagram'
import type { TreeProps } from './schema'
import { TREE_MAX_CHILDREN, TREE_MAX_NODES } from './schema'
import { TEXT_SLACK, capacityOf, chartColors, clamp, emptyState, enumOf, lineH, mutedStyle, objs, onColor, placeLines, root, str, strokePath, style, tintOf, polyline, linesHeight } from '../_kit'
import { slot } from '../_motion'

interface TNode {
  id: string
  label: string
  sub: string
  depth: number
  kids: TNode[]
}

/** Read the (possibly hostile) nested props into at most 15 nodes, 6 children each, 4 levels. */
function readTree(raw: unknown): TNode | null {
  const rootObj = objs([raw])[0]
  if (!rootObj) return null
  let count = 0
  const walk = (o: Record<string, unknown>, id: string, depth: number): TNode => {
    count++
    const node: TNode = { id, label: str(o.label), sub: str(o.sub), depth, kids: [] }
    if (depth + 1 >= MAX_TREE_LEVELS) return node
    for (const [i, k] of objs(o.children).slice(0, TREE_MAX_CHILDREN).entries()) {
      if (count >= TREE_MAX_NODES) break
      node.kids.push(walk(k, `${id}-${i}`, depth + 1))
    }
    return node
  }
  return walk(rootObj, '0', 0)
}

/** Node and level counts of the raw (uncapped) props, for capacity(). */
function measure(raw: unknown): { nodes: number; maxKids: number; levels: number } {
  let nodes = 0
  let maxKids = 0
  let levels = 0
  const walk = (o: Record<string, unknown>, depth: number, guard: number) => {
    nodes++
    levels = Math.max(levels, depth + 1)
    const kids = objs(o.children)
    maxKids = Math.max(maxKids, kids.length)
    if (guard > 8) return
    for (const k of kids) walk(k, depth + 1, guard + 1)
  }
  const r = objs([raw])[0]
  if (r) walk(r, 0, 0)
  return { nodes, maxKids, levels }
}

const initials = (label: string) =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

export function layout(props: TreeProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const tree = readTree(props.root)
  if (!tree || !tree.label) return emptyState(ctx, 'No tree')

  const c = chartColors(ctx)
  const horizontal = enumOf(props.direction, ['TB', 'LR'] as const, 'TB') === 'LR'
  const nodeStyle = enumOf(props.nodeStyle, ['card', 'pill', 'avatar'] as const, 'card')
  const compact = props.compact === true
  const subS = mutedStyle(ctx, 'footnote')
  const lhS = lineH(subS)

  // Flatten for the tidy tree.
  const byId = new Map<string, TNode>()
  const toTree = (n: TNode): TreeNode => {
    byId.set(n.id, n)
    return { id: n.id, children: n.kids.map(toTree) }
  }
  const tt = toTree(tree)
  const levels = Math.max(...[...byId.values()].map((n) => n.depth)) + 1
  let leaves = 0
  for (const n of byId.values()) if (n.kids.length === 0) leaves++

  // Node size from the slot pitch (cross axis) and the level count (main axis).
  const mainExtent = horizontal ? W : H
  const crossExtent = horizontal ? H : W
  const pitch = crossExtent / Math.max(1, leaves)
  // Dense left-to-right trees drop to the smaller label size so one line always fits a slot.
  const bigS = style(ctx, 'caption', c.text)
  const labelS = (horizontal && pitch < lineH(bigS) + 10) || (!horizontal && pitch < 150) ? style(ctx, 'footnote', c.text) : bigS
  const lhL = lineH(labelS)
  const gapCross = clamp(pitch * 0.14, 2, 26)
  const hasSub = !compact && [...byId.values()].some((n) => n.sub)
  const wantH = (compact ? 8 : 20) + lhL * (compact ? 1 : 2) + (hasSub ? lhS : 0)
  let nodeCross: number
  let nodeMain: number
  const gapFactor = 0.9 // gap between levels as a fraction of the node's main extent
  if (!horizontal) {
    nodeCross = Math.min(pitch - gapCross, compact ? 200 : 280)
    nodeMain = Math.min(wantH, mainExtent / (levels + gapFactor * (levels - 1)))
    nodeMain = Math.max(nodeMain, Math.min(lhL + 6, mainExtent / levels))
  } else {
    nodeMain = Math.min(compact ? 190 : 270, mainExtent / (levels + 0.7 * (levels - 1)))
    const needTwo = [...byId.values()].some((n) => ctx.measureText(n.label, labelS).width * TEXT_SLACK > nodeMain - 24)
    const wantLR = (compact ? 8 : 22) + lhL * (compact || !needTwo ? 1 : 2) + (hasSub ? lhS + 2 : 0)
    nodeCross = Math.min(pitch - gapCross, wantLR)
  }
  nodeCross = Math.max(1, nodeCross)
  nodeMain = Math.max(1, nodeMain)
  const size = horizontal ? { width: nodeMain, height: nodeCross } : { width: nodeCross, height: nodeMain }
  const layoutRes = tidyTree(tt, horizontal ? 'LR' : 'TB', { x: 0, y: 0, width: W, height: H }, { nodeSize: size, minGap: 0 })
  const boxes = layoutRes.boxes
  if (!horizontal) {
    // A parent may be as wide as the leaf slots below it (never wider), so long labels keep their text.
    const leafBoxes = (n: TNode): Array<{ x: number; width: number }> => (n.kids.length === 0 ? [boxes[n.id]] : n.kids.flatMap(leafBoxes))
    for (const n of byId.values()) {
      if (n.kids.length === 0) continue
      const b = boxes[n.id]
      const ls = leafBoxes(n)
      const left = Math.min(...ls.map((l) => l.x))
      const right = Math.max(...ls.map((l) => l.x + l.width))
      const centre = b.x + b.width / 2
      const w = Math.min(compact ? 220 : 300, 2 * Math.min(centre - left, right - centre))
      if (w > b.width) boxes[n.id] = { ...b, x: centre - w / 2, width: w }
    }
  }

  const nodes: LayoutNode[] = []
  const linkColor = c.line
  let edgeNo = 0
  let itemNo = 0
  // RVM4: the depth each numbered group belongs to (an edge: its parent's), for the level slots.
  const depthOf = new Map<LayoutNode, number>()

  // Links first (drawn under the boxes).
  for (const e of layoutRes.edges) {
    const a = boxes[e.from]
    const b = boxes[e.to]
    if (!a || !b) continue
    const pts = horizontal
      ? (() => {
          const x1 = a.x + a.width
          const y1 = a.y + a.height / 2
          const x2 = b.x
          const y2 = b.y + b.height / 2
          const xm = (x1 + x2) / 2
          return [{ x: x1, y: y1 }, { x: xm, y: y1 }, { x: xm, y: y2 }, { x: x2, y: y2 }]
        })()
      : (() => {
          const x1 = a.x + a.width / 2
          const y1 = a.y + a.height
          const x2 = b.x + b.width / 2
          const y2 = b.y
          const ym = (y1 + y2) / 2
          return [{ x: x1, y: y1 }, { x: x1, y: ym }, { x: x2, y: ym }, { x: x2, y: y2 }]
        })()
    // One numbered group per link: the recipe animates `edge[*]`, the leaf keeps its id-path name.
    const g: LayoutNode = { k: 'group', part: `edge[${edgeNo++}]`, box: { x: 0, y: 0, width: W, height: H }, children: [strokePath(ctx, polyline(pts), `link[${e.to}]`, linkColor, 3)] }
    depthOf.set(g, byId.get(e.from)?.depth ?? 0)
    nodes.push(g)
  }

  const accent = c.accent
  for (const [id, b] of Object.entries(boxes)) {
    const n = byId.get(id)!
    const startLen = nodes.length
    let fill: string
    let edge: string | undefined
    let ink: string
    let subInk: string
    if (n.depth === 0) {
      fill = accent
      ink = onColor(ctx, fill)
      subInk = ink
    } else if (n.depth === 1) {
      fill = tintOf(c.surface, accent, 0.18)
      edge = accent
      ink = c.text
      subInk = c.muted
    } else {
      fill = c.track
      edge = c.line
      ink = c.text
      subInk = c.muted
    }
    const pillStyle = nodeStyle === 'pill'
    const radius = pillStyle ? b.height / 2 : Math.min(14, b.height / 3)
    nodes.push({
      k: 'rect',
      part: `node[${id}]`,
      box: b,
      fill: { type: 'solid', color: fill },
      ...(edge ? { stroke: { color: edge, width: 2 } } : {}),
      radius,
    })

    // Content box inside the node.
    const pad = b.height < 56 ? 4 : 10
    let x = b.x + pad + (pillStyle ? Math.min(10, b.height / 4) : 0)
    let w = b.width - (x - b.x) - pad - (pillStyle ? Math.min(10, b.height / 4) : 0)
    if (nodeStyle === 'avatar' && w > 150 && b.height >= 40) {
      const d = Math.min(44, b.height - 2 * pad)
      nodes.push({
        k: 'rect',
        part: `avatar[${id}]`,
        box: { x, y: b.y + (b.height - d) / 2, width: d, height: d },
        fill: { type: 'solid', color: n.depth === 0 ? ink : accent },
        radius: d / 2,
      })
      const ini = initials(n.label)
      const monoInk = n.depth === 0 ? fill : onColor(ctx, accent)
      nodes.push(...placeLines(ctx, ini, { ...labelS, color: monoInk }, { x, y: b.y + (b.height - lhL) / 2, width: d }, 'center', 1, `initials[${id}]`).nodes)
      x += d + 8
      w -= d + 8
    }
    w = Math.max(4, w)
    const wantSub = !compact && n.sub && b.height >= lhL + lhS + 10
    const subLines = wantSub ? 1 : 0
    const labelLines = clamp(Math.floor((b.height - 2 * Math.min(pad, 4) - subLines * lhS) / lhL + 1e-6), 1, 2)
    const lh = linesHeight(ctx, n.label, labelS, w, labelLines)
    const sh = subLines ? linesHeight(ctx, n.sub, subS, w, 1) : 0
    const total = lh + (sh ? 2 + sh : 0)
    const top = b.y + Math.max(0, (b.height - total) / 2)
    const align = horizontal || nodeStyle === 'avatar' ? 'start' : 'center'
    nodes.push(...placeLines(ctx, n.label, { ...labelS, color: ink }, { x, y: top, width: w }, align, labelLines, `label[${id}]`).nodes)
    if (sh) nodes.push(...placeLines(ctx, n.sub, { ...subS, color: subInk }, { x, y: top + lh + 2, width: w }, align, 1, `sub[${id}]`).nodes)
    // Everything of one node is one numbered group (`item[k]`) so the recipe can target it.
    const mine = nodes.splice(startLen)
    const g: LayoutNode = { k: 'group', part: `item[${itemNo++}]`, box: { x: 0, y: 0, width: W, height: H }, children: mine }
    depthOf.set(g, n.depth)
    nodes.push(g)
  }
  // RVM4: the tree grows level by level from the root: every node of depth d sits in `level[d]`,
  // every link leaving depth d in `links[d]` (one of each per level, links under the boxes), so the
  // recipe draws a level's links on from their parents as the next level arrives.
  const L = levels
  const box = { width: W, height: H }
  const at = (part: string, d: number) => nodes.filter((n) => n.part?.startsWith(part) && depthOf.get(n) === d)
  return root(ctx, [
    ...Array.from({ length: L }, (_, d) => slot(`links[${d}]`, box, at('edge[', d))),
    ...Array.from({ length: L }, (_, d) => slot(`level[${d}]`, box, at('item[', d))),
  ])
}

export function capacity(props: TreeProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  const m = measure(props.root)
  return capacityOf(
    {
      nodes: { max: TREE_MAX_NODES, used: m.nodes },
      children: { max: TREE_MAX_CHILDREN, used: m.maxKids },
      levels: { max: MAX_TREE_LEVELS, used: m.levels },
    },
    true,
    [
      { kind: 'truncate', slot: 'root' },
      { kind: 'paginate' },
    ]
  )
}
