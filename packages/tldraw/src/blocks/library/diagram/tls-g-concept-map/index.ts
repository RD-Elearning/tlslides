/**
 * tls.g.concept-map — spro sprint 2026-11b S09-6: 4–9 concepts and the labelled links between them,
 * laid out automatically (no coordinates in props).
 *
 * `radial`: the most linked concept in the centre, the others round it in link order; `layered`: rows
 * by link depth from the concepts nothing points to; `cluster`: a grid in link order. Links are lines
 * (bent round any node in their way, never through one) with an arrow head; a link label sits in the
 * gap beside its own line, ≥ 8 units from every line and never on a node (`_geo.ts` `placeLabel`).
 * Links that name an unknown id are dropped from the drawing and reported by `lint` as validation
 * errors (the model's error goes back to it, never patched).
 */
import type { BlockDefinition, BlockSchema, Box, CapacityReport, LayoutContext, LayoutNode, LintFinding, MotionRecipe, TypeToken } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'
import { arrowHead, asArr, capacityOf, chartColors, clamp, emptyState, enumOf, linesHeight, objs, onColor, placeLines, root, showsWhole, str, strokePath, style, mutedStyle, tierStart, tintOf, lineH } from '../_kit'
import { slot, STEP, WIRE_AFTER, TIP_AFTER, LABEL_AFTER } from '../_motion'
import { boxesOverlap, clearance, curve, edgePoint, placeLabel, type Pt } from '../_geo'

export const CONCEPT_MAX = 9
export const LINK_MAX = 14
const VARIANTS = ['radial', 'layered', 'cluster'] as const

export interface ConceptMapProps extends Record<string, unknown> {
  nodes: Array<{ id: string; label: string; detail?: string }>
  links: Array<{ from: string; to: string; label?: string }>
  variant?: (typeof VARIANTS)[number]
}

const obj = (fields: Record<string, { kind: 'text'; maxChars: number }>, req: string[]) => ({
  kind: 'object' as const,
  fields: Object.fromEntries(Object.entries(fields).map(([k, t]) => [k, { type: t, role: 'content' as const, label: k, ...(req.includes(k) ? { required: true } : {}) }])),
})

export const schema: BlockSchema = {
  nodes: {
    type: { kind: 'list', of: obj({ id: { kind: 'text', maxChars: 24 }, label: { kind: 'text', maxChars: 32 }, detail: { kind: 'text', maxChars: 70 } }, ['id', 'label']), min: 4, max: CONCEPT_MAX },
    role: 'content',
    label: 'Concepts',
    required: true,
    guidance: 'Each: a short unique `id`, `label` (≤ 32), optional `detail` (≤ 70).',
  },
  links: {
    type: { kind: 'list', of: obj({ from: { kind: 'text', maxChars: 24 }, to: { kind: 'text', maxChars: 24 }, label: { kind: 'text', maxChars: 24 } }, ['from', 'to']), min: 3, max: LINK_MAX },
    role: 'content',
    label: 'Links',
    required: true,
    guidance: '`from` / `to` = concept ids (must exist), `label` = the relation as a verb phrase (≤ 24), e.g. "produces", "is part of".',
  },
  variant: enumSlot([...VARIANTS], 'Layout', 'radial (default: the most linked concept in the centre), layered (rows by link depth) or cluster (a grid).'),
}

export const defaults: ConceptMapProps = {
  nodes: [
    { id: 'p', label: 'Photosynthesis', detail: 'How plants make food' },
    { id: 'l', label: 'Light' },
    { id: 'w', label: 'Water' },
    { id: 'c', label: 'Carbon dioxide' },
    { id: 's', label: 'Sugar', detail: 'Stored as starch' },
    { id: 'o', label: 'Oxygen' },
  ],
  links: [
    { from: 'l', to: 'p', label: 'powers' },
    { from: 'w', to: 'p', label: 'feeds' },
    { from: 'c', to: 'p', label: 'feeds' },
    { from: 'p', to: 's', label: 'makes' },
    { from: 'p', to: 'o', label: 'releases' },
  ],
  variant: 'radial',
}

type Node = { id: string; label: string; detail: string }
type Link = { from: number; to: number; label: string }

function model(p: ConceptMapProps): { nodes: Node[]; links: Link[] } {
  const nodes: Node[] = []
  const index = new Map<string, number>()
  for (const n of objs(p.nodes)) {
    const id = str(n.id).trim()
    if (!id || index.has(id) || nodes.length >= CONCEPT_MAX) continue
    index.set(id, nodes.length)
    nodes.push({ id, label: str(n.label).slice(0, 32), detail: str(n.detail).slice(0, 70) })
  }
  const links: Link[] = []
  const seen = new Set<string>()
  for (const l of objs(p.links).slice(0, LINK_MAX)) {
    const a = index.get(str(l.from).trim())
    const b = index.get(str(l.to).trim())
    if (a === undefined || b === undefined || a === b || seen.has(`${a}>${b}`)) continue
    seen.add(`${a}>${b}`)
    links.push({ from: a, to: b, label: str(l.label).slice(0, 24) })
  }
  return { nodes, links }
}

/** Concepts in link order (breadth first from the most linked one), each with its depth. */
function order(n: number, links: Link[]): { hub: number; seq: number[]; depth: number[] } {
  const deg = Array(n).fill(0)
  const adj: number[][] = Array.from({ length: n }, () => [])
  links.forEach((l) => {
    deg[l.from]++
    deg[l.to]++
    adj[l.from].push(l.to)
    adj[l.to].push(l.from)
  })
  const hub = deg.indexOf(Math.max(...deg))
  const seq: number[] = []
  const depth = Array(n).fill(-1)
  const sources = Array.from({ length: n }, (_, i) => i).filter((i) => !links.some((l) => l.to === i) && links.some((l) => l.from === i))
  const bfs = (starts: number[]) => {
    const q = starts.filter((s) => depth[s] < 0)
    q.forEach((s) => (depth[s] = 0))
    while (q.length) {
      const i = q.shift()!
      seq.push(i)
      for (const j of links.filter((l) => l.from === i).map((l) => l.to).concat(adj[i])) if (depth[j] < 0) {
        depth[j] = depth[i] + 1
        q.push(j)
      }
    }
  }
  bfs(sources.length ? sources : [hub])
  for (let i = 0; i < n; i++) if (depth[i] < 0) bfs([i])
  return { hub, seq, depth }
}

type Tier = { label: TypeToken; detail: TypeToken; link: TypeToken; nw: number }
const TIERS: readonly Tier[] = [
  { label: 'lead', detail: 'body', link: 'body', nw: 300 },
  { label: 'body', detail: 'caption', link: 'caption', nw: 260 },
  { label: 'caption', detail: 'footnote', link: 'footnote', nw: 220 },
]

export function layout(props: ConceptMapProps, ctx: LayoutContext): LayoutNode {
  const own = enumOf(props.variant, VARIANTS, 'radial')
  // the authored layout at the largest type that draws clean; else the other layouts (a clean map
  // beats the authored arrangement); else the authored one at the smallest type
  for (const v of [own, ...VARIANTS.filter((x) => x !== own)]) {
    for (const t of TIERS.slice(tierStart(ctx, TIERS.length))) {
      const node = layoutTier({ ...props, variant: v }, ctx, t)
      if (node) return node
    }
  }
  return layoutTier(props, ctx, null) as LayoutNode
}

function layoutTier(props: ConceptMapProps, ctx: LayoutContext, pick: Tier | null): LayoutNode | null {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const { nodes, links } = model(props)
  const N = nodes.length
  if (N < 1) return emptyState(ctx, 'No concepts')
  const tier = pick ?? TIERS[TIERS.length - 1]
  const c = chartColors(ctx)
  const accent = ctx.resolveColor('accent').color
  const variant = enumOf(props.variant, VARIANTS, 'radial')
  const { hub, seq, depth } = order(N, links)
  const lS = style(ctx, tier.label, c.text)
  const dS = mutedStyle(ctx, tier.detail)
  const kS = mutedStyle(ctx, tier.link)
  const pad = 12
  const cols = variant === 'cluster' ? (N <= 4 ? 2 : N <= 6 ? 3 : W > 1300 ? 4 : 3) : 0
  // layered rows: depth rows, a row wider than the box wrapped into rows of `perRow`
  const perRow = Math.max(2, Math.floor(W / 190))
  const layers: number[][] = []
  if (variant === 'layered') {
    const byDepth: number[][] = []
    seq.forEach((i) => (byDepth[depth[i]] ??= []).push(i))
    for (const row of byDepth.filter(Boolean)) for (let k = 0; k < row.length; k += perRow) layers.push(row.slice(k, k + perRow))
  }
  const widest = variant === 'layered' ? Math.max(...layers.map((r) => r.length)) : variant === 'cluster' ? cols : 3
  const nw = clamp(Math.min(variant === 'cluster' ? W / cols - 72 : W * 0.2, W / widest - 48), 110, tier.nw)
  const iw = nw - 2 * pad
  const nh = nodes.map((n) => 2 * pad + linesHeight(ctx, n.label, lS, iw, 2) + (n.detail ? 4 + linesHeight(ctx, n.detail, dS, iw, 3) : 0))
  const hmax = Math.max(...nh)

  // centres
  const C: Pt[] = Array(N)
  if (variant === 'radial') {
    const ring = seq.filter((i) => i !== hub)
    C[hub] = { x: W / 2, y: H / 2 }
    const rx = Math.max(0, (W - nw) / 2)
    const ry = Math.max(0, (H - hmax) / 2)
    ring.forEach((i, k) => {
      const t = -Math.PI / 2 + (k * 2 * Math.PI) / Math.max(1, ring.length)
      C[i] = { x: W / 2 + rx * Math.cos(t), y: H / 2 + ry * Math.sin(t) }
    })
  } else if (variant === 'layered') {
    const rowH = H / layers.length
    layers.forEach((row, r) => {
      const colW = W / row.length
      // a row's nodes alternate a little up and down, so a link between two of them clears the others
      row.forEach((i, k) => (C[i] = { x: colW * (k + 0.5), y: rowH * (r + 0.5) + (row.length > 2 ? (k % 2 ? 1 : -1) * Math.min(rowH * 0.12, 24) : 0) }))
    })
  } else {
    const rowsN = Math.ceil(N / cols)
    seq.forEach((i, k) => {
      const r = Math.floor(k / cols)
      const inRow = r === rowsN - 1 ? N - r * cols : cols
      const colW = W / inRow
      C[i] = { x: colW * ((k % cols) + 0.5), y: (H / rowsN) * (r + 0.5) }
    })
  }
  const boxes: Box[] = nodes.map((_, i) => ({ x: clamp(C[i].x - nw / 2, 0, W - nw), y: clamp(C[i].y - nh[i] / 2, 0, Math.max(0, H - nh[i])), width: nw, height: nh[i] }))
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (boxesOverlap(boxes[i], boxes[j], 32)) {
    if (pick) return null
  }
  const centre = (b: Box): Pt => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })

  // links: straight, else bent round the nodes in their way
  const paths = links.map((l) => {
    const A = boxes[l.from]
    const B = boxes[l.to]
    let chosen: ReturnType<typeof curve> | undefined
    let bestClear = -1
    for (const bend of [0, 0.18, -0.18, 0.32, -0.32, 0.5, -0.5]) {
      const a0 = edgePoint(A, centre(B), 6)
      const b0 = edgePoint(B, centre(A), 8)
      const k = curve(a0, b0, bend)
      const a = edgePoint(A, k.at(0.12), 6)
      const b = edgePoint(B, k.at(0.88), 8)
      const cv = curve(a, b, bend)
      const inside = cv.points.every((q) => q.x >= 0 && q.y >= 0 && q.x <= W && q.y <= H)
      const clear = Math.min(Infinity, ...boxes.filter((_, i) => i !== l.from && i !== l.to).map((bx) => clearance(bx, cv.points)))
      if (inside && clear >= 8) {
        chosen = cv
        bestClear = clear
        break
      }
      if (inside && clear > bestClear) {
        chosen = cv
        bestClear = clear
      }
      chosen ??= cv
    }
    return { path: chosen!, clean: bestClear >= 8 }
  })
  if (pick && paths.some((p) => !p.clean)) return null
  const lines = paths.map((p) => p.path.points)
  const out: LayoutNode[] = []
  const placed: Box[] = []
  const linkNodes: LayoutNode[][] = links.map(() => [])
  let ok = true
  links.forEach((l, k) => {
    const p = paths[k].path
    linkNodes[k].push(strokePath(ctx, p.d, `link[${k}]`, c.muted, 2))
    const tip = p.at(1)
    const tg = p.tangent(1)
    linkNodes[k].push(arrowHead(ctx, tip, tg.x, tg.y, 12, c.muted, `link[${k}].head`))
    if (!l.label) return
    const w = Math.min(200, Math.ceil(ctx.measureText(l.label, kS).width) + 4)
    const h = linesHeight(ctx, l.label, kS, w, 2)
    const spot = placeLabel(w, h, p, lines, [...boxes, ...placed], { x: 0, y: 0, width: W, height: H })
    if (spot.clear < 8) ok = false
    placed.push(spot.box)
    linkNodes[k].push(...placeLines(ctx, l.label, kS, { x: spot.box.x, y: spot.box.y, width: w }, 'center', 2, `linkLabel[${k}]`).nodes)
  })
  if (pick && !ok) return null
  nodes.forEach((n, i) => {
    const b = boxes[i]
    const isHub = variant === 'radial' && i === hub
    const fill = isHub ? accent : tintOf(c.surface, accent, 0.1)
    const ink = isHub ? onColor(ctx, accent) : c.text
    const kids: LayoutNode[] = [{ k: 'rect', part: `node[${i}]`, box: b, fill: { type: 'solid', color: fill }, stroke: { color: accent, width: 2 }, radius: 14 }]
    const lh = linesHeight(ctx, n.label, lS, iw, 2)
    const total = lh + (n.detail ? 4 + linesHeight(ctx, n.detail, dS, iw, 3) : 0)
    const y0 = b.y + (b.height - total) / 2
    kids.push(...placeLines(ctx, n.label, { ...lS, color: ink }, { x: b.x + pad, y: y0, width: iw }, 'center', 2, `label[${i}]`).nodes)
    if (n.detail) kids.push(...placeLines(ctx, n.detail, isHub ? { ...dS, color: ink } : dS, { x: b.x + pad, y: y0 + lh + 4, width: iw }, 'center', 3, `detail[${i}]`).nodes)
    out.push(slot(`concept[${i}]`, { width: W, height: H }, kids))
  })
  linkNodes.forEach((kids, k) => out.push(slot(`wire[${k}]`, { width: W, height: H }, kids)))
  void lineH
  const tree = root(ctx, out)
  return pick && !showsWhole(ctx, tree) ? null : tree
}

export function capacity(props: ConceptMapProps): CapacityReport {
  return capacityOf({ nodes: { max: CONCEPT_MAX, used: asArr(props.nodes).length }, links: { max: LINK_MAX, used: asArr(props.links).length } }, true, [
    { kind: 'reflow', to: 'tls.c.cards' },
    { kind: 'truncate', slot: 'nodes' },
  ])
}

/** Links that name an id no concept has, and repeated ids: validation errors (never patched). */
export function lint(props: ConceptMapProps): LintFinding[] {
  const ids = new Set<string>()
  const out: LintFinding[] = []
  objs(props.nodes).forEach((n, i) => {
    const id = str(n.id).trim()
    if (ids.has(id)) out.push({ level: 'error', rule: 'concept-map/duplicate-id', part: `nodes[${i}].id`, message: `Concept id "${id}" is used twice; every concept needs its own id.` })
    ids.add(id)
  })
  objs(props.links).forEach((l, i) => {
    for (const end of ['from', 'to'] as const) {
      const id = str(l[end]).trim()
      if (!ids.has(id)) out.push({ level: 'error', rule: 'concept-map/unknown-id', part: `links[${i}].${end}`, message: `Link ${i + 1} "${end}" names "${id}", which is not a concept id (ids: ${[...ids].join(', ')}).` })
    }
  })
  return out
}

export const motion: MotionRecipe = {
  parts: ['concept[*]', 'wire[*]'],
  preset: 'sweep-nodes',
  partMotion: {
    'concept[*]': { preset: 'field-in', delay: 0, stagger: STEP },
    'wire[*]': { preset: 'sweep-nodes', delay: WIRE_AFTER + TIP_AFTER + LABEL_AFTER, stagger: STEP / 2 },
  },
}

export const tlsGConceptMap: BlockDefinition = {
  type: 'tls.g.concept-map',
  name: 'Concept map',
  family: 'diagram',
  tier: 'A',
  summary: '4–9 concepts joined by labelled links (what each relation is), laid out automatically.',
  keywords: ['concept map', 'relations', 'network', 'links', 'bản đồ khái niệm', 'sơ đồ tư duy', 'mối quan hệ'],
  category: 'relationship',
  scope: 'group',
  shortDescription: 'Concepts joined by labelled links',
  related: ['tls.g.mindmap', 'tls.g.hub-spoke', 'tls.g.tree', 'tls.g.cause-chain'],
  describe: {
    when: 'Concepts and how they relate, where each relation has a name ("produces", "is part of"): a concept map of a topic.',
    avoid: 'A plain hierarchy: tls.g.tree. One centre with spokes and no named links: tls.g.hub-spoke. Causes and effects: tls.g.cause-chain.',
    example: { id: 'b_concept_map', type: 'tls.g.concept-map', props: { nodes: defaults.nodes, links: defaults.links } },
  },
  schema,
  defaults,
  size: { preferred: [1400, 760], min: [900, 560] },
  lintIsValidation: true,
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
  lint: lint as BlockDefinition['lint'],
}
