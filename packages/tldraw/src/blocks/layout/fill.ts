/**
 * spro sprint 2026-11b S06-b — a block uses the room it is given.
 *
 * `compileSlide` places a content region under a heading with `spread` (the body anchored under the
 * title, D35) when the region's main block declares a `fillPolicy`, and gives that block the room
 * left in the region with `style.fill`. `layoutBlock` then lays it out through `fillLayout`, at
 * compile time and at render time alike (the shape keeps `style.fill`), so both see one geometry:
 *
 * - `type`: its type steps up the ladder (at most `FILL_STEPS`, never past `title`: body text at most
 *   the deck's title size, S06-d) while it shows whole (nothing cut or outside, at most
 *   twice its lines) and leaves `FILL_TYPE_SHARE` of the room for the next step;
 * - `spacing`: the gaps between its items (`…[i]` parts) grow, each by at most `FILL_GAP_LINES` × its largest type size
 *   (`FILL_GAP_LINES` blank lines) and at least `space.xl`;
 * - `stretch`: the block reads `ctx.style.fill` itself (rows that grow taller).
 *
 * The block's box is then the whole room: what it could not use stays under its last item, or, past
 * `FILL_CENTRE_FROM` of the room, is shared above and below it.
 * Off (the layout as authored) when nested, measuring (an intrinsic size, a size card) or on the tall
 * probe of `measureBlock`.
 */

import { brokenWords, cutWordsIn } from './words'
export { brokenWords }
import type { BlockDefinition, FillStep, LayoutContext, LayoutNode, TypeToken } from '../types'
import { DEFAULT_PROBE_HEIGHT } from './measure-block'
import { shiftTypeContext } from './layout-child'
import { loudTextCap } from './loud-text'

export const FILL_STEPS = 3
export const FILL_TYPE_SHARE = 0.85
/** Each gap between items may grow by at most this many times its largest type size. */
export const FILL_GAP_LINES = 2
/** A filled block that leaves more than this share of its room unused is centred in it. */
export const FILL_CENTRE_FROM = 0.2
// list text may reach the deck's title size (S06-d), the poster's question stays under it
const LADDER: readonly TypeToken[] = ['footnote', 'caption', 'body', 'lead', 'subheading', 'heading', 'title']
const POSTER_LADDER: readonly TypeToken[] = ['footnote', 'caption', 'body', 'lead', 'subheading', 'heading']

/**
 * Review 2026-11-08 — the families whose blocks step their type up by default when they are a region's main
 * block (a route agenda, a milestone row, a diagram: drawn as a 28-unit strip in a 570-unit room on the
 * notebook and ecoride decks). A block's own `fillPolicy` wins; charts (`data`) and html blocks keep theirs.
 */
export const DEFAULT_FILL_FAMILIES: ReadonlySet<string> = new Set(['diagram', 'composite'])

/** The fill policy a block uses: its own, else `['type']` for a layout block of `DEFAULT_FILL_FAMILIES`. */
export function fillPolicyOf(def: BlockDefinition | undefined): readonly FillStep[] | undefined {
  if (!def) return undefined
  if (def.fillPolicy) return def.fillPolicy
  return def.kind !== 'html' && DEFAULT_FILL_FAMILIES.has(def.family) ? DEFAULT_FILL : undefined
}
const DEFAULT_FILL: readonly FillStep[] = ['type']

/** Whether `fillLayout` drives this layout call. */
export function fills(def: BlockDefinition, ctx: LayoutContext): boolean {
  return (
    !!fillPolicyOf(def)?.length &&
    ctx.style?.fill === true &&
    (ctx.depth ?? 0) === 0 &&
    !ctx.tokens.measuring &&
    ctx.box.height < DEFAULT_PROBE_HEIGHT &&
    def.kind !== 'html'
  )
}

export function promote(ctx: LayoutContext, n: number): LayoutContext {
  if (n <= 0) return ctx
  const up = (t: TypeToken): TypeToken => {
    const i = LADDER.indexOf(t)
    return i < 0 ? t : LADDER[Math.min(LADDER.length - 1, i + n)]
  }
  return { ...ctx, resolveText: (t, over) => ctx.resolveText(up(t), over) }
}

type Leaf = { lines: number; chars: number; last: number; size: number }
type Stats = { chars: number; lines: number; maxSize: number; whole: boolean; leaves: Leaf[]; broken: number }
function stats(node: LayoutNode, W: number, H: number): Stats {
  const out: Stats = { chars: 0, lines: 0, maxSize: 0, whole: true, leaves: [], broken: 0 }
  const walk = (n: LayoutNode, ox: number, oy: number) => {
    const x = ox + n.box.x
    const y = oy + n.box.y
    if (n.k === 'group') {
      for (const c of n.children) walk(c, x, y)
      return
    }
    if (n.box.width > 0 && n.box.height > 0 && (x < -1 || y < -1 || x + n.box.width > W + 1 || y + n.box.height > H + 1)) out.whole = false
    if (n.k !== 'text') return
    if ((n as { truncated?: boolean }).truncated) out.whole = false
    out.maxSize = Math.max(out.maxSize, n.style.size)
    const lastLine = n.lines[n.lines.length - 1]
    out.leaves.push({ lines: n.lines.length, chars: n.lines.reduce((t, l) => t + l.text.replace(/[\s…]/g, '').length, 0), last: lastLine && n.box.width > 0 ? lastLine.width / n.box.width : 1, size: n.style.size })
    for (const l of n.lines) {
      out.chars += l.text.replace(/[\s…]/g, '').length
      out.lines++
      if (x + l.width > W + 1) out.whole = false
    }
  }
  walk(node, 0, 0)
  out.broken = cutWordsIn(node)
  return out
}

/** The bottom of what a node paints, in its own coordinates. */
function bottomOf(node: LayoutNode): number {
  if (node.k !== 'group') return node.box.height
  let b = 0
  for (const c of node.children) b = Math.max(b, c.box.y + bottomOf(c))
  return node.children.length ? b : node.box.height
}

// the item parts of a list (`item[i]…`, a kv-list's `key[i]`…); a composite's other parts numbered by
// `composeFlat` (`summary[0]`: three leaves of one callout) are not items
const ITEM = /^(?:item|key|value|leader|rule)\[(\d+)[\].]/
function itemOf(node: LayoutNode): number | undefined {
  const m = node.part ? ITEM.exec(node.part) : null
  if (m) return Number(m[1])
  if (node.k === 'group') for (const c of node.children) {
    const i = itemOf(c)
    if (i !== undefined) return i
  }
  return undefined
}

/** S06-b `spacing`: the gaps between the root's items grow into the room under them. */
export function spreadItems(node: LayoutNode, H: number, ctx: LayoutContext, maxSize: number): LayoutNode {
  if (node.k !== 'group') return node
  const idx = node.children.map(itemOf)
  const items = [...new Set(idx.filter((i): i is number => i !== undefined))].sort((a, b) => a - b)
  if (items.length < 2) return node
  const room = H - bottomOf(node)
  if (room <= 1) return node
  const cap = Math.max(ctx.tokens.space.xl, FILL_GAP_LINES * maxSize)
  // items side by side (a grid row, a two-column kv-list) move as one row: rows are ranked by their top
  const topOf = new Map(items.map((i) => [i, Math.min(...node.children.filter((_, j) => idx[j] === i).map((c) => c.box.y))]))
  const rowTops = [...new Set([...topOf.values()].map((t) => Math.round(t)))].sort((x, y) => x - y)
  if (rowTops.length < 2) {
    // columns drawn as groups (a two-column kv-list): each column spreads its own items
    if (!node.children.some((c) => c.k === 'group')) return node
    const children = node.children.map((c) => (c.k === 'group' ? { ...spreadItems(c, H - c.box.y, ctx, maxSize), box: c.box } : c))
    return { ...node, children }
  }
  const rowOf = (t: number) => rowTops.findIndex((r) => Math.abs(r - Math.round(t)) <= 1)
  const extra = Math.min(cap, room / (rowTops.length - 1))
  const lastTop = rowTops[rowTops.length - 1]
  const children = node.children.map((c, j) => {
    const i = idx[j]
    const r = i !== undefined ? rowOf(topOf.get(i)!) : c.box.y > lastTop ? rowTops.length - 1 : 0
    return r ? ({ ...c, box: { ...c.box, y: c.box.y + r * extra } } as LayoutNode) : c
  })
  return { ...node, children, box: { ...node.box, height: Math.max(node.box.height, bottomOf({ ...node, children })) } }
}

/** A larger type that wraps a short text (a key, a label: `SHORT_TEXT` characters or fewer) or breaks a
 *  one-line text with a word alone on its new last line (under `ORPHAN` of the line) reads worse than
 *  the smaller type. */
export const SHORT_TEXT = 20
export const ORPHAN = 0.2
/** Review 2026-11-08: in a diagram or a composite (`labels`), a short label of a row of stops may take two
 *  balanced lines (the last at least `BALANCED` of the line, past `ORPHAN`, `SHORT_TEXT_MIN_LINE` characters a line) —
 *  a route of five stops otherwise stayed at 28 units in a 570-unit room. */
export const BALANCED = 0.25
export const SHORT_TEXT_MIN_LINE = 8
function rewraps(base: Stats, next: Stats, labels = false): boolean {
  return next.leaves.some((l, i) => {
    const b = base.leaves[i]
    if (!b || l.lines <= b.lines) return false
    if (labels && b.lines === 1 && l.lines === 2 && l.last >= BALANCED && l.chars / 2 >= SHORT_TEXT_MIN_LINE) return false
    // a paragraph may take a line more; a one-liner may not break with a word alone on its new line
    return l.chars <= SHORT_TEXT || (b.lines === 1 && l.last < ORPHAN)
  })
}

/** Review 2026-11-08: a larger type may not take a long text past the size its length allows
 *  (`loudTextCap`: a 150-character bullet stepped up to the title size). */
function loud(s: Stats): number {
  return s.leaves.filter((l) => l.size > loudTextCap(l.chars) + 0.5).length
}

/** `def.layout` with the block's `fillPolicy` applied (see the module comment); as authored when `fills` is false. */
export function fillLayout(def: BlockDefinition, props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  if (!fills(def, ctx)) return def.layout(props, ctx)
  const policy = fillPolicyOf(def)!
  const W = ctx.box.width
  const H = ctx.box.height
  const base: LayoutContext = { ...ctx, tokens: { ...ctx.tokens, filling: true } }
  const lay = (c: LayoutContext) => def.layout(props, c)
  let node = lay(base)
  let s = stats(node, W, H)
  if (!s.whole) return def.layout(props, ctx)
  if (policy.includes('type')) {
    const title = ctx.resolveText('title').size
    let roomy: LayoutNode | undefined
    let any: LayoutNode | undefined
    for (let n = FILL_STEPS - (ctx.tokens.typeStep ?? 0); n >= 1 && !roomy; n--) {
      // a composite lays its text out through child blocks: the context is rebuilt on the shifted scale
      const up = shiftTypeContext(ctx, n, LADDER)
      const t = lay({ ...up, tokens: { ...up.tokens, filling: true } })
      const ts = stats(t, W, H)
      if (!ts.whole || ts.chars < s.chars || ts.lines > 2 * s.lines + 1 || ts.maxSize > title || rewraps(s, ts, DEFAULT_FILL_FAMILIES.has(def.family)) || loud(ts) > loud(s) || ts.broken > s.broken) continue
      if (bottomOf(t) <= H * FILL_TYPE_SHARE) roomy = t
      else if (!any && n <= 2) any = t
    }
    const pick = roomy ?? any
    if (pick) {
      node = pick
      s = stats(node, W, H)
    }
  }
  if (policy.includes('spacing')) node = spreadItems(node, H, ctx, s.maxSize)
  // a block that could not use its room (one item, a short list in a tall box) is not left as a strip
  // under the title over an empty band: what it left is shared above and below it
  const left = H - bottomOf(node)
  if (left > FILL_CENTRE_FROM * H && node.k === 'group') node = { ...node, children: node.children.map((ch) => ({ ...ch, box: { ...ch.box, y: ch.box.y + left / 2 } }) as LayoutNode) }
  return { ...node, box: { ...node.box, height: Math.max(H, node.box.height) } }
}

/** S06 — `fills` for an html block (its poster drives the live template's geometry). */
export function fillsHost(ctx: LayoutContext): boolean {
  return ctx.style?.fill === true && (ctx.depth ?? 0) === 0 && !ctx.tokens.measuring && ctx.box.height < DEFAULT_PROBE_HEIGHT
}

/**
 * S06-D — an activity poster that fills its room: its type steps up (at most two steps, while the
 * poster leaves `FILL_TYPE_SHARE` of the room), then its `rows` grow taller, each by at most `cap`;
 * what is still left is shared above and below it.
 * `build(ctx, grow)` lays the poster out with every row `grow` units taller. The poster's box is the
 * whole room. As built when `fillsHost` is false.
 */
export function fillPoster(ctx: LayoutContext, build: (c: LayoutContext, grow: number) => LayoutNode, rows: number, cap: number): LayoutNode {
  if (!fillsHost(ctx)) return build(ctx, 0)
  const H = ctx.box.height
  const W = ctx.box.width
  let c = ctx
  let node = build(ctx, 0)
  if (node.box.height > H) return node
  const base = stats(node, W, Number.MAX_SAFE_INTEGER)
  for (let n = 2 - (ctx.tokens.typeStep ?? 0); n >= 1; n--) {
    // a poster lays its text out through child blocks: the whole context takes the shifted scale
    const up = shiftTypeContext(ctx, n, POSTER_LADDER)
    const t = build(up, 0)
    const ts = stats(t, W, Number.MAX_SAFE_INTEGER)
    if (t.box.height <= H * FILL_TYPE_SHARE && ts.whole && ts.lines <= 2 * base.lines + 1 && !rewraps(base, ts) && loud(ts) <= loud(base) && ts.broken <= base.broken) {
      c = up
      node = t
      break
    }
  }
  if (rows > 0) {
    const grow = Math.max(0, Math.min(cap, (H - node.box.height) / rows))
    if (grow > 1) node = build(c, grow)
  }
  // what the rows could not take is shared above and below (a short activity is not a strip under
  // the title over an empty half); the live template reads every box from the poster, so it follows
  const dy = Math.max(0, (H - node.box.height) / 2)
  if (dy > 1 && node.k === 'group') node = { ...node, children: node.children.map((ch) => ({ ...ch, box: { ...ch.box, y: ch.box.y + dy } }) as LayoutNode) }
  return { ...node, box: { ...node.box, height: Math.max(H, node.box.height) } }
}
