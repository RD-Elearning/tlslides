/**
 * Pure layout for tls.g.pros-cons — two columns, a heading each, a mark + text row per point, and an
 * optional verdict band across the bottom.
 *
 * Pros carry a positive tick in a filled circle, cons a negative cross. `columns` draws a heading
 * with a coloured rule and a hairline between the columns; `cards` puts each column on a tinted card.
 * `auto` balance gives the column with more text more width. Rows are as tall as their clipped text;
 * the allowed lines per point shrink (3 -> 1) so a full list always fits the box.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import { scaleIconPath } from '../../../icons/scale-path'
import { iconLeaf } from '../../text/_engine/icon'
import { CROSS_PATH } from '../../text/tls-t-checklist/layout'
import type { ProsConsProps } from './schema'
import { PROS_CONS_MAX } from './schema'
import { asArr, capacityOf, chartColors, clamp, dot, emptyState, enumOf, linesHeight, lineH, onColor, placeLines, root, solidRect, str, style, tintOf } from '../_kit'
import { withRealWidths } from '../../data/_chart/kit'

const COL_GAP = 40
const ROW_GAP_MAX = 14

const items = (v: unknown): string[] => asArr(v).map(str).filter((s) => s.trim() !== '').slice(0, PROS_CONS_MAX)

export function layout(props: ProsConsProps, ctx0: LayoutContext): LayoutNode {
  // Browser-true single-line widths: axis labels and captions are anchored by their width (RV06).
  const ctx = withRealWidths(ctx0)
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const pros = items(props.pros)
  const cons = items(props.cons)
  if (pros.length + cons.length === 0) return emptyState(ctx, 'No points')
  const c = chartColors(ctx)
  const positive = ctx.resolveColor('positive').color
  const negative = ctx.resolveColor('negative').color
  const cards = enumOf(props.style, ['columns', 'cards'] as const, 'columns') === 'cards'
  const auto = enumOf(props.balance, ['equal', 'auto'] as const, 'equal') === 'auto'
  const verdict = isShown(props, 'showVerdict') ? str(props.verdict).trim() : ''
  const headS = style(ctx, 'subheading', c.text)
  const bigS = style(ctx, 'caption', c.text)
  const nodes: LayoutNode[] = []

  // Column widths.
  const weight = (list: string[]) => list.reduce((n, s) => n + s.length, 0) + 40
  const wp = weight(pros)
  const wc = weight(cons)
  const share = auto ? clamp(wp / (wp + wc), 0.38, 0.62) : 0.5
  const usable = W - COL_GAP
  const colW = [usable * share, usable * (1 - share)]
  const colX = [0, colW[0] + COL_GAP]

  // Vertical budget.
  const pad = cards ? 20 : 0
  const headH = Math.min(headS.size * headS.lineHeight, 60)
  const ruleGap = cards ? 12 : 16
  const headBlock = headH + ruleGap + (cards ? 0 : 3 + 8)
  let verdictH = 0
  let verdictLines = 0
  const vS = style(ctx, 'caption', c.text)
  const vPad = 14
  if (verdict) {
    verdictLines = Math.max(1, Math.min(2, Math.floor((H * 0.22 - 2 * vPad) / lineH(vS))))
    verdictH = linesHeight(ctx, verdict, vS, Math.max(10, W - 2 * (vPad + 12)), verdictLines) + 2 * vPad
  }
  const bodyTop = pad + headBlock
  const bodyH = Math.max(1, H - verdictH - (verdict ? 20 : 0) - bodyTop - pad)
  const maxRows = Math.max(1, pros.length, cons.length)
  // Dense lists drop to the smaller text size and a tighter gap so every point stays on the block.
  const pitch = bodyH / maxRows
  const textS = pitch < lineH(bigS) + 8 ? style(ctx, 'footnote', c.text) : bigS
  const lh = lineH(textS)
  const ROW_GAP = clamp(pitch - lh, 3, ROW_GAP_MAX)
  const linesAllowed = clamp(Math.floor((pitch - ROW_GAP) / lh), 1, 3)
  const MARK = Math.round(clamp(Math.min(lh * 0.95, pitch - ROW_GAP), 14, 30))
  const colH = H - verdictH - (verdict ? 20 : 0)

  const column = (idx: 0 | 1, title: string, list: string[], color: string, kind: 'pro' | 'con') => {
    const x = colX[idx]
    const w = colW[idx]
    const name = kind === 'pro' ? 'pros' : 'cons'
    const out: LayoutNode[] = []
    if (cards) out.push({ k: 'rect', part: `${name}[card]`, box: { x, y: 0, width: w, height: colH }, fill: { type: 'solid', color: tintOf(c.surface, color, 0.1) }, stroke: { color: tintOf(c.surface, color, 0.5), width: 2 }, radius: 16 })
    const ix = x + pad
    const iw = Math.max(10, w - 2 * pad)
    out.push(...placeLines(ctx, title, { ...headS, color: kind === 'pro' ? color : color }, { x: ix, y: pad, width: iw }, 'start', 1, `${name}[title]`).nodes)
    if (!cards) out.push(solidRect({ x: ix, y: pad + headH + 8, width: iw, height: 3 }, color, `${name}[rule]`))
    const tx = ix + MARK + 14
    const tw = Math.max(10, iw - MARK - 14)
    let y = bodyTop
    list.forEach((text, i) => {
      const h = linesHeight(ctx, text, textS, tw, linesAllowed)
      const rowH = Math.max(h, MARK)
      out.push(dot(ix + MARK / 2, y + Math.min(lh, rowH) / 2 + (rowH > lh ? 0 : 0), MARK / 2, color, `${name}[mark][${i}]`))
      const gx = ix + MARK * 0.2
      const gy = y + Math.min(lh, rowH) / 2 - MARK / 2 + MARK * 0.2
      const gs = MARK * 0.6
      const ink = onColor(ctx, color)
      if (kind === 'pro') out.push(iconLeaf('check', { x: gx, y: gy, width: gs, height: gs }, ink, `${name}[icon][${i}]`))
      else out.push({ k: 'icon', part: `${name}[icon][${i}]`, box: { x: gx, y: gy, width: gs, height: gs }, icon: scaleIconPath(CROSS_PATH, gs / 24), fill: ink, strokeWidth: Math.max(1.5, gs / 12) })
      out.push(...placeLines(ctx, text, textS, { x: tx, y: y + Math.max(0, (MARK - lh) / 2), width: tw }, 'start', linesAllowed, `${name}[text][${i}]`).nodes)
      y += Math.max(rowH, MARK) + ROW_GAP
    })
    nodes.push({ k: 'group', part: name, box: { x: 0, y: 0, width: W, height: H }, children: out })
  }
  column(0, str(props.prosTitle).trim() || 'Pros', pros, positive, 'pro')
  column(1, str(props.consTitle).trim() || 'Cons', cons, negative, 'con')

  if (!cards && colH > 40) nodes.push(solidRect({ x: colW[0] + COL_GAP / 2 - 1, y: 0, width: 2, height: colH }, c.line, 'divider'))

  if (verdict) {
    const vout: LayoutNode[] = []
    const y = H - verdictH
    vout.push({ k: 'rect', part: 'verdict[band]', box: { x: 0, y, width: W, height: verdictH }, fill: { type: 'solid', color: tintOf(c.surface, c.accent, 0.16) }, stroke: { color: c.accent, width: 2 }, radius: 14 })
    const vw = Math.max(10, W - 2 * (vPad + 12))
    const th = linesHeight(ctx, verdict, vS, vw, verdictLines)
    vout.push(...placeLines(ctx, verdict, vS, { x: vPad + 12, y: y + (verdictH - th) / 2, width: vw }, 'center', verdictLines, 'verdict[text]').nodes)
    nodes.push({ k: 'group', part: 'verdict', box: { x: 0, y: 0, width: W, height: H }, children: vout })
  }
  return root(ctx, nodes)
}

export function capacity(props: ProsConsProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf(
    { pros: { max: PROS_CONS_MAX, used: asArr(props.pros).length }, cons: { max: PROS_CONS_MAX, used: asArr(props.cons).length } },
    true,
    [{ kind: 'truncate', slot: 'pros' }, { kind: 'paginate' }]
  )
}
