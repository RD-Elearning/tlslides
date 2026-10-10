/**
 * CMP2 — the layout oracle sees inside compositions (composition README §2 CMP2).
 *
 * `inspectBlock` reads a slide-level block's laid-out tree and finds its **authored** nested
 * children — the specs in a `blocks` slot (`props.children`, …) of an authored block, matched to
 * the wrapper groups `layoutChild` stamps with `blockId` / `type` (CMP1 X2); a container's own
 * internal wrappers (a card's `$stack`, a composite's spec tree) stay part of their block. Every
 * child becomes a sub-block with an id path (`g1/c2/b1`, the slide-level id first), its box, its
 * painted extent and its text, and every text / icon leaf is attributed to its innermost owner.
 *
 * The design checks run on those sub-blocks and on the paint model (`layout/paint-model.ts`):
 *
 * | code | sev | rule |
 * |---|---|---|
 * | `contrast/low` | error | a text leaf below 4.5:1 (3:1 from 36 units, or bold from 28; icons 3:1) on the paint actually under it — fills, gradients, translucent glass blended over what is behind, the slide background; an image counts as both black and white, so text on a photo needs a scrim |
 * | `layout/misaligned` | warning | peers (same-type children of a row / grid, side by side) whose matching text starts drift > 4 units vertically (or, stacked in a column, horizontally) |
 * | `layout/unequal-peers` | warning | peers side by side whose box (painted, for a card) widths or heights differ by > 5 % |
 * | `layout/narrow-child` | warning | a nested child's text wraps (≥ 2 lines) at < 12 characters per line, or in a box < 240 units wide |
 * | `nesting/too-deep` | warning | an LLM-authored slide (`AnalyzeSlideOptions.llmAuthored`) nests more than 3 authored levels |
 * | `type/too-many-sizes` | warning | more than 5 distinct text sizes on the slide |
 * | `accent/overuse` | warning | more accent-coloured uses (text, icon or fill leaves; one per part family per block) than the deck style's family allows |
 * | `text/long-measure` | info | a wrapping body paragraph (≤ 40 units) over 75 characters per line |
 * | `motion/stagger-total` | warning | one part's stagger (step × (items − 1)) over 400 ms |
 * | `motion/too-many-heroes` | warning | more than 2 blocks with a showy reveal (`count-up`, `words-in`, `sweep`) on a slide |
 *
 * Findings about peers are grouped into one line ("3 of 3 tls.l.card in g1 (c1, c2, c3): …"), so a
 * repair prompt (S4.1) gets one line per problem, not one per card. Pure and DOM-free.
 */

import type { BlockDefinition, BlockSpec, Box, DeckStyle, LayoutNode, Pt, ResolvedTokens } from './types'
import type { BlockRegistry } from './registry'
import { blockLayer } from './block-layer'
import { collectPaint, floorOf, hexOf, inkContrast, parseInk, type Background, type InkLeaf, type PaintOp } from './layout/paint-model'
import { relativeLuminance, rgbToHsl, solveForContrast } from './color-math'
import { resolveBlockMotion, resolvePartMotion } from './motion/resolve-motion'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Thresholds                                                                       */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** CMP2 thresholds. Tighten only (a ratchet, like the oracle's own). */
export const DESIGN_THRESHOLDS = {
  /** `layout/misaligned`: drift of matching starts, units (visual-review S4). */
  alignDrift: 4,
  /** `layout/unequal-peers`: size spread between peers (visual-review S5). */
  peerSpread: 0.05,
  /** `layout/narrow-child`: characters per line of a wrapping text child. */
  narrowChars: 12,
  /** `layout/narrow-child`: box width of a wrapping text child, units. */
  narrowWidth: 240,
  /** `nesting/too-deep`: authored levels an LLM-authored slide may use (region block = 1). */
  llmDepth: 3,
  /** `type/too-many-sizes`: distinct text sizes per slide (P5); sizes within 1 unit are one. */
  typeSizes: 5,
  /** `text/long-measure`: characters per line of wrapping body text (U6). */
  measureChars: 75,
  /** `text/long-measure`: only text up to this size (body / lead) is body text. */
  measureMaxSize: 40,
  /** `motion/stagger-total`: ms (05-motion §5.9, T2). */
  staggerTotal: 400,
  /** `motion/too-many-heroes`: showy reveals per slide (U4: 1–2 key elements). */
  heroes: 2,
  /** `contrast/low`: ink this translucent (alpha × opacity) is decoration (a watermark), not text. */
  decorativeAlpha: 0.3,
} as const

/** `accent/overuse`: accent uses a slide may make, per deck-style family (P10; luxury and
 *  editorial say "one accent", playful styles are colourful by design). No style: `default`. */
export const ACCENT_BUDGET: Record<DeckStyle['family'] | 'default', number> = {
  premium: 4,
  professional: 6,
  modern: 6,
  playful: 10,
  default: 6,
}

/** Presets that make a reveal showy (verySlow, not a plain text reveal; 05-motion §5.9). */
export const SHOWY_PRESETS: ReadonlySet<string> = new Set(['count-up', 'words-in', 'sweep'])

/** Containers whose children are peers (laid side by side / in a grid). */
const PEER_CONTAINERS: ReadonlySet<string> = new Set(['tls.l.row', 'tls.l.grid'])

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Sub-blocks                                                                       */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** An authored nested child of a slide-level block, in slide coordinates. */
export interface SubBlock {
  id: string
  /** `top/child/grandchild`. */
  path: string
  type: string
  /** Path of the parent (the slide-level id for a direct child). */
  parent: string
  /** Authored nesting level: the slide-level block is 1, its children 2. */
  level: number
  layer: 'backdrop' | 'content' | 'overlay'
  /** Paint order among its siblings (0 = first). */
  order: number
  box: Box
  /** The wrapper group's node (local coordinates under `box`). */
  node: Extract<LayoutNode, { k: 'group' }>
  spec: BlockSpec
}

export interface BlockInspection {
  subs: SubBlock[]
  /** Owner path per text leaf, in `collectPaintedLeaves` order. */
  textOwners: string[]
  /** Text alignment per text leaf (same order). */
  textAlign: Array<'start' | 'center' | 'end'>
  ops: PaintOp[]
  inks: InkLeaf[]
  /** Owner paths, indexed by `PaintOp.owner` / `InkLeaf.owner`. */
  owners: string[]
}

/** The authored child specs of a block: every `blocks`-kind slot and `children`. */
export function authoredChildren(def: BlockDefinition | undefined, props: Record<string, unknown> | undefined): BlockSpec[] {
  if (!props || typeof props !== 'object') return []
  const slots = new Set<string>(['children'])
  for (const [name, slot] of Object.entries(def?.schema ?? {})) if (slot?.type?.kind === 'blocks') slots.add(name)
  const out: BlockSpec[] = []
  for (const name of slots) {
    const v = props[name]
    if (Array.isArray(v)) for (const c of v) if (c && typeof c === 'object' && typeof (c as BlockSpec).type === 'string') out.push(c as BlockSpec)
  }
  return out
}

/**
 * Find the authored sub-blocks of a laid-out slide-level block and attribute its paint and ink.
 * `box` is the block's slide box (the tree's origin).
 */
export function inspectBlock(root: LayoutNode, box: Box, spec: BlockSpec, registry: BlockRegistry): BlockInspection {
  const owners: string[] = [spec.id]
  const subs: SubBlock[] = []
  interface Owner {
    path: string
    level: number
    pending: BlockSpec[]
    used: Set<BlockSpec>
    count: number
  }
  const state: Owner[] = [{ path: spec.id, level: 1, pending: authoredChildren(registry.get(spec.type), spec.props as Record<string, unknown>), used: new Set(), count: 0 }]
  const { ops, inks } = collectPaint(root, {
    origin: { x: box.x, y: box.y },
    rootOwner: 0,
    owner: (group, abs, parent) => {
      if (!group.blockId || !group.type) return undefined
      const ownerState = state[parent ?? 0]
      const match = ownerState.pending.find((c) => c.id === group.blockId && c.type === group.type && !ownerState.used.has(c))
      if (!match) return undefined
      ownerState.used.add(match)
      const def = registry.get(match.type)
      const path = `${ownerState.path}/${match.id}`
      owners.push(path)
      state.push({ path, level: ownerState.level + 1, pending: authoredChildren(def, match.props as Record<string, unknown>), used: new Set(), count: 0 })
      subs.push({
        id: match.id,
        path,
        type: match.type,
        parent: ownerState.path,
        level: ownerState.level + 1,
        layer: blockLayer(match, def),
        order: ownerState.count++,
        box: abs,
        node: group,
        spec: match,
      })
      return owners.length - 1
    },
  })
  const texts = inks.filter((i) => i.kind === 'text').sort((a, b) => a.textIndex - b.textIndex)
  return {
    subs,
    textOwners: texts.map((t) => owners[t.owner ?? 0]),
    textAlign: texts.map((t) => (t.node.k === 'text' ? t.node.align ?? 'start' : 'start')),
    ops,
    inks,
    owners,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Finding drafts and grouping                                                      */
/* ─────────────────────────────────────────────────────────────────────────────── */

export type DesignCode =
  | 'contrast/low'
  | 'layout/misaligned'
  | 'layout/unequal-peers'
  | 'layout/narrow-child'
  | 'nesting/too-deep'
  | 'type/too-many-sizes'
  | 'accent/overuse'
  | 'text/long-measure'
  | 'motion/stagger-total'
  | 'motion/too-many-heroes'

export const DESIGN_CODES: readonly DesignCode[] = [
  'contrast/low',
  'layout/misaligned',
  'layout/unequal-peers',
  'layout/narrow-child',
  'nesting/too-deep',
  'type/too-many-sizes',
  'accent/overuse',
  'text/long-measure',
  'motion/stagger-total',
  'motion/too-many-heroes',
]

export interface DesignFinding {
  code: DesignCode
  severity: 'error' | 'warning' | 'info'
  blockIds: string[]
  message: string
  fix?: string
}

/** A per-child finding before grouping: siblings of one type with the same problem merge. */
interface Draft extends DesignFinding {
  /** Grouping: parent path + child type + problem kind. Absent = never grouped. */
  group?: { parent: string; type: string; kind: string; id: string; siblings: number }
  /** The message without the child's own path prefix (for the grouped line). */
  body?: string
}

const short = (type: string) => type.replace(/^tls\.[a-z]\./, '')

/** Merge drafts that share a group key: "3 of 3 card in g1 (c1, c2, c3): <first body>". */
function groupDrafts(drafts: Draft[]): DesignFinding[] {
  const out: DesignFinding[] = []
  const seen = new Map<string, Draft[]>()
  const order: Array<Draft | string> = []
  for (const d of drafts) {
    if (!d.group) {
      order.push(d)
      continue
    }
    const key = `${d.code}|${d.severity}|${d.group.parent}|${d.group.type}|${d.group.kind}`
    if (!seen.has(key)) {
      seen.set(key, [])
      order.push(key)
    }
    seen.get(key)!.push(d)
  }
  for (const item of order) {
    if (typeof item !== 'string') {
      out.push(strip(item))
      continue
    }
    const list = seen.get(item)!
    if (list.length === 1) {
      out.push(strip(list[0]))
      continue
    }
    const g = list[0].group!
    const ids = list.map((d) => d.group!.id)
    out.push({
      code: list[0].code,
      severity: list[0].severity,
      blockIds: [...new Set(list.flatMap((d) => d.blockIds))],
      message: `${list.length} of ${g.siblings} ${short(g.type)} in ${g.parent} (${ids.join(', ')}): ${list[0].body ?? list[0].message}`,
      ...(list[0].fix ? { fix: list[0].fix } : {}),
    })
  }
  return out
}

function strip(d: Draft): DesignFinding {
  return { code: d.code, severity: d.severity, blockIds: d.blockIds, message: d.message, ...(d.fix ? { fix: d.fix } : {}) }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Inputs                                                                           */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** One slide-level block as the design checks need it (built by `analyzeSlide`). */
export interface DesignBlock {
  id: string
  type: string
  layer: 'backdrop' | 'content' | 'overlay'
  z: number
  /** A style master's block (decoration owned by the deck style). */
  styleOwned: boolean
  box: Box
  spec: BlockSpec
  /** The spec as compiled (its motion: authored, else the slide style's). */
  motion?: BlockSpec['motion']
  root?: LayoutNode
  inspection?: BlockInspection
  /** Text leaves (slide coordinates), in `collectPaintedLeaves` order. */
  text: Array<{
    part?: string
    propPath?: string
    lines: number
    fontSize: number
    scale: number
    chars: number
    charsPerLine: number
    box: Box
    painted: Box
  }>
}

export interface DesignContext {
  frame: { width: number; height: number }
  tokens: ResolvedTokens
  registry: BlockRegistry
  /** The slide background at a point (`null` = a photo). */
  background: (p: Pt) => Background
  /** The deck style's family (accent budget). */
  family?: DeckStyle['family']
  llmAuthored?: boolean
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* The checks                                                                       */
/* ─────────────────────────────────────────────────────────────────────────────── */

export function designFindings(blocks: DesignBlock[], ctx: DesignContext): DesignFinding[] {
  const drafts: Draft[] = []
  const ordered = [...blocks].sort((a, b) => a.z - b.z)
  contrastChecks(ordered, ctx, drafts)
  for (const b of blocks) {
    // a style master's decoration is the style's, not the slide author's
    if (!b.inspection || b.styleOwned) continue
    peerChecks(b, drafts)
    narrowChecks(b, drafts)
    if (ctx.llmAuthored) depthCheck(b, drafts)
  }
  typeSizeCheck(blocks, drafts)
  accentCheck(blocks, ctx, drafts)
  measureChecks(blocks, drafts)
  motionChecks(blocks, ctx, drafts)
  return groupDrafts(drafts)
}

const r = Math.round
const fmtRatio = (x: number) => `${Math.floor(x * 10) / 10}:1`

/** Who owns a leaf, and the group key for a child. */
function ownerOf(b: DesignBlock, idx: number | undefined): { path: string; sub?: SubBlock } {
  const ins = b.inspection
  if (!ins || idx === undefined) return { path: b.id }
  const path = ins.owners[idx] ?? b.id
  return { path, sub: ins.subs.find((s) => s.path === path) }
}

function siblingsOf(b: DesignBlock, sub: SubBlock): number {
  return (b.inspection?.subs ?? []).filter((s) => s.parent === sub.parent && s.type === sub.type).length
}

function partName(ink: InkLeaf): string {
  return ink.kind === 'icon' ? ink.node.part ?? 'icon' : (ink.node.k === 'text' ? ink.node.propPath ?? ink.node.part : undefined) ?? 'text'
}

/** `contrast/low`: every text / icon leaf against the paint under it (all blocks, z order). */
function contrastChecks(blocks: DesignBlock[], ctx: DesignContext, out: Draft[]): void {
  const all: PaintOp[] = []
  const offsets = new Map<DesignBlock, number>()
  for (const b of blocks) {
    // A decoration's image is a texture (a pattern's grain tile, mostly transparent), not a photo:
    // it is left out of what text sits on. A photo backdrop is a media block (`tls.m.image`).
    const texture = ctx.registry.get(b.type)?.category === 'decoration'
    const ops = b.inspection ? (texture ? b.inspection.ops.map((op) => (op.kind === 'unknown' ? { ...op, alpha: 0 } : op)) : b.inspection.ops) : []
    offsets.set(b, all.length)
    all.push(...ops)
  }
  for (const b of blocks) {
    if (!b.inspection || b.layer === 'backdrop' || b.styleOwned) continue
    const off = offsets.get(b) ?? 0
    // worst failing leaf per owner
    const worst = new Map<string, { ink: InkLeaf; ratio: number; floor: number; color: string; bg: string; unknown: boolean; count: number }>()
    for (const ink of b.inspection.inks) {
      if (ink.alpha < DESIGN_THRESHOLDS.decorativeAlpha) continue
      const floor = floorOf(ink)
      const c = inkContrast(ink, all, ctx.background, off + ink.below)
      if (!c) continue
      const colourAlpha = parseInk(c.color)?.alpha ?? 1
      if (colourAlpha * ink.alpha < DESIGN_THRESHOLDS.decorativeAlpha) continue
      if (c.ratio >= floor - 1e-6) continue
      const { path } = ownerOf(b, ink.owner)
      const prev = worst.get(path)
      const entry = { ink, ratio: c.ratio, floor, color: c.color, bg: hexOf(c.bg), unknown: c.overUnknown, count: (prev?.count ?? 0) + 1 }
      if (!prev || c.ratio / floor < prev.ratio / prev.floor) worst.set(path, entry)
      else prev.count++
    }
    for (const [path, w] of worst) {
      const { sub } = ownerOf(b, w.ink.owner)
      const part = partName(w.ink)
      const what = w.ink.kind === 'icon' ? 'icon' : `\`${part}\``
      const more = w.count > 1 ? ` (+${w.count - 1} more leaf${w.count > 2 ? 's' : ''})` : ''
      const body = w.unknown
        ? `${what} sits on a photo with no scrim dark or light enough: worst ${fmtRatio(w.ratio)} (needs ${w.floor}:1)${more}`
        : `${what} ${w.color} on ${w.bg} is ${fmtRatio(w.ratio)} (needs ${w.floor}:1${w.ink.kind === 'text' ? ` at ${r(w.ink.fontSize)} units` : ''})${more}`
      const solved = w.unknown ? undefined : solveForContrast(parseInk(w.color) ? hexOf(parseInk(w.color)!.rgb) : '#000000', relativeLuminance(parseInk(w.bg)!.rgb), w.floor).color
      const fix = w.unknown
        ? `put a scrim under ${path}: \`style.surface: 'scrim'\` on it (a 60% dark panel), or a solid surface (\`style.surface: 'surface'\`), or move the text off the photo`
        : `use ink ≥ ${w.floor}:1 on ${w.bg}: ${solved}, or a colour role (\`text\`, solved for you) instead of a fixed colour`
      out.push({
        code: 'contrast/low',
        severity: 'error',
        blockIds: [b.id],
        message: `${path}: ${body}.`,
        fix,
        body: `${body}.`,
        ...(sub ? { group: { parent: sub.parent, type: sub.type, kind: `${part}|${w.unknown}`, id: sub.id, siblings: siblingsOf(b, sub) } } : {}),
      })
    }
  }
}

/** Painted extent of a sub-block (slide coordinates), surfaces included. */
function subPainted(b: DesignBlock, sub: SubBlock): Box | null {
  const ins = b.inspection
  if (!ins) return null
  const mine = new Set<number>()
  // the sub and every owner below it
  ins.owners.forEach((p, i) => {
    if (p === sub.path || p.startsWith(sub.path + '/')) mine.add(i)
  })
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  const add = (bx: Box) => {
    x1 = Math.min(x1, bx.x)
    y1 = Math.min(y1, bx.y)
    x2 = Math.max(x2, bx.x + bx.width)
    y2 = Math.max(y2, bx.y + bx.height)
  }
  for (const op of ins.ops) if (op.owner !== undefined && mine.has(op.owner)) add(op.box)
  for (const ink of ins.inks) if (ink.owner !== undefined && mine.has(ink.owner)) add(ink.box)
  return x1 === Infinity ? null : { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

/** Does the sub paint a surface covering (almost) its whole box — a card? */
function paintsSurface(b: DesignBlock, sub: SubBlock): boolean {
  const ins = b.inspection
  if (!ins) return false
  const idx = ins.owners.indexOf(sub.path)
  return ins.ops.some((op) => op.owner === idx && op.box.width >= sub.box.width * 0.95 && op.box.height >= sub.box.height * 0.95)
}

/** Text leaves owned by a sub (or its descendants), with their index into `b.text`. */
function subTexts(b: DesignBlock, sub: SubBlock, own = false): Array<{ i: number; t: DesignBlock['text'][number]; owner: string }> {
  const owners = b.inspection?.textOwners ?? []
  const out: Array<{ i: number; t: DesignBlock['text'][number]; owner: string }> = []
  b.text.forEach((t, i) => {
    const o = owners[i]
    if (o === undefined) return
    if (own ? o === sub.path : o === sub.path || o.startsWith(sub.path + '/')) out.push({ i, t, owner: o })
  })
  return out
}

/** Cluster by a coordinate within `tol`. */
function cluster<T>(items: T[], key: (t: T) => number, tol: number): T[][] {
  const sorted = [...items].sort((a, b) => key(a) - key(b))
  const groups: T[][] = []
  for (const it of sorted) {
    const last = groups[groups.length - 1]
    if (last && Math.abs(key(it) - key(last[0])) <= tol) last.push(it)
    else groups.push([it])
  }
  return groups
}

/** `layout/misaligned` and `layout/unequal-peers` for the peers of every row / grid. */
function peerChecks(b: DesignBlock, out: Draft[]): void {
  const ins = b.inspection!
  const containers: Array<{ path: string; type: string }> = [{ path: b.id, type: b.type }, ...ins.subs.map((s) => ({ path: s.path, type: s.type }))]
  for (const c of containers) {
    if (!PEER_CONTAINERS.has(c.type)) continue
    const kids = ins.subs.filter((s) => s.parent === c.path && s.layer === 'content')
    const byType = new Map<string, SubBlock[]>()
    for (const k of kids) byType.set(k.type, [...(byType.get(k.type) ?? []), k])
    for (const [type, peers] of byType) {
      if (peers.length < 2) continue
      // rows: peers side by side (same top)
      for (const row of cluster(peers, (p) => p.box.y, DESIGN_THRESHOLDS.alignDrift)) {
        if (row.length < 2) continue
        unequal(b, c.path, type, row, peers.length, out)
        misaligned(b, c.path, type, row, peers.length, 'y', out)
      }
      // columns: peers stacked (same left)
      for (const col of cluster(peers, (p) => p.box.x, DESIGN_THRESHOLDS.alignDrift)) {
        if (col.length < 2) continue
        misaligned(b, c.path, type, col, peers.length, 'x', out)
      }
    }
  }
}

function unequal(b: DesignBlock, parent: string, type: string, row: SubBlock[], total: number, out: Draft[]): void {
  const sizes = row.map((p) => (paintsSurface(b, p) ? subPainted(b, p) ?? p.box : p.box))
  const spread = (vals: number[]) => {
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    return lo > 0 ? hi / lo - 1 : 0
  }
  const w = sizes.map((s) => s.width)
  const h = sizes.map((s) => s.height)
  const sw = spread(w)
  const sh = spread(h)
  if (sw > DESIGN_THRESHOLDS.peerSpread || sh > DESIGN_THRESHOLDS.peerSpread) {
    const axis = sw >= sh ? 'widths' : 'heights'
    const vals = axis === 'widths' ? w : h
    const pct = Math.round((axis === 'widths' ? sw : sh) * 100)
    out.push({
      code: 'layout/unequal-peers',
      severity: 'warning',
      blockIds: [b.id],
      message: `${row.length} of ${total} ${short(type)} in ${parent} (${row.map((p) => p.id).join(', ')}) side by side have ${axis} ${r(Math.min(...vals))}–${r(Math.max(...vals))} units (+${pct}%, max ${Math.round(DESIGN_THRESHOLDS.peerSpread * 100)}%).`,
      fix: `give peers the same size: \`sizing: 'equal'\` on ${parent}, or the same amount of content in each`,
    })
  }
}

function misaligned(b: DesignBlock, parent: string, type: string, peers: SubBlock[], total: number, axis: 'x' | 'y', out: Draft[]): void {
  // matching text leaves: the k-th occurrence of the same part name inside each peer
  const keyed = peers.map((p) => {
    const counts = new Map<string, number>()
    const m = new Map<string, { t: DesignBlock['text'][number]; align: string }>()
    const types = new Map((b.inspection?.subs ?? []).map((s) => [s.path, short(s.type)]))
    for (const { i, t, owner } of subTexts(b, p)) {
      // the owner's type names the leaf: a card's `title text` and `body text` are different leaves
      const name = `${owner === p.path ? short(p.type) : types.get(owner) ?? ''} ${t.propPath ?? t.part ?? 'text'}`.trim()
      const n = counts.get(name) ?? 0
      counts.set(name, n + 1)
      m.set(`${name}#${n}`, { t, align: b.inspection?.textAlign[i] ?? 'start' })
    }
    return m
  })
  const keys = [...keyed[0].keys()].filter((k) => keyed.every((m) => m.has(k)))
  for (const key of keys) {
    const leaves = keyed.map((m) => m.get(key)!)
    if (axis === 'x' && leaves.some((l) => l.align !== 'start')) continue
    const pos = leaves.map((l) => (axis === 'y' ? l.t.painted.y : l.t.painted.x))
    const drift = Math.max(...pos) - Math.min(...pos)
    if (drift <= DESIGN_THRESHOLDS.alignDrift) continue
    const name = key.replace(/#\d+$/, '')
    const edge = axis === 'y' ? 'tops' : 'left edges'
    // why: an earlier leaf whose line count differs between the peers
    let fix = `give the peers the same structure above \`${name}\` and pack their content from the same edge`
    if (axis === 'y') {
      for (const k of keys) {
        if (k === key) break
        const ls = keyed.map((m) => m.get(k)!.t)
        const lines = ls.map((t) => t.lines)
        if (Math.max(...lines) === Math.min(...lines)) continue
        const most = ls.reduce((a, t2) => (t2.lines > a.lines ? t2 : a))
        const keep = Math.min(...lines)
        const who = peers[ls.indexOf(most)].id
        fix = `\`${k.replace(/#\d+$/, '')}\` above it wraps to ${most.lines} lines in ${who} and ${keep} elsewhere: cut it to ≤ ${keep * most.charsPerLine} chars (~${most.charsPerLine}/line) in ${who}, or give every peer the same line count`
        break
      }
    }
    out.push({
      code: 'layout/misaligned',
      severity: 'warning',
      blockIds: [b.id],
      message: `${peers.length} of ${total} ${short(type)} in ${parent} (${peers.map((p) => p.id).join(', ')}): \`${name}\` ${edge} drift ${r(drift)} units (${r(Math.min(...pos))}–${r(Math.max(...pos))}, max ${DESIGN_THRESHOLDS.alignDrift}).`,
      fix,
    })
    return // the first drifting leaf explains the rest
  }
}

/** `layout/narrow-child`: a nested text child too narrow to read. */
function narrowChecks(b: DesignBlock, out: Draft[]): void {
  const ins = b.inspection!
  for (const sub of ins.subs) {
    const own = subTexts(b, sub, true).filter(({ t }) => t.lines >= 2)
    const bad = own.filter(({ t }) => t.charsPerLine < DESIGN_THRESHOLDS.narrowChars || sub.box.width < DESIGN_THRESHOLDS.narrowWidth)
    if (!bad.length) continue
    const worst = bad.reduce((a, x) => (x.t.charsPerLine < a.t.charsPerLine ? x : a)).t
    const name = worst.propPath ?? worst.part ?? 'text'
    const parentSub = ins.subs.find((s) => s.path === sub.parent)
    const parentBox = parentSub?.box ?? b.box
    const siblings = ins.subs.filter((s) => s.parent === sub.parent)
    const rowPeers = siblings.filter((s) => Math.abs(s.box.y - sub.box.y) <= DESIGN_THRESHOLDS.alignDrift).sort((p, q) => p.box.x - q.box.x)
    const gap = rowPeers.length > 1 ? Math.max(0, rowPeers[1].box.x - (rowPeers[0].box.x + rowPeers[0].box.width)) : 0
    // the width this text needs for 12 characters a line at its size (and never under 240)
    const need = Math.max(DESIGN_THRESHOLDS.narrowWidth, Math.ceil((sub.box.width * DESIGN_THRESHOLDS.narrowChars) / Math.max(1, worst.charsPerLine)))
    const fit = Math.max(1, Math.floor((parentBox.width + gap) / (need + gap)))
    const body = `\`${name}\` wraps to ${worst.lines} lines at ${worst.charsPerLine} chars/line in a ${r(sub.box.width)}-unit box (min ${DESIGN_THRESHOLDS.narrowChars} chars, ${DESIGN_THRESHOLDS.narrowWidth} units)`
    const fix =
      rowPeers.length > fit
        ? `${rowPeers.length} side by side in ${r(parentBox.width)} units is too many at this size: at most ${fit} per row (each ≥ ${need} units), a ${Math.ceil(rowPeers.length / fit)}-row grid, or a smaller size token`
        : `widen ${sub.path} to ≥ ${need} units, or cut \`${name}\` to one line (≤ ${worst.charsPerLine} chars)`
    out.push({
      code: 'layout/narrow-child',
      severity: 'warning',
      blockIds: [b.id],
      message: `${sub.path}: ${body}.`,
      fix,
      body: `${body}.`,
      group: { parent: sub.parent, type: sub.type, kind: 'narrow', id: sub.id, siblings: siblingsOf(b, sub) },
    })
  }
}

/** `nesting/too-deep` (LLM-authored slides only). */
function depthCheck(b: DesignBlock, out: Draft[]): void {
  const deep = (b.inspection?.subs ?? []).filter((s) => s.level > DESIGN_THRESHOLDS.llmDepth)
  if (!deep.length) return
  const deepest = deep.reduce((a, s) => (s.level > a.level ? s : a))
  out.push({
    code: 'nesting/too-deep',
    severity: 'warning',
    blockIds: [b.id],
    message: `${deepest.path} is nested ${deepest.level} levels deep (${deep.length} block${deep.length === 1 ? '' : 's'} past level ${DESIGN_THRESHOLDS.llmDepth}; an LLM-authored slide may use ${DESIGN_THRESHOLDS.llmDepth}).`,
    fix: `flatten ${b.id}: lift ${deepest.path} ${deepest.level - DESIGN_THRESHOLDS.llmDepth} level${deepest.level - DESIGN_THRESHOLDS.llmDepth === 1 ? '' : 's'} up (a card's children go straight into the card, a row of cards into a grid), or use a composite block`,
  })
}

/** Content text of the slide (no backdrops, no style masters). */
function contentText(blocks: DesignBlock[]): Array<{ b: DesignBlock; t: DesignBlock['text'][number] }> {
  return blocks.filter((b) => b.layer !== 'backdrop' && !b.styleOwned).flatMap((b) => b.text.map((t) => ({ b, t })))
}

/** `type/too-many-sizes` (P5). */
function typeSizeCheck(blocks: DesignBlock[], out: Draft[]): void {
  const sizes = [...new Set(contentText(blocks).map(({ t }) => r(t.fontSize * (t.scale || 1))))].sort((a, b) => b - a)
  const merged: number[] = []
  for (const s of sizes) if (!merged.length || merged[merged.length - 1] - s > 1) merged.push(s)
  if (merged.length <= DESIGN_THRESHOLDS.typeSizes) return
  let pair: [number, number] = [merged[0], merged[1]]
  for (let i = 0; i + 1 < merged.length; i++) if (merged[i] / merged[i + 1] < pair[0] / pair[1]) pair = [merged[i], merged[i + 1]]
  out.push({
    code: 'type/too-many-sizes',
    severity: 'warning',
    blockIds: [...new Set(contentText(blocks).map(({ b }) => b.id))],
    message: `${merged.length} text sizes on the slide (${merged.join(', ')}; max ${DESIGN_THRESHOLDS.typeSizes}).`,
    fix: `use ≤ ${DESIGN_THRESHOLDS.typeSizes} sizes: set the ${pair[1]}-unit text at ${pair[0]} (or both at one size token)${merged.length - DESIGN_THRESHOLDS.typeSizes > 1 ? `, and ${merged.length - DESIGN_THRESHOLDS.typeSizes - 1} more merge like it` : ''}`,
  })
}

/** Is a colour the accent (same hue family; the ink guard may have darkened it)? */
function accentLike(color: string | undefined, accent: { h: number; s: number }): boolean {
  const c = parseInk(color)
  if (!c || c.alpha < 0.5) return false
  const hsl = rgbToHsl(c.rgb)
  if (hsl.s < 0.25 || hsl.l < 0.08 || hsl.l > 0.95) return false
  const d = Math.abs(hsl.h - accent.h)
  return Math.min(d, 360 - d) <= 12
}

/** `accent/overuse` (P10): how many blocks paint the accent — a slide-level block, or a nested
 *  authored child, counts once whatever it paints in accent (a chart's bars are one use, six
 *  accent cards are six). */
export function accentUses(blocks: DesignBlock[], tokens: ResolvedTokens): string[] {
  const acc = parseInk(tokens.color.accent)
  const text = parseInk(tokens.color.text)
  if (!acc || !text) return []
  const hsl = rgbToHsl(acc.rgb)
  // an achromatic accent (a mono palette) is the ink itself: nothing to count
  if (hsl.s < 0.25 || hexOf(acc.rgb) === hexOf(text.rgb)) return []
  const uses = new Set<string>()
  for (const b of blocks) {
    if (!b.inspection || b.layer === 'backdrop' || b.styleOwned) continue
    const owners = b.inspection.owners
    for (const ink of b.inspection.inks) if (ink.colors.some((c) => accentLike(c, hsl))) uses.add(owners[ink.owner ?? 0])
    for (const op of b.inspection.ops) {
      if (op.kind === 'fill' && op.paint?.type === 'solid' && accentLike(op.paint.color, hsl)) uses.add(owners[op.owner ?? 0])
    }
  }
  return [...uses]
}

function accentCheck(blocks: DesignBlock[], ctx: DesignContext, out: Draft[]): void {
  const uses = accentUses(blocks, ctx.tokens)
  const budget = ACCENT_BUDGET[ctx.family ?? 'default']
  if (uses.length <= budget) return
  out.push({
    code: 'accent/overuse',
    severity: 'warning',
    blockIds: [...new Set(uses.map((u) => u.split('/')[0]))],
    message: `${uses.length} blocks paint the accent (${uses.join(', ')}; this style allows ${budget}).`,
    fix: `keep the accent on the key number or word: set ${uses.length - budget} of them in the text colour (\`style.accent: 'text'\`), or one accent card among neutral ones`,
  })
}

/** `text/long-measure` (U6), info. */
function measureChecks(blocks: DesignBlock[], out: Draft[]): void {
  for (const { b, t } of contentText(blocks)) {
    if (t.lines < 2 || t.fontSize * (t.scale || 1) > DESIGN_THRESHOLDS.measureMaxSize || t.charsPerLine <= DESIGN_THRESHOLDS.measureChars) continue
    const i = b.text.indexOf(t)
    const owner = b.inspection?.textOwners[i] ?? b.id
    const name = t.propPath ?? t.part ?? 'text'
    const width = r((t.box.width * DESIGN_THRESHOLDS.measureChars) / t.charsPerLine)
    out.push({
      code: 'text/long-measure',
      severity: 'info',
      blockIds: [b.id],
      message: `${owner} \`${name}\` runs ${t.charsPerLine} chars/line over ${t.lines} lines (comfortable ≤ ${DESIGN_THRESHOLDS.measureChars}).`,
      fix: `narrow it to ≤ ${width} units (\`style.padding\`, a narrower region or a two-column layout), or a larger size token`,
    })
  }
}

/** Every part name in a tree (DFS), html posters included. */
function partNames(n: LayoutNode | undefined, out: string[] = []): string[] {
  if (!n) return out
  if ('part' in n && n.part) out.push(n.part)
  if (n.k === 'group') for (const c of n.children) partNames(c, out)
  if (n.k === 'host' && n.poster) partNames(n.poster, out)
  return out
}

function matchCount(names: string[], pattern: string): number {
  if (names.includes(pattern)) return 1
  if (pattern.includes('[*]')) {
    const re = new RegExp('^' + pattern.split('[*]').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\[\\d+\\]') + '$')
    return names.filter((p) => re.test(p)).length
  }
  return names.filter((p) => p.startsWith(pattern + '/') || (p.startsWith(pattern) && /^\[\d+\]/.test(p.slice(pattern.length)))).length
}

/** `motion/stagger-total` and `motion/too-many-heroes` (05-motion §5.9). */
function motionChecks(blocks: DesignBlock[], ctx: DesignContext, out: Draft[]): void {
  const heroes: string[] = []
  for (const b of blocks) {
    if (b.styleOwned) continue
    const def = ctx.registry.get(b.type)
    if (!def?.motion) continue
    const block = resolveBlockMotion(b.motion, def.motion)
    if (block.effect === null) continue
    const parts = resolvePartMotion(b.motion, def.motion).filter((p) => !p.isAmbient)
    const presetId = b.motion?.preset ?? def.motion.preset ?? 'fade'
    if (SHOWY_PRESETS.has(presetId) || parts.some((p) => p.presetId && SHOWY_PRESETS.has(p.presetId))) heroes.push(b.id)
    const names = partNames(b.root)
    let worst: { part: string; items: number; step: number; total: number } | undefined
    for (const p of parts) {
      const step = p.staggerMs ?? 0
      if (!step) continue
      const items = matchCount(names, p.partName)
      const total = step * Math.max(0, items - 1)
      if (!worst || total > worst.total) worst = { part: p.partName, items, step, total }
    }
    if (worst && worst.total > DESIGN_THRESHOLDS.staggerTotal) {
      const cap = Math.floor(DESIGN_THRESHOLDS.staggerTotal / worst.step) + 1
      out.push({
        code: 'motion/stagger-total',
        severity: 'warning',
        blockIds: [b.id],
        message: `${b.id} staggers ${worst.items} \`${worst.part}\` items × ${worst.step} ms = ${worst.total} ms (max ${DESIGN_THRESHOLDS.staggerTotal}).`,
        fix: `show ≤ ${cap} items, or reveal it as one (\`motion: { preset: 'fade-up' }\`)`,
      })
    }
  }
  if (heroes.length > DESIGN_THRESHOLDS.heroes) {
    out.push({
      code: 'motion/too-many-heroes',
      severity: 'warning',
      blockIds: heroes,
      message: `${heroes.length} showy reveals on the slide (${heroes.join(', ')}; max ${DESIGN_THRESHOLDS.heroes}).`,
      fix: `keep the showy reveal on the ${DESIGN_THRESHOLDS.heroes} key elements: give ${heroes.length - DESIGN_THRESHOLDS.heroes} of them \`motion: { preset: 'fade-up' }\``,
    })
  }
}
