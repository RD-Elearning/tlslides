/**
 * spro sprint 2026-11b S08-A — the text-rich cell shared by the wave-A teaching blocks (key-points,
 * explainer, frayer, worked-example, cornell, faq, glossary, timeline-detail, process-detail,
 * compare-detail, summary-sheet, sidenotes): one family of cells, so S06's fill and the type tiers apply
 * once.
 *
 * A cell = an optional marker (a number, a letter, an icon or a short label such as a date), a lead
 * line (bold) and a paragraph, then optional sub-points or a formula. Cells are laid out in 1–3
 * columns, top-anchored (D35), every cell of a row as tall as its tallest, peers at one type size. The
 * type is tiered: the largest rung whose cells fit the box wins, else the smallest (the block then
 * grows past the box like every poster). Parts: `item[i].marker|lead|text|points|formula|card`, so
 * `stagger-*` motion and S06's `spacing` step see one item per cell.
 */
import type { BlockSpec, LayoutContext, LayoutNode, RichText, TypeToken } from '../../types'
import { composeFlat, measureHeights, type Piece } from './_kit'

export interface RichItem {
  lead?: string | RichText
  text?: string | RichText
  points?: string[]
  formula?: string
  /** The marker text for `marker: 'label'` (a date, a cue), or an icon name for `marker: 'icon'`. */
  marker?: string
  /** S09 `marker: 'figure'`: the number (its own part `value[i]`, so `count-up` sees a numeric text)
   *  and its unit (`item[i].unit`), as the author wrote them (deck language, never re-localized). */
  value?: string
  unit?: string
  /** S09: a small muted line under the text (a source). Part `item[i].note`. */
  note?: string
}

export type RichMarker = 'number' | 'letter' | 'icon' | 'label' | 'figure' | 'none'
/** `card`: each cell on the deck style's card (filled, outline, glass… by the style). */
export type RichCard = 'none' | 'card'

export interface RichOptions {
  columns?: 1 | 2 | 3 | 4
  marker?: RichMarker
  /** `left`: the marker in a column left of the text (a rail); `top`: above the lead. */
  markerSide?: 'left' | 'top'
  card?: RichCard
  /** Width of a `label` marker column (a date, a cue), share of the cell (default 0.26). */
  labelShare?: number
  /** Gap between cells (token, default `lg`). */
  gap?: 'md' | 'lg' | 'xl'
  /** Part prefix of the cells (default `item`). */
  part?: string
  /** First item number (`number` markers). */
  start?: number
  /** Tighter gaps (the last rungs `richFit` tries when the cells do not fit). */
  compact?: boolean
}

/** The type rungs tried, largest first: lead line and paragraph sizes. */
export const RICH_RUNGS: ReadonlyArray<{ lead: 'subheading' | 'lead' | 'body'; text: 'lead' | 'body'; figure: TypeToken }> = [
  { lead: 'subheading', text: 'body', figure: 'display' },
  { lead: 'lead', text: 'body', figure: 'title' },
  { lead: 'body', text: 'body', figure: 'heading' },
]

const FIGURE_LADDER: TypeToken[] = ['display', 'title', 'heading', 'subheading']

/** The largest figure size, from `start` down, at which `value` stays on one line in `w`. */
export function figureToken(ctx: LayoutContext, value: string, w: number, start: TypeToken): TypeToken {
  const from = Math.max(0, FIGURE_LADDER.indexOf(start))
  for (const t of FIGURE_LADDER.slice(from)) {
    const st = ctx.resolveText(t, { letterSpacing: -0.03 })
    if (ctx.measureText(value, st, w * 0.94).lines.length <= 1) return t
  }
  return FIGURE_LADDER[FIGURE_LADDER.length - 1]
}

const LETTERS = 'ABCDEFGHIJ'

function hasText(t: unknown): boolean {
  if (typeof t === 'string') return t.trim().length > 0
  return !!t && typeof t === 'object' && Array.isArray((t as RichText).runs) && (t as RichText).runs.some((r) => r.text.trim().length > 0)
}

/** The cells' child specs (without boxes), one per present slot. */
function parts(item: RichItem, i: number, o: Required<Pick<RichOptions, 'marker' | 'part'>> & RichOptions, rung: (typeof RICH_RUNGS)[number]): {
  marker?: BlockSpec
  unit?: BlockSpec
  body: Array<{ key: string; spec: BlockSpec }>
} {
  const p = `${o.part}[${i}]`
  let marker: BlockSpec | undefined
  if (o.marker === 'number') marker = { id: `${p}.marker`, type: 'tls.t.marker', props: { value: String((o.start ?? 1) + i), tone: 'solid', size: 'sm' } }
  else if (o.marker === 'letter') marker = { id: `${p}.marker`, type: 'tls.t.marker', props: { value: LETTERS[i % LETTERS.length], tone: 'soft', size: 'sm' } }
  else if (o.marker === 'icon' && item.marker) marker = { id: `${p}.marker`, type: 'tls.m.icon', props: { icon: item.marker, size: 'md', iconStyle: 'disc' } }
  else if (o.marker === 'label' && item.marker) marker = { id: `${p}.marker`, type: 'tls.t.title', props: { text: item.marker, size: rung.lead, color: 'accent' } }
  else if (o.marker === 'figure' && item.value && item.value.trim()) marker = { id: `value[${i}]`, type: 'tls.t.title', props: { text: item.value.trim(), size: rung.figure, color: 'accent', maxLines: 1 } }
  let unit: BlockSpec | undefined
  if (marker && o.marker === 'figure' && item.unit && item.unit.trim()) unit = { id: `${p}.unit`, type: 'tls.t.title', props: { text: item.unit.trim(), size: rung.lead, color: 'textMuted' } }
  const body: Array<{ key: string; spec: BlockSpec }> = []
  if (hasText(item.lead)) body.push({ key: 'lead', spec: { id: `${p}.lead`, type: 'tls.t.title', props: { text: item.lead, size: rung.lead } } })
  if (hasText(item.text)) body.push({ key: 'text', spec: { id: `${p}.text`, type: 'tls.t.body', props: { text: item.text, size: rung.text } } })
  const pts = (item.points ?? []).filter((t) => typeof t === 'string' && t.trim())
  if (pts.length) body.push({ key: 'points', spec: { id: `${p}.points`, type: 'tls.t.bullets', props: { items: pts.map((text) => ({ text })), spacing: 'sm' } } })
  if (item.note && item.note.trim()) body.push({ key: 'note', spec: { id: `${p}.note`, type: 'tls.t.body', props: { text: item.note.trim(), size: 'body', color: 'textMuted' } } })
  if (item.formula && item.formula.trim()) body.push({ key: 'formula', spec: { id: `${p}.formula`, type: 'tls.t.formula', props: { expression: item.formula, size: 'lead', align: 'start' } } })
  return { marker, unit, body }
}

export interface RichPlan {
  pieces: (x: number, y: number) => Piece[]
  height: number
}

/** Cells of `items` in a `w`-wide area at one rung (heights measured; nothing placed yet). */
export function richCells(ctx: LayoutContext, items: RichItem[], w: number, opts: RichOptions = {}, rung = RICH_RUNGS[0]): RichPlan {
  const o = { marker: 'none' as RichMarker, part: 'item', markerSide: 'left' as const, card: 'none' as RichCard, ...opts }
  const cols = Math.max(1, Math.min(o.columns ?? 1, items.length || 1))
  const sp = ctx.tokens.space
  const gap = o.compact ? sp.sm : sp[o.gap ?? 'lg']
  const cw = Math.max(80, (w - gap * (cols - 1)) / cols)
  const pad = o.card === 'none' ? 0 : sp.md
  const inner = Math.max(60, cw - 2 * pad)
  const inGap = o.compact ? sp.xs : sp.sm
  const cells = items.map((item, i) => {
    const { marker: m0, unit, body } = parts(item, i, o, rung)
    let marker = m0
    let mw = 0
    let mh = 0
    let uh = 0
    if (marker) {
      if (o.marker === 'label' || o.marker === 'figure') mw = o.markerSide === 'left' ? Math.round(inner * (o.labelShare ?? 0.26)) : inner
      else mw = o.marker === 'icon' ? 84 : 48
      if (o.marker === 'figure') marker = { ...marker, props: { ...marker.props, size: figureToken(ctx, String(marker.props.text), mw, rung.figure) } }
      mh = measureHeights(ctx, [marker], mw)[0]
      if (unit) {
        uh = measureHeights(ctx, [unit], mw)[0]
        mh += uh
      }
    }
    const left = marker && o.markerSide === 'left'
    const tx = left ? mw + sp.md : 0
    const tw = Math.max(60, inner - tx)
    const hs = body.map((b) => measureHeights(ctx, [b.spec], tw)[0])
    const textH = hs.reduce((a, h) => a + h, 0) + inGap * Math.max(0, hs.length - 1)
    const contentH = left ? Math.max(mh, textH) : (marker ? mh + inGap : 0) + textH
    return { marker, unit, uh, body, mw, mh, tx, tw, hs, height: contentH + 2 * pad, left }
  })
  const rows: number[] = []
  cells.forEach((c, i) => {
    const r = Math.floor(i / cols)
    rows[r] = Math.max(rows[r] ?? 0, c.height)
  })
  const height = rows.reduce((a, h) => a + h, 0) + gap * Math.max(0, rows.length - 1)
  return {
    height,
    pieces: (x0: number, y0: number) => {
      const out: Piece[] = []
      const rowTop: number[] = []
      let y = y0
      rows.forEach((h, r) => {
        rowTop[r] = y
        y += h + gap
      })
      cells.forEach((c, i) => {
        const r = Math.floor(i / cols)
        const x = x0 + (i % cols) * (cw + gap)
        const top = rowTop[r]
        const p = `${o.part}[${i}]`
        if (o.card !== 'none') {
          out.push({ id: `${p}.card`, spec: { id: `${p}.card`, type: 'tls.l.card', props: { padding: 'md', children: [] } }, box: { x, y: top, width: cw, height: rows[r] } })
        }
        let cy = top + pad
        if (c.marker) {
          out.push({ id: c.marker.id, spec: c.marker, box: { x: x + pad, y: cy, width: c.mw, height: c.mh - c.uh } })
          if (c.unit) out.push({ id: c.unit.id, spec: c.unit, box: { x: x + pad, y: cy + c.mh - c.uh, width: c.mw, height: c.uh } })
          if (!c.left) cy += c.mh + inGap
        }
        c.body.forEach((b, k) => {
          out.push({ id: `${p}.${b.key}`, spec: b.spec, box: { x: x + pad + c.tx, y: cy, width: c.tw, height: c.hs[k] } })
          cy += c.hs[k] + inGap
        })
      })
      return out
    },
  }
}

/** The largest rung whose cells fit in `h`, then the same rungs with tighter gaps, then (4+ cells in one
 *  column of a wide box) in two columns; else the smallest. */
export function richFit(ctx: LayoutContext, items: RichItem[], w: number, h: number, opts: RichOptions = {}): { plan: RichPlan; rung: (typeof RICH_RUNGS)[number] } {
  let last: { plan: RichPlan; rung: (typeof RICH_RUNGS)[number] } | undefined
  // then a single column of 4+ cells in two columns (a long worked example, six steps)
  const tries: RichOptions[] = [{ ...opts }, { ...opts, compact: true }]
  if ((opts.columns ?? 1) === 1 && items.length >= 4 && w >= 1200) tries.push({ ...opts, compact: true, columns: 2 })
  for (const o of tries) {
    for (const rung of RICH_RUNGS) {
      const plan = richCells(ctx, items, w, o, rung)
      last = { plan, rung }
      if (plan.height <= h) return last
    }
  }
  return last!
}

/** A section of a block: extra pieces placed before / after the cells (a claim, a summary bar). */
export interface RichSection {
  spec: BlockSpec
  /** Part name (default: the spec id). */
  part?: string
  /** Width share of the block, from the left (default 1). */
  share?: number
}

/** Height of a stack of section specs at width `w`. */
export function sectionHeights(ctx: LayoutContext, sections: RichSection[], w: number): number[] {
  return sections.map((s) => measureHeights(ctx, [s.spec], w * Math.min(1, s.share ?? 1))[0])
}

/**
 * A whole text-rich block: `head` sections, the cells, `foot` sections, stacked top-down in the box
 * (top-anchored); the cell rung is the largest that fits the box with the sections. The root's height
 * is the content's (the slide places it; a filled region gives it the room, S06).
 */
export function richLayout(ctx: LayoutContext, items: RichItem[], opts: RichOptions = {}, head: RichSection[] = [], foot: RichSection[] = []): LayoutNode {
  const W = Math.max(0, ctx.box.width) || 0
  const H = Math.max(0, ctx.box.height) || 0
  const gap = ctx.tokens.space.lg
  const hh = sectionHeights(ctx, head, W)
  const fh = sectionHeights(ctx, foot, W)
  const fixed = hh.reduce((a, h) => a + h + gap, 0) + fh.reduce((a, h) => a + h + gap, 0)
  const { plan } = richFit(ctx, items, W, H - fixed, opts)
  const pieces: Piece[] = []
  let y = 0
  head.forEach((s, i) => {
    pieces.push({ id: s.part ?? s.spec.id, spec: s.spec, box: { x: 0, y, width: W * Math.min(1, s.share ?? 1), height: hh[i] } })
    y += hh[i] + gap
  })
  pieces.push(...plan.pieces(0, y))
  y += plan.height
  foot.forEach((s, i) => {
    y += gap
    pieces.push({ id: s.part ?? s.spec.id, spec: s.spec, box: { x: 0, y, width: W * Math.min(1, s.share ?? 1), height: fh[i] } })
    y += fh[i]
  })
  return composeFlat(ctx, pieces, Math.max(1, y))
}

/** The build tree (a stack of cards / stacks) of a text-rich block, for the editor's structure view. */
export function richBuild(id: string, items: RichItem[], opts: RichOptions = {}, head: RichSection[] = [], foot: RichSection[] = []): BlockSpec {
  const o = { marker: 'none' as RichMarker, part: 'item', ...opts }
  const cells = items.map((item, i): BlockSpec => {
    const { marker, unit, body } = parts(item, i, o, RICH_RUNGS[0])
    const kids = [...(marker ? [marker] : []), ...(unit ? [unit] : []), ...body.map((b) => b.spec)]
    return o.card !== 'card'
      ? { id: `${o.part}-${i}`, type: 'tls.l.stack', props: { gap: 'sm', sizing: 'content', children: kids } }
      : { id: `${o.part}-${i}`, type: 'tls.l.card', props: { padding: 'md', children: kids } }
  })
  const cols = Math.max(1, Math.min(o.columns ?? 1, cells.length || 1))
  const grid: BlockSpec = cols > 1 ? { id: `${id}-cells`, type: 'tls.l.grid', props: { columns: cols, gap: 'lg', sizing: 'equal', children: cells } } : { id: `${id}-cells`, type: 'tls.l.stack', props: { gap: 'lg', sizing: 'content', children: cells } }
  return { id, type: 'tls.l.stack', props: { gap: 'lg', sizing: 'content', children: [...head.map((s) => s.spec), grid, ...foot.map((s) => s.spec)] } }
}

export type { TypeToken }

/** S09 — specs stacked top-down in a `w`-wide column at (x, y): their pieces and the column height. */
export function stackPieces(ctx: LayoutContext, specs: Array<BlockSpec | undefined | false>, x: number, y: number, w: number, gap: number): { pieces: Piece[]; height: number } {
  const list = specs.filter((s): s is BlockSpec => !!s)
  const hs = measureHeights(ctx, list, w)
  const pieces: Piece[] = []
  let cy = y
  list.forEach((s, i) => {
    pieces.push({ id: s.id, spec: s, box: { x, y: cy, width: w, height: hs[i] } })
    cy += hs[i] + gap
  })
  return { pieces, height: list.length ? cy - gap - y : 0 }
}
