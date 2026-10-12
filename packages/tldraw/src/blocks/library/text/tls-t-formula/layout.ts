/**
 * Pure layout for tls.t.formula — each line of the expression set on one baseline, subscripts and
 * superscripts two steps down the type scale, lowered / raised by the engine (no Unicode sub/superscript glyphs:
 * most fonts lack them and they render as boxes — spro llm-eval 2026-10-12, "log₂N").
 *
 * The size ladder display → title → heading takes the largest size at which the widest line fits
 * the box; below heading the line overflows and the oracle reports it. Caption under, muted.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle, TypeToken } from '../../../types'
import type { FormulaProps } from './schema'
import { str } from '../_engine/rich'
import { isShown } from '../../../schema-helpers'
import { parseFormula, type Seg } from './parse'

/** The type scale: a script is set two steps below its line (a token size, so the slide keeps
 *  to its few sizes — `type/too-many-sizes`). */
const SCALE: TypeToken[] = ['display', 'title', 'heading', 'subheading', 'lead', 'body', 'caption', 'footnote']
export const MAX_LINES = 4
const LADDER: TypeToken[] = ['display', 'title', 'heading']

function lines(props: FormulaProps): Seg[][] {
  return str(props.expression)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES)
    .map(parseFormula)
}

export function layout(props: FormulaProps, ctx: LayoutContext): LayoutNode {
  const width = Math.max(1, ctx.box.width)
  const sp = ctx.tokens.space
  const text = ctx.resolveColor('text').color
  const muted = ctx.resolveColor('textMuted').color
  const center = props.align !== 'start'
  const rows = lines(props)

  const start = Math.max(0, LADDER.indexOf((props.size as TypeToken) ?? 'title'))
  const styled = (token: TypeToken) => {
    const base: ResolvedTextStyle = { ...ctx.resolveText(token), color: text }
    const script: ResolvedTextStyle = { ...ctx.resolveText(SCALE[Math.min(SCALE.length - 1, SCALE.indexOf(token) + 2)]), color: text }
    const widthOf = (seg: Seg) => ctx.measureText(seg.text, seg.kind === 'base' ? base : script).width
    const rowWidth = (row: Seg[]) => row.reduce((w, s) => w + widthOf(s), 0)
    return { base, script, widthOf, widest: Math.max(0, ...rows.map(rowWidth)), rowWidth }
  }
  let pick = styled(LADDER[start])
  for (let r = start + 1; pick.widest > width && r < LADDER.length; r++) pick = styled(LADDER[r])
  const { base, script, widthOf, rowWidth } = pick

  const rise = Math.round(base.size * 0.38) // room above the line for a superscript
  const drop = Math.round(base.size * 0.22) // room below for a subscript
  const lineH = Math.ceil(base.size * base.lineHeight)
  const rowH = rise + lineH + drop
  const children: LayoutNode[] = []
  let y = 0
  rows.forEach((row, r) => {
    const w = rowWidth(row)
    let x = center ? Math.max(0, (width - w) / 2) : 0
    row.forEach((seg, k) => {
      const style = seg.kind === 'base' ? base : script
      const m = ctx.measureText(seg.text, style)
      const segW = widthOf(seg)
      const top =
        seg.kind === 'base' ? y + rise
        : seg.kind === 'sup' ? y + Math.round(rise * 0.2)
        : y + rise + lineH - Math.ceil(script.size * script.lineHeight) + drop
      children.push({
        k: 'text',
        part: rows.length > 1 || row.length > 1 ? `expr[${r}.${k}]` : 'expr',
        box: { x, y: top, width: segW + 1, height: m.height },
        lines: m.lines.slice(0, 1),
        style,
        propPath: 'expression',
      })
      x += segW
    })
    y += rowH + (r < rows.length - 1 ? sp.sm : 0)
  })

  const caption = isShown(props, 'showCaption') ? str(props.caption) : ''
  if (caption) {
    y += sp.md
    const style: ResolvedTextStyle = { ...ctx.resolveText('body'), color: muted }
    const m = ctx.measureText(caption, style, width)
    const cx = center ? Math.max(0, (width - m.width) / 2) : 0
    children.push({ k: 'text', part: 'caption', box: { x: cx, y, width: Math.min(width, m.width + 1), height: m.height }, lines: m.lines, style, propPath: 'caption', ...(center ? { align: 'center' as const } : {}) })
    y += m.height
  }
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width, height: y }, children }
}
