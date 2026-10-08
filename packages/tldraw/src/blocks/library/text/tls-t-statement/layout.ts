/**
 * Pure layout for tls.t.statement — one large sentence stated as the slide's message.
 *
 * Autofit walks the size ladder xl -> lg -> md (never below the requested size's own rung) until
 * the text fits the box. `**strong**` runs render as accent-coloured bold text, with an accent
 * underline rect, or with an accent-tinted rect behind them. Emphasis rects are derived from the
 * final, post-autofit text style, so they always sit on their runs.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, ResolvedTextStyle, Size, TypeToken } from '../../../types'
import type { StatementProps } from './schema'
import { placeText, alignedX, type HAlign, type PlacedText } from '../_engine/text-place'
import { hasStrong, str, toMeasurable } from '../_engine/rich'
import { tintOf } from '../_engine/color'
import { isShown } from '../../../schema-helpers'
import { tableMetrics } from '../../../layout/measure'

/**
 * Run offsets for the underline / highlight rects come from the per-glyph advance table, not
 * `ctx.measureText`: the estimate charges every glyph the same and runs 15-30% wide on large Inter
 * text, so a highlight measured with it lands several words to the right of its run (review G02,
 * `t-statement.wide.png`). The table is within ~3% of the browser; bold Inter is ~8% wider than
 * the regular face the table describes.
 */
const TABLE = tableMetrics()
export const BOLD_WIDTH_FACTOR = 1.08

/** Rendered width of a single-line run at `style`. */
export function runWidth(text: string, style: ResolvedTextStyle, bold = false): number {
  if (!text) return 0
  try {
    const w = TABLE(text, style).lines[0]?.width ?? 0
    return bold ? w * BOLD_WIDTH_FACTOR : w
  } catch {
    return 0
  }
}

export const LADDER: Array<{ id: 'xl' | 'lg' | 'md'; token: TypeToken }> = [
  { id: 'xl', token: 'title' },
  { id: 'lg', token: 'heading' },
  { id: 'md', token: 'subheading' },
]

/** Hint reported to the planner when the text cannot fit even at md. */
export const SHORTEN_HINT_CHARS = 100

function rung(size: unknown): number {
  const i = LADDER.findIndex((l) => l.id === size)
  return i >= 0 ? i : 1
}

function alignOf(props: StatementProps): HAlign {
  return props.align === 'center' ? 'center' : 'start'
}

interface Fitted {
  rung: number
  placed: PlacedText
  style: ResolvedTextStyle
  textMeasurable: ReturnType<typeof toMeasurable>
  attribution?: { placed: PlacedText; style: ResolvedTextStyle }
  markH: number
  top: number
  height: number
  overflow: boolean
}

function fit(props: StatementProps, ctx: LayoutContext, width: number, height: number): Fitted {
  const align = alignOf(props)
  const emphasis = props.emphasis === 'underline' || props.emphasis === 'highlight' ? props.emphasis : 'accent'
  const accent = ctx.resolveColor('accent').color
  const textColor = ctx.resolveColor('text').color
  const measurable = toMeasurable(props.text, emphasis === 'accent' ? accent : undefined)
  const showMark = isShown(props, 'showMark')
  const attributionText = isShown(props, 'showAttribution') ? str(props.attribution) : ''
  const sp = ctx.tokens.space

  const markH = showMark ? 6 : 0
  const markBlock = showMark ? markH + sp.md : 0
  const attrStyle: ResolvedTextStyle = { ...ctx.resolveText('body'), color: ctx.resolveColor('textMuted').color }
  let attr: Fitted['attribution']
  let attrBlock = 0
  if (attributionText) {
    const placed = placeText(ctx, attributionText, attrStyle, { x: 0, y: 0, width }, align, { part: 'attribution', propPath: 'attribution' })
    attr = { placed, style: attrStyle }
    attrBlock = sp.md + placed.height
  }

  let chosen = rung(props.size)
  let result: { placed: PlacedText; style: ResolvedTextStyle } | undefined
  for (let r = chosen; r < LADDER.length; r++) {
    const style: ResolvedTextStyle = { ...ctx.resolveText(LADDER[r].token), color: textColor }
    const placed = placeText(ctx, measurable, style, { x: 0, y: markBlock, width }, align, { part: 'text', propPath: 'text' })
    result = { placed, style }
    chosen = r
    if (markBlock + placed.height + attrBlock <= height + 0.5) break
  }
  const { placed, style } = result!
  const total = markBlock + placed.height + attrBlock
  return {
    rung: chosen,
    placed,
    style,
    textMeasurable: measurable,
    attribution: attr,
    markH,
    top: markBlock,
    height: total,
    overflow: total > height + 0.5,
  }
}

export function layout(props: StatementProps, ctx: LayoutContext): LayoutNode {
  const width = Math.max(1, ctx.box.width)
  const align = alignOf(props)
  const emphasis = props.emphasis === 'underline' || props.emphasis === 'highlight' ? props.emphasis : 'accent'
  const f = fit(props, ctx, width, ctx.box.height)
  const children: LayoutNode[] = []

  if (f.markH > 0) {
    const w = 96
    children.push({
      k: 'rect',
      part: 'mark',
      box: { x: alignedX(0, width, w, align), y: 0, width: Math.min(w, width), height: f.markH },
      fill: { type: 'solid', color: ctx.resolveColor('accent').color },
      radius: f.markH / 2,
    })
  }

  // Emphasis rects go behind the text, so they are pushed first. They sit in one `emphasis`
  // group (RVM2) so the motion recipe can sweep them in: a bare `emphasis[l.r]` leaf matched no
  // recipe part and showed with the block fade, still, before its words rose in.
  const marks: LayoutNode[] = []
  if (emphasis !== 'accent' && hasStrong(props.text)) {
    const accent = ctx.resolveColor('accent').color
    const tint = tintOf(ctx.resolveColor('surface').color, accent, 0.28)
    const size = f.style.size
    f.placed.lines.forEach((g, li) => {
      const runs = g.line.runs ?? []
      let cursor = g.x
      runs.forEach((run, ri) => {
        const isLast = ri === runs.length - 1
        const shown = isLast ? run.text.replace(/\s+$/, '') : run.text
        const w = runWidth(run.text, f.style, !!run.bold)
        if (run.bold && shown.trim().length > 0) {
          const sw = Math.min(runWidth(shown, f.style, true), Math.max(0, width - cursor))
          if (emphasis === 'highlight') {
            const padX = Math.round(size * 0.08)
            marks.push({
              k: 'rect',
              part: `emphasis[${li}.${ri}]`,
              box: { x: cursor - padX, y: g.y + size * 0.06, width: sw + padX * 2, height: g.height - size * 0.12 },
              fill: { type: 'solid', color: tint },
              radius: Math.round(size * 0.12),
            })
          } else {
            const th = Math.max(4, Math.round(size * 0.07))
            marks.push({
              k: 'rect',
              part: `emphasis[${li}.${ri}]`,
              box: { x: cursor, y: g.y + g.height - size * 0.12 - th, width: sw, height: th },
              fill: { type: 'solid', color: accent },
              radius: th / 2,
            })
          }
        }
        cursor += w
      })
    })
  }
  if (marks.length > 0) {
    // The group hugs its rects, so a left-to-right wipe sweeps over the marked words only.
    const x0 = Math.min(...marks.map((m) => m.box.x))
    const y0 = Math.min(...marks.map((m) => m.box.y))
    const x1 = Math.max(...marks.map((m) => m.box.x + m.box.width))
    const y1 = Math.max(...marks.map((m) => m.box.y + m.box.height))
    children.push({
      k: 'group',
      part: 'emphasis',
      box: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
      children: marks.map((m) => ({ ...m, box: { ...m.box, x: m.box.x - x0, y: m.box.y - y0 } }) as LayoutNode),
    })
  }

  children.push(...f.placed.nodes)

  let bottom = f.top + f.placed.height
  if (f.attribution) {
    const y = bottom + ctx.tokens.space.md
    const a = placeText(ctx, str(props.attribution), f.attribution.style, { x: 0, y, width }, align, {
      part: 'attribution',
      propPath: 'attribution',
    })
    children.push(...a.nodes)
    bottom = y + a.height
  }

  return { k: 'group', part: 'root', box: { x: 0, y: 0, width, height: bottom }, children }
}

export function capacity(props: StatementProps, box: Size, ctx: LayoutContext): CapacityReport {
  const f = fit(props, ctx, Math.max(1, box.width), box.height)
  const used = plainLength(props.text)
  const mdStyle = ctx.resolveText(LADDER[LADDER.length - 1].token)
  const perLine = Math.max(1, Math.floor(box.width / (mdStyle.size * 0.55)))
  const lines = Math.max(1, Math.floor(box.height / (mdStyle.size * mdStyle.lineHeight)))
  return {
    fits: !f.overflow,
    budget: {
      text: { max: Math.min(SHORTEN_HINT_CHARS, Math.floor(perLine * lines * 0.9)), used, unit: 'chars' },
      lines: { max: lines, used: f.placed.lineCount, unit: 'lines' },
    },
    remedy: f.overflow ? [{ kind: 'truncate', slot: 'text' }] : [],
  }
}

function plainLength(text: unknown): number {
  const m = toMeasurable(text)
  return typeof m === 'string' ? m.length : m.runs.reduce((n, r) => n + r.text.length, 0)
}
