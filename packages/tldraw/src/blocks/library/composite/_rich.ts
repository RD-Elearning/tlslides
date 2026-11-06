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
}

export type RichMarker = 'number' | 'letter' | 'icon' | 'label' | 'none'
/** `card`: each cell on the deck style's card (filled, outline, glass… by the style). */
export type RichCard = 'none' | 'card'

export interface RichOptions {
  columns?: 1 | 2 | 3
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
}

/** The type rungs tried, largest first: lead line and paragraph sizes. */
export const RICH_RUNGS: ReadonlyArray<{ lead: 'subheading' | 'lead' | 'body'; text: 'lead' | 'body' }> = [
  { lead: 'subheading', text: 'body' },
  { lead: 'lead', text: 'body' },
  { lead: 'body', text: 'body' },
]

const LETTERS = 'ABCDEFGHIJ'

function hasText(t: unknown): boolean {
  if (typeof t === 'string') return t.trim().length > 0
  return !!t && typeof t === 'object' && Array.isArray((t as RichText).runs) && (t as RichText).runs.some((r) => r.text.trim().length > 0)
}

/** The cells' child specs (without boxes), one per present slot. */
function parts(item: RichItem, i: number, o: Required<Pick<RichOptions, 'marker' | 'part'>> & RichOptions, rung: (typeof RICH_RUNGS)[number]): {
  marker?: BlockSpec
  body: Array<{ key: string; spec: BlockSpec }>
} {
  const p = `${o.part}[${i}]`
  let marker: BlockSpec | undefined
  if (o.marker === 'number') marker = { id: `${p}.marker`, type: 'tls.t.marker', props: { value: String((o.start ?? 1) + i), tone: 'solid', size: 'sm' } }
  else if (o.marker === 'letter') marker = { id: `${p}.marker`, type: 'tls.t.marker', props: { value: LETTERS[i % LETTERS.length], tone: 'soft', size: 'sm' } }
  else if (o.marker === 'icon' && item.marker) marker = { id: `${p}.marker`, type: 'tls.m.icon', props: { icon: item.marker, size: 'md', iconStyle: 'disc' } }
  else if (o.marker === 'label' && item.marker) marker = { id: `${p}.marker`, type: 'tls.t.title', props: { text: item.marker, size: rung.lead, color: 'accent' } }
  const body: Array<{ key: string; spec: BlockSpec }> = []
  if (hasText(item.lead)) body.push({ key: 'lead', spec: { id: `${p}.lead`, type: 'tls.t.title', props: { text: item.lead, size: rung.lead } } })
  if (hasText(item.text)) body.push({ key: 'text', spec: { id: `${p}.text`, type: 'tls.t.body', props: { text: item.text, size: rung.text } } })
  const pts = (item.points ?? []).filter((t) => typeof t === 'string' && t.trim())
  if (pts.length) body.push({ key: 'points', spec: { id: `${p}.points`, type: 'tls.t.bullets', props: { items: pts.map((text) => ({ text })), spacing: 'sm' } } })
  if (item.formula && item.formula.trim()) body.push({ key: 'formula', spec: { id: `${p}.formula`, type: 'tls.t.formula', props: { expression: item.formula, size: 'lead', align: 'start' } } })
  return { marker, body }
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
  const gap = sp[o.gap ?? 'lg']
  const cw = Math.max(80, (w - gap * (cols - 1)) / cols)
  const pad = o.card === 'none' ? 0 : sp.md
  const inner = Math.max(60, cw - 2 * pad)
  const inGap = sp.sm
  const cells = items.map((item, i) => {
    const { marker, body } = parts(item, i, o, rung)
    let mw = 0
    let mh = 0
    if (marker) {
      if (o.marker === 'label') mw = o.markerSide === 'left' ? Math.round(inner * (o.labelShare ?? 0.26)) : inner
      else mw = o.marker === 'icon' ? 84 : 48
      mh = measureHeights(ctx, [marker], mw)[0]
    }
    const left = marker && o.markerSide === 'left'
    const tx = left ? mw + sp.md : 0
    const tw = Math.max(60, inner - tx)
    const hs = body.map((b) => measureHeights(ctx, [b.spec], tw)[0])
    const textH = hs.reduce((a, h) => a + h, 0) + inGap * Math.max(0, hs.length - 1)
    const contentH = left ? Math.max(mh, textH) : (marker ? mh + inGap : 0) + textH
    return { marker, body, mw, mh, tx, tw, hs, height: contentH + 2 * pad, left }
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
          out.push({ id: `${p}.marker`, spec: c.marker, box: { x: x + pad, y: cy, width: c.mw, height: c.mh } })
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

/** The largest rung whose cells fit in `h` (else the smallest): the plan and its rung. */
export function richFit(ctx: LayoutContext, items: RichItem[], w: number, h: number, opts: RichOptions = {}): { plan: RichPlan; rung: (typeof RICH_RUNGS)[number] } {
  let last: { plan: RichPlan; rung: (typeof RICH_RUNGS)[number] } | undefined
  for (const rung of RICH_RUNGS) {
    const plan = richCells(ctx, items, w, opts, rung)
    last = { plan, rung }
    if (plan.height <= h) return last
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
    const { marker, body } = parts(item, i, o, RICH_RUNGS[0])
    const kids = [...(marker ? [marker] : []), ...body.map((b) => b.spec)]
    return o.card !== 'card'
      ? { id: `${o.part}-${i}`, type: 'tls.l.stack', props: { gap: 'sm', sizing: 'content', children: kids } }
      : { id: `${o.part}-${i}`, type: 'tls.l.card', props: { padding: 'md', children: kids } }
  })
  const cols = Math.max(1, Math.min(o.columns ?? 1, cells.length || 1))
  const grid: BlockSpec = cols > 1 ? { id: `${id}-cells`, type: 'tls.l.grid', props: { columns: cols, gap: 'lg', sizing: 'equal', children: cells } } : { id: `${id}-cells`, type: 'tls.l.stack', props: { gap: 'lg', sizing: 'content', children: cells } }
  return { id, type: 'tls.l.stack', props: { gap: 'lg', sizing: 'content', children: [...head.map((s) => s.spec), grid, ...foot.map((s) => s.spec)] } }
}

export type { TypeToken }
