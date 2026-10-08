/**
 * Pure layout for tls.g.mindmap — a centre node, topic nodes on one or both sides, subtopics beyond.
 *
 * Columns left to right (`both`): subtopics, topics, centre, topics, subtopics; `right` puts the
 * centre on the left edge and everything else to its right. Each side gets one row per subtopic
 * (a topic without subtopics gets one row), a topic is centred on its subtopics, and the row pitch
 * shrinks to fit the box. Links are cubic curves (or straight lines with `curve: false`) from the
 * parent's inner edge to the child's, coloured by branch.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { Box, CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { MindmapProps } from './schema'
import { MIND_CHILDREN_MAX, MIND_MAX } from './schema'
import { asArr, capacityOf, chartColors, clamp, emptyState, lineH, objs, onColor, pathNode, placeLines, rampColor, root, str, style, tintOf, linesHeight } from '../_kit'
import { around, slot } from '../_motion'

const f = (v: number) => String(Math.round(v * 100) / 100)

interface Branch {
  label: string
  kids: string[]
}

export function layout(props: MindmapProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const center = str(props.center).trim()
  const branches: Branch[] = objs(props.branches)
    .slice(0, MIND_MAX)
    .map((b) => ({ label: str(b.label), kids: asArr(b.children).map(str).filter((s) => s.trim() !== '').slice(0, MIND_CHILDREN_MAX) }))
  const N = branches.length
  if (!center || N < 1) return emptyState(ctx, 'Add a central idea and branches')
  const c = chartColors(ctx)
  const both = props.balance !== 'right'
  const curve = props.curve !== false
  const nodes: LayoutNode[] = []
  const links: LayoutNode[] = []

  // Sides: indices of branches on the right and the left.
  const right: number[] = []
  const left: number[] = []
  branches.forEach((_, i) => (both && i >= Math.ceil(N / 2) ? left : right).push(i))
  const slots = (idx: number[]) => Math.max(1, idx.reduce((n, i) => n + Math.max(1, branches[i].kids.length), 0))
  const maxSlots = Math.max(slots(right), left.length ? slots(left) : 0)
  const rowH = H / maxSlots

  const bigS = style(ctx, 'caption', c.text)
  const smallS = style(ctx, 'footnote', c.text)
  const kidS = rowH >= 46 ? bigS : smallS
  const branchS = rowH >= 56 ? bigS : smallS

  // Column geometry.
  const cw = clamp(W * (both ? 0.17 : 0.2), 100, 260)
  const ch = clamp(H * 0.2, Math.min(H, lineH(bigS) + 16), 110)
  const g = clamp(W * 0.035, 16, 56)
  const cBox: Box = both ? { x: (W - cw) / 2, y: (H - ch) / 2, width: cw, height: ch } : { x: 0, y: (H - ch) / 2, width: cw, height: ch }
  const avail = both ? (W - cw) / 2 : W - cw
  const bw = clamp((avail - 2 * g) * 0.45, 70, 230)
  const kw = clamp(avail - 2 * g - bw, 60, 230)

  const nodeBox = (cx0: number, y: number, w: number, h: number): Box => ({ x: cx0, y: y - h / 2, width: w, height: h })
  const link = (part: string, from: { x: number; y: number }, to: { x: number; y: number }, color: string) => {
    const mx = (from.x + to.x) / 2
    const d = curve ? `M${f(from.x)} ${f(from.y)}C${f(mx)} ${f(from.y)} ${f(mx)} ${f(to.y)} ${f(to.x)} ${f(to.y)}` : `M${f(from.x)} ${f(from.y)}L${f(to.x)} ${f(to.y)}`
    links.push(pathNode(ctx, d, part, { stroke: color, strokeWidth: 3 }))
  }
  const textIn = (box: Box, text: string, s: typeof bigS, color: string, part: string, align: 'center' | 'start' = 'center') => {
    const pad = box.height < 34 ? 4 : 10
    const w = Math.max(8, box.width - 2 * pad)
    const lines = clamp(Math.floor((box.height - 2) / lineH(s)), 1, 2)
    const h = linesHeight(ctx, text, s, w, lines)
    nodes.push(...placeLines(ctx, text, { ...s, color }, { x: box.x + pad, y: box.y + (box.height - h) / 2, width: w }, align, lines, part).nodes)
  }

  const drawSide = (idx: number[], dirSign: 1 | -1) => {
    const total = slots(idx) * rowH
    let y = (H - total) / 2
    for (const i of idx) {
      const b = branches[i]
      const color = rampColor(ctx, 'series', i, N)
      const rows = Math.max(1, b.kids.length)
      const top = y
      const kidYs = Array.from({ length: rows }, (_, k) => top + (k + 0.5) * rowH)
      const by = b.kids.length ? (kidYs[0] + kidYs[rows - 1]) / 2 : kidYs[0]
      const bh = Math.min(rowH * Math.max(1, Math.min(2, rows)) - 6, 64)
      const bx = dirSign === 1 ? cBox.x + cBox.width + g : cBox.x - g - bw
      const bBox = nodeBox(bx, by, bw, Math.max(1, Math.min(bh, rowH - 2)))
      nodes.push({ k: 'rect', part: `branch[${i}]`, box: bBox, fill: { type: 'solid', color }, radius: Math.min(16, bBox.height / 2) })
      textIn(bBox, b.label, branchS, onColor(ctx, color), `branch[${i}].label`)
      link(`link[${i}]`, { x: dirSign === 1 ? cBox.x + cBox.width : cBox.x, y: cBox.y + cBox.height / 2 }, { x: dirSign === 1 ? bBox.x : bBox.x + bBox.width, y: by }, color)
      b.kids.forEach((k, j) => {
        const kx = dirSign === 1 ? bBox.x + bBox.width + g : bBox.x - g - kw
        const kBox = nodeBox(kx, kidYs[j], kw, Math.min(56, Math.max(1, rowH - (rowH >= 40 ? 8 : 2))))
        nodes.push({ k: 'rect', part: `child[${i}][${j}]`, box: kBox, fill: { type: 'solid', color: tintOf(c.surface, color, 0.16) }, stroke: { color, width: 2 }, radius: Math.min(10, kBox.height / 2) })
        textIn(kBox, k, kidS, c.text, `child[${i}][${j}].label`)
        link(`link[${i}][${j}]`, { x: dirSign === 1 ? bBox.x + bBox.width : bBox.x, y: by }, { x: dirSign === 1 ? kBox.x : kBox.x + kBox.width, y: kidYs[j] }, color)
      })
      y += rows * rowH
    }
  }
  drawSide(right, 1)
  if (left.length) drawSide(left, -1)

  // centre last so its edge covers the link starts
  const cFill = c.accent
  nodes.push({ k: 'rect', part: 'center', box: cBox, fill: { type: 'solid', color: cFill }, radius: cBox.height / 2 })
  textIn(cBox, center, bigS, onColor(ctx, cFill), 'center.label')
  return root(ctx, slotBranches([...links, ...nodes], ctx.box.width, ctx.box.height))
}

export function capacity(props: MindmapProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  const bs = objs(props.branches)
  const kids = Math.max(0, ...bs.map((b) => asArr(b.children).length))
  return capacityOf({ branches: { max: MIND_MAX, used: bs.length }, subtopics: { max: MIND_CHILDREN_MAX, used: kids } }, true, [
    { kind: 'truncate', slot: 'branches' },
    { kind: 'paginate' },
  ])
}

/**
 * RVM4: motion slots, branch by branch from the centre. Branch i is four slots, emitted for every
 * branch: its link from the centre (`arm[i]`), its topic box with the label (`topic[i]`, a tight
 * group so it settles about its own centre), the links to its sub-topics (`twigs[i]`) and the
 * sub-topics (`kids[i]`). Links stay under the boxes; leaf names and positions are unchanged.
 */
function slotBranches(all: LayoutNode[], width: number, height: number): LayoutNode[] {
  const box = { width: Math.max(0, width), height: Math.max(0, height) }
  const branchOf = (re: RegExp) => (n: LayoutNode) => {
    const m = re.exec(n.part ?? '')
    return m ? Number(m[1]) : -1
  }
  const arm = branchOf(/^link\[(\d+)\]$/)
  const twig = branchOf(/^link\[(\d+)\]\[\d+\]$/)
  const topic = branchOf(/^branch\[(\d+)\](?:\.label)?$/)
  const kid = branchOf(/^child\[(\d+)\]\[\d+\](?:\.label)?$/)
  const n = Math.max(0, ...all.map((x) => topic(x) + 1))
  const range = Array.from({ length: n }, (_, i) => i)
  const rest = all.filter((x) => arm(x) < 0 && twig(x) < 0 && topic(x) < 0 && kid(x) < 0)
  return [
    ...range.map((i) => slot(`arm[${i}]`, box, all.filter((x) => arm(x) === i))),
    ...range.map((i) => slot(`twigs[${i}]`, box, all.filter((x) => twig(x) === i))),
    ...rest,
    ...range.map((i) => around(`topic[${i}]`, all.filter((x) => topic(x) === i))),
    ...range.map((i) => slot(`kids[${i}]`, box, all.filter((x) => kid(x) === i))),
  ]
}
