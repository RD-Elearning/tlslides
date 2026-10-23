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

export const LADDER: Array<{ id: 'display' | 'xl' | 'lg' | 'md'; token: TypeToken }> = [
  // AC8.5: the display rung, for a statement alone on a slide (`content-statement`): title-size
  // type on an empty slide reads unfinished. Taken only while the text keeps to 3 lines.
  { id: 'display', token: 'display' },
  { id: 'xl', token: 'title' },
  { id: 'lg', token: 'heading' },
  { id: 'md', token: 'subheading' },
]

/** Hint reported to the planner when the text cannot fit even at md. */
export const SHORTEN_HINT_CHARS = 100

/** Most lines the display rung may take before the ladder steps down to xl. */
export const DISPLAY_MAX_LINES = 3

function rung(size: unknown): number {
  const i = LADDER.findIndex((l) => l.id === size)
  return i >= 0 ? i : LADDER.findIndex((l) => l.id === 'lg')
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
    const tooLong = LADDER[r].id === 'display' && placed.lineCount > DISPLAY_MAX_LINES && r < LADDER.length - 1
    if (!tooLong && markBlock + placed.height + attrBlock <= height + 0.5) break
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

/**
 * vivid V4 — an open hand-drawn loop: an ellipse (cubic segments) tilted a few degrees, starting
 * above the left end and running a little past a full turn so its ends cross, as a pen circling a
 * word does. `seed` varies the tilt and overshoot between runs.
 */
export function loopPath(cx: number, cy: number, rx: number, ry: number, seed = 0): string {
  const f = (v: number) => String(Math.round(v * 100) / 100)
  const tilt = ((((seed * 37) % 7) - 3) * Math.PI) / 180
  const a0 = (-160 * Math.PI) / 180
  const sweep = ((372 + ((seed * 13) % 9)) * Math.PI) / 180
  const segs = 6
  const da = sweep / segs
  const k = (4 / 3) * Math.tan(da / 4)
  // a slowly growing radius: the second pass sits just outside the first
  const at = (a: number, grow: number) => {
    const x = (rx + grow) * Math.cos(a)
    const y = (ry + grow * 0.5) * Math.sin(a)
    return { x: cx + x * Math.cos(tilt) - y * Math.sin(tilt), y: cy + x * Math.sin(tilt) + y * Math.cos(tilt) }
  }
  const tan = (a: number, grow: number) => {
    const x = -(rx + grow) * Math.sin(a)
    const y = (ry + grow * 0.5) * Math.cos(a)
    return { x: x * Math.cos(tilt) - y * Math.sin(tilt), y: x * Math.sin(tilt) + y * Math.cos(tilt) }
  }
  const g = (i: number) => (Math.min(rx, ry) * 0.06 * i) / segs
  const p0 = at(a0, 0)
  let d = `M${f(p0.x)} ${f(p0.y)}`
  for (let i = 0; i < segs; i++) {
    const a = a0 + i * da
    const b = a + da
    const p = at(a, g(i))
    const q = at(b, g(i + 1))
    const tp = tan(a, g(i))
    const tq = tan(b, g(i + 1))
    d += `C${f(p.x + k * tp.x)} ${f(p.y + k * tp.y)} ${f(q.x - k * tq.x)} ${f(q.y - k * tq.y)} ${f(q.x)} ${f(q.y)}`
  }
  return d
}

export function layout(props: StatementProps, ctx: LayoutContext): LayoutNode {
  const width = Math.max(1, ctx.box.width)
  const align = alignOf(props)
  const emphasis = props.emphasis === 'underline' || props.emphasis === 'highlight' || props.emphasis === 'circle' ? props.emphasis : 'accent'
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
  const circles: LayoutNode[] = []
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
          if (emphasis === 'circle') {
            // vivid V4: a hand-drawn loop around the run — an ellipse a little larger than the
            // words, tilted, its ends overshooting; kept inside the block box
            const rx = Math.max(4, Math.min(sw / 2 + size * 0.12, width / 2))
            const cx = Math.min(width - rx, Math.max(rx, cursor + sw / 2))
            const th = Math.max(3, Math.round(size * 0.06))
            const room = Math.max(g.y + g.height, ctx.box.height)
            const cy = g.y + g.height / 2
            const ry = Math.max(4, Math.min(g.height / 2, cy - th, room - cy - th))
            circles.push({
              k: 'path',
              part: `circle[${li}.${ri}]`,
              box: { x: 0, y: 0, width, height: room },
              d: loopPath(cx, cy, rx - th / 2, ry - th / 2, li * 7 + ri),
              stroke: { color: accent, width: th },
            })
          } else if (emphasis === 'highlight') {
            const padX = Math.round(size * 0.08)
            // Clamped to the block box: a marked run that starts (or ends) a line would otherwise
            // push its pad past the box edge (LO6: true widths wrap the example's run to a line start).
            const hx0 = Math.max(0, cursor - padX)
            const hx1 = Math.min(width, cursor + sw + padX)
            marks.push({
              k: 'rect',
              part: `emphasis[${li}.${ri}]`,
              box: { x: hx0, y: g.y + size * 0.06, width: Math.max(0, hx1 - hx0), height: g.height - size * 0.12 },
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
  // the loops go over the words (an open stroke never hides them) and draw on after them
  if (circles.length > 0) children.push({ k: 'group', part: 'circle', box: { x: 0, y: 0, width, height: Math.max(...circles.map((c) => c.box.height)) }, children: circles })

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

  // a loop reaches a little past its line (never past the box); its boxes end where the block does
  for (const c of circles) if (c.k === 'path') bottom = Math.max(bottom, Math.min(c.box.height, pathBottom(c.d) + 2))
  for (const c of circles) c.box = { ...c.box, height: bottom }
  for (const g of children) if (g.k === 'group' && g.part === 'circle') g.box = { ...g.box, height: bottom }
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width, height: bottom }, children }
}

/** The lowest y a path's points reach (its control points included: an upper bound). */
function pathBottom(d: string): number {
  const nums = d.match(/-?\d+(?:\.\d+)?/g) ?? []
  let y = 0
  for (let i = 1; i < nums.length; i += 2) y = Math.max(y, Number(nums[i]))
  return y
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
