/**
 * spro creative CR8 — the shared layout of the wave-1 frame and teaching composites: one or two
 * columns of child specs, each column a measured stack centred in the block's height (a poster
 * breathes), the side column optional (a motif, a visual, a numeral). Parts are the piece ids, so
 * a block's motion parts are the ids it gives its specs. The block grows past a too-short box.
 */
import type { BlockSpec, CapacityReport, LayoutContext, LayoutNode } from '../../types'
import { composeFlat, measureHeights, plainOf, type Piece } from './_kit'

export interface Cell {
  spec: BlockSpec
  /** Part name (default: the spec's id). Cells sharing a group are numbered `group[i]`. */
  group?: string
  align?: 'start' | 'center' | 'end'
  /** Extra space above this cell (× the gap). */
  space?: number
  /** Width share of the column (0–1, default 1), placed by `align`. */
  share?: number
  /** The cell takes the whole height of the block (a colour field); only alone in its column. */
  fill?: boolean
  /** A diagram that fills what it is given: the cell gets the column's leftover height (at least
   *  `minGrow`), not its measured height (a diagram measures as the whole box). */
  grow?: boolean
  /** A grid of peer specs laid out by the poster itself (each item measured at its cell width, a row
   *  as tall as its tallest item); `spec` is then only the build tree's grid. */
  grid?: { columns: number; items: BlockSpec[] }
}

const MIN_GROW = 160

export interface PosterOptions {
  /** The side column, beside the main one. */
  side?: Cell[]
  /** Main column share of the width when there is a side column (default 0.62). */
  ratio?: number
  /** The side column first (left). */
  sideFirst?: boolean
  /** Vertical placement of the main column: centred (default) or low (`end`, a margin poster). */
  valign?: 'center' | 'end' | 'start'
  /** Gap token between cells (default `lg`). */
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  /** Max width of a single main column, centred (default the whole box). */
  maxWidth?: number
  /** A panel behind the main column (a card), its padding around the column (part: the spec's id). */
  backdrop?: BlockSpec
}

/** A spec whose `text` props are strings or rich text (hostile props: anything else becomes a string). */
function safeSpec(spec: BlockSpec): BlockSpec {
  const props = { ...(spec.props ?? {}) } as Record<string, unknown>
  const t = props.text
  if ('text' in props && !(typeof t === 'string' || (!!t && typeof t === 'object' && Array.isArray((t as { runs?: unknown }).runs)))) {
    props.text = t === undefined || t === null ? '' : String(t)
  }
  if (Array.isArray(props.children)) props.children = (props.children as BlockSpec[]).map(safeSpec)
  return { ...spec, props }
}

/** The content height of a spec at `w`: a card or a stack by its children (containers measure as
 *  the whole box they are given), anything else as measured. */
function contentHeight(ctx: LayoutContext, spec: BlockSpec, w: number): number {
  const props = (spec.props ?? {}) as { padding?: string; gap?: string; children?: BlockSpec[] }
  const kids = Array.isArray(props.children) ? props.children : []
  const space = ctx.tokens.space as Record<string, number>
  if (spec.type === 'tls.l.card') {
    const pad = space[props.padding ?? 'md'] ?? space.md
    // the card lays its children in a stack with the `sm` gap (tls.l.card)
    return 2 * pad + kids.reduce((a, k) => a + contentHeight(ctx, k, Math.max(20, w - 2 * pad)), 0) + space.sm * Math.max(0, kids.length - 1)
  }
  if (spec.type === 'tls.l.stack') {
    const gap = space[props.gap ?? 'md'] ?? space.md
    return kids.reduce((a, k) => a + contentHeight(ctx, k, w), 0) + gap * Math.max(0, kids.length - 1)
  }
  return measureHeights(ctx, [spec], w)[0]
}

function column(ctx: LayoutContext, cells0: Cell[], x: number, w: number, gap: number, avail = 0): { pieces: (y0: number) => Piece[]; height: number } {
  const cells = cells0.map((c) => ({ ...c, spec: safeSpec(c.spec) }))
  const widths = cells.map((c) => Math.max(1, w * Math.min(1, Math.max(0.1, c.share ?? 1))))
  const grids = cells.map((c, i) => {
    if (!c.grid || !c.grid.items.length) return undefined
    const cols = Math.max(1, Math.min(c.grid.columns, c.grid.items.length))
    const cw = Math.max(40, (widths[i] - gap * (cols - 1)) / cols)
    const items = c.grid.items.map(safeSpec)
    const ih = items.map((it) => contentHeight(ctx, it, cw))
    const rows: number[] = []
    ih.forEach((h, k) => {
      const r = Math.floor(k / cols)
      rows[r] = Math.max(rows[r] ?? 0, h)
    })
    return { cols, cw, items, rows }
  })
  const hs = cells.map((c, i) => (grids[i] ? grids[i]!.rows.reduce((a, b) => a + b, 0) + gap * (grids[i]!.rows.length - 1) : c.grow ? 0 : measureHeights(ctx, [c.spec], widths[i])[0]))
  const gaps = cells.reduce((a, c, i) => a + (i ? gap * (1 + (c.space ?? 0)) : 0), 0)
  const fixed = hs.reduce((a, b) => a + b, 0) + gaps
  const growers = cells.filter((c) => c.grow).length
  cells.forEach((c, i) => {
    if (c.grow) hs[i] = Math.max(MIN_GROW, (avail - fixed) / growers)
  })
  const height = hs.reduce((a, b) => a + b, 0) + cells.reduce((a, c, i) => a + (i ? gap * (1 + (c.space ?? 0)) : 0), 0)
  return {
    height,
    pieces: (y0: number) => {
      let y = y0
      return cells.flatMap((c, i): Piece[] => {
        if (i) y += gap * (1 + (c.space ?? 0))
        const g = grids[i]
        if (g) {
          const out: Piece[] = []
          let ry = y
          g.rows.forEach((rh, r) => {
            for (let k = 0; k < g.cols; k++) {
              const item = g.items[r * g.cols + k]
              if (!item) break
              out.push({ id: item.id, group: c.group ?? c.spec.id, spec: item, box: { x: x + k * (g.cw + gap), y: ry, width: g.cw, height: rh } })
            }
            ry += rh + gap
          })
          y += hs[i]
          return out
        }
        const cw = widths[i]
        const cx = c.align === 'center' ? x + (w - cw) / 2 : c.align === 'end' ? x + w - cw : x
        const p: Piece = { id: c.spec.id, ...(c.group ? { group: c.group } : {}), spec: c.spec, box: { x: cx, y, width: cw, height: hs[i] }, align: c.align ?? 'start' }
        y += hs[i]
        return [p]
      })
    },
  }
}

interface PosterPlan {
  W: number
  H: number
  mx: number
  mw: number
  sx: number
  sw: number
  pad: number
  side?: Cell[]
  m: ReturnType<typeof column>
  s?: ReturnType<typeof column>
  total: number
}

function posterPlan(ctx: LayoutContext, main: Cell[], opts: PosterOptions): PosterPlan {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const gap = ctx.tokens.space[opts.gap ?? 'lg']
  const side = opts.side?.length ? opts.side : undefined
  const colGap = ctx.tokens.space.xl * 1.5
  let mx = 0
  let mw = W
  let sx = 0
  let sw = 0
  if (side) {
    const r = Math.min(0.8, Math.max(0.3, opts.ratio ?? 0.62))
    mw = Math.max(120, (W - colGap) * r)
    sw = Math.max(80, W - colGap - mw)
    if (opts.sideFirst) {
      sx = 0
      mx = sw + colGap
    } else {
      sx = mw + colGap
    }
  } else if (opts.maxWidth && opts.maxWidth < W) {
    mw = opts.maxWidth
    mx = (W - mw) / 2
  }
  const pad = opts.backdrop ? ctx.tokens.space.xl : 0
  if (pad) {
    mx += pad
    mw = Math.max(80, mw - 2 * pad)
  }
  const m = column(ctx, main, mx, mw, gap, H - 2 * pad)
  const s = side ? column(ctx, side, sx, sw, gap, H) : undefined
  const total = Math.max(H, m.height + 2 * pad, s?.height ?? 0)
  return { W, H, mx, mw, sx, sw, pad, side, m, s, total }
}

/** The height the poster needs for `main` (and `opts.side`) at the box's width, before it is
 *  stretched to the box: what `posterFit` compares with the box height. */
export function posterHeight(ctx: LayoutContext, main: Cell[], opts: PosterOptions = {}): number {
  const p = posterPlan(ctx, main, opts)
  return Math.max(p.m.height + 2 * p.pad, p.s?.height ?? 0)
}

/** The largest rung that fits: `rungs` run from the biggest type to the smallest, each a `main` +
 *  options; the first whose needed height is within `fill` of the box (default 0.9, a poster
 *  breathes) is laid out, else the last. A block whose cells sit at one measured size left a focal
 *  number or list in a band of the slide (spro creative Phase R: nova s3, digital-uni s3). */
export function posterFit(ctx: LayoutContext, rungs: Array<{ main: Cell[]; opts: PosterOptions }>, fill = 0.9): LayoutNode {
  const H = Math.max(0, ctx.box.height) || 0
  const pick = rungs.find((r) => posterHeight(ctx, r.main, r.opts) <= H * fill) ?? rungs[rungs.length - 1]
  return posterLayout(ctx, pick.main, pick.opts)
}

/** The poster layout: `main` (and `opts.side`) as measured, centred stacks. */
export function posterLayout(ctx: LayoutContext, main: Cell[], opts: PosterOptions = {}): LayoutNode {
  const { mx, mw, sx, sw, pad, side, m, s, total } = posterPlan(ctx, main, opts)
  const v = opts.valign ?? 'center'
  const my = v === 'end' ? total - pad - m.height : v === 'start' ? pad : (total - m.height) / 2
  const sidePieces = s ? s.pieces((total - s.height) / 2) : []
  if (side && side.length === 1 && side[0].fill && sidePieces[0]) sidePieces[0].box = { x: sx, y: 0, width: sw, height: total }
  const back: Piece[] = opts.backdrop ? [{ id: opts.backdrop.id, spec: safeSpec(opts.backdrop), box: { x: mx - pad, y: my - pad, width: mw + 2 * pad, height: m.height + 2 * pad } }] : []
  const pieces = [...back, ...sidePieces, ...m.pieces(my)]
  return composeFlat(ctx, pieces, total)
}

/** The build tree of a poster: a stack of the main cells (and a split with the side). */
export function posterBuild(id: string, main: Cell[], side?: Cell[]): BlockSpec {
  const stack = (k: string, cells: Cell[]): BlockSpec => ({ id: k, type: 'tls.l.stack', props: { gap: 'lg', sizing: 'content', children: cells.map((c) => safeSpec(c.spec)) } })
  if (!side?.length) return { ...stack(id, main) }
  return { id, type: 'tls.l.row', props: { gap: 'xl', sizing: 'equal', children: [stack(`${id}-main`, main), stack(`${id}-side`, side)] } }
}

/** A capacity report from the schema: each content text slot's characters against its `maxChars`
 *  and each content list's items against its `max` (top-level slots only; never throws). */
export function schemaCapacity(schema: Record<string, unknown>, props: unknown): CapacityReport {
  const p = props && typeof props === 'object' ? (props as Record<string, unknown>) : {}
  const budget: CapacityReport['budget'] = {}
  const over: string[] = []
  for (const [k, raw] of Object.entries(schema)) {
    const s = raw as { role?: string; type?: { kind?: string; maxChars?: number; max?: number } }
    if (s?.role !== 'content' || !s.type) continue
    const v = p[k]
    let used = 0
    let max = 0
    let unit: 'chars' | 'items' = 'chars'
    if ((s.type.kind === 'text' || s.type.kind === 'richText') && s.type.maxChars) {
      used = typeof v === 'string' ? v.length : v && typeof v === 'object' ? plainOf(v as never).length : 0
      max = s.type.maxChars
    } else if (s.type.kind === 'list' && s.type.max) {
      used = Array.isArray(v) ? v.length : 0
      max = s.type.max
      unit = 'items'
    } else if (s.type.kind === 'object' && v && typeof v === 'object') {
      // spro creative CR13: an object slot (a balance pan, a bridge bank) is read field by field
      const inner = schemaCapacity((s.type as { fields?: Record<string, unknown> }).fields ?? {}, v)
      for (const [f, b] of Object.entries(inner.budget)) budget[`${k}.${f}`] = b
      if (!inner.fits) over.push(k)
      continue
    } else continue
    if (used <= 0) continue
    budget[k] = { max, used, unit }
    if (used > max) over.push(k)
  }
  return { fits: !over.length, budget, remedy: over.map((slot) => ({ kind: 'truncate', slot }) as const) }
}
