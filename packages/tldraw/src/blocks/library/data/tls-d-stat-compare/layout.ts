/**
 * Pure layout for tls.d.stat-compare — two big numbers with a connector and the change between them.
 *
 * Columns: left value + label, a middle column (connector arrow or "vs", with the delta pill below
 * it), right value + label; an optional caption underneath. Both values share one font size, the
 * largest at which both fit their column. The delta is coloured by polarity: a rise is `positive`
 * when up is good and `negative` when down is good; `neutral` polarity (and no change) uses the
 * `neutral` role.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle } from '../../../types'
import type { StatCompareProps } from './schema'
import { chartColors, clamp, enumOf, fmtNum, fmtSigned, lineH, numOrNull, pathNode, readableOn, root, solidRect, str, style, textAligned, tintOf, TEXT_SLACK, mutedStyle } from '../_chart/kit'

function side(raw: unknown): { label: string; value: number | null } {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return { label: str(o.label), value: numOrNull(o.value) }
}

export function layout(props: StatCompareProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const c = chartColors(ctx)
  const sp = ctx.tokens.space
  const L = side(props.left)
  const R = side(props.right)
  const delta = enumOf(props.delta, ['percent', 'absolute', 'none'] as const, 'percent')
  const polarity = enumOf(props.polarity, ['upGood', 'downGood', 'neutral'] as const, 'upGood')
  const connector = enumOf(props.connector, ['arrow', 'vs', 'none'] as const, 'arrow')
  const fmt = props.format

  const diff = L.value !== null && R.value !== null ? R.value - L.value : null
  const showDelta = delta !== 'none' && diff !== null && (delta === 'absolute' || (L.value as number) !== 0)
  const showMid = connector !== 'none' || showDelta
  const midW = showMid ? clamp(W * 0.24, Math.min(W * 0.34, 100), 260) : 0
  const colW = Math.max(1, (W - midW) / 2)

  const lText = L.value === null ? '–' : fmtNum(L.value, fmt)
  const rText = R.value === null ? '–' : fmtNum(R.value, fmt)
  let vs: ResolvedTextStyle = style(ctx, 'title', c.text)
  for (let k = 0; k < 14; k++) {
    const widest = Math.max(ctx.measureText(lText, vs).width, ctx.measureText(rText, vs).width)
    if (widest * TEXT_SLACK <= colW * 0.96) break
    vs = { ...vs, size: vs.size * 0.88 }
  }
  const vh = lineH(vs)
  const labelStyle = style(ctx, 'caption', c.muted)
  const lm = ctx.measureText(L.label, labelStyle, colW * 0.96)
  const rm = ctx.measureText(R.label, labelStyle, colW * 0.96)
  const labelLines = Math.min(2, Math.max(lm.lines.length, rm.lines.length, L.label || R.label ? 1 : 0))
  const labelH = labelLines * lineH(labelStyle)
  const caption = str(props.caption)
  const capStyle = mutedStyle(ctx, 'footnote')
  const cm = caption ? ctx.measureText(caption, capStyle, W * 0.96) : null
  const capH = cm ? Math.min(2, cm.lines.length) * lineH(capStyle) : 0
  const gap = sp.xs
  const mainH = vh + (labelH ? gap + labelH : 0)
  const total = mainH + (capH ? sp.md + capH : 0)
  const top = Math.max(0, (H - total) / 2)

  const nodes: LayoutNode[] = []
  const put = (txt: string, s: ResolvedTextStyle, x: number, y: number, w: number, part: string) => {
    nodes.push(...textAligned(ctx, txt, s, { x, y, width: w }, 'center', part).nodes)
  }
  put(lText, { ...vs, color: c.text }, 0, top, colW, 'left.value')
  put(rText, { ...vs, color: c.accent }, W - colW, top, colW, 'right.value')
  const putLabel = (txt: string, x: number, part: string) => {
    if (txt) nodes.push(...textAligned(ctx, txt, labelStyle, { x, y: top + vh + gap, width: colW }, 'center', part).nodes.slice(0, 2))
  }
  putLabel(L.label, 0, 'left.label')
  putLabel(R.label, W - colW, 'right.label')

  // Middle column.
  const midX = colW
  const rowCy = top + vh * 0.52
  let pillY = rowCy
  if (connector === 'arrow') {
    const aw = Math.min(midW * 0.5, 64)
    const ah = Math.min(aw * 0.5, vh * 0.5)
    const x0 = midX + (midW - aw) / 2
    const sh = ah * 0.3
    const hx = x0 + aw - ah * 0.9
    const d = `M${x0} ${rowCy - sh / 2}L${hx} ${rowCy - sh / 2}L${hx} ${rowCy - ah / 2}L${x0 + aw} ${rowCy}L${hx} ${rowCy + ah / 2}L${hx} ${rowCy + sh / 2}L${x0} ${rowCy + sh / 2}Z`
    nodes.push(pathNode(ctx, d, 'connector', { fill: c.muted }))
    pillY = rowCy + ah / 2 + sp['2xs']
  } else if (connector === 'vs') {
    const vsS = style(ctx, 'caption', c.muted)
    const t = textAligned(ctx, 'vs', vsS, { x: midX, y: rowCy - lineH(vsS) / 2, width: midW }, 'center', 'connector')
    nodes.push(...t.nodes)
    pillY = rowCy + lineH(vsS) / 2 + sp['2xs']
  }
  if (showDelta && diff !== null) {
    const good = diff === 0 || polarity === 'neutral' ? null : polarity === 'upGood' ? diff > 0 : diff < 0
    const role = good === null ? 'neutral' : good ? 'positive' : 'negative'
    const base = ctx.resolveColor(role).color
    const txt = delta === 'percent' ? `${fmtSigned(((R.value as number) - (L.value as number)) / Math.abs(L.value as number) * 100)}%` : fmtSigned(diff, fmt)
    let ds = style(ctx, 'caption')
    const padX = ds.size * 0.6
    for (let k = 0; k < 8; k++) {
      if (ctx.measureText(txt, ds).width * TEXT_SLACK + 2 * padX <= midW * 0.98) break
      ds = { ...ds, size: ds.size * 0.88 }
    }
    const tw = ctx.measureText(txt, ds).width * 1.12
    const pw = Math.min(midW * 0.98, tw + 2 * (ds.size * 0.6))
    const ph = lineH(ds) + ds.size * 0.4
    const fill = tintOf(c.surface, base, 0.18)
    const py = connector === 'none' ? rowCy - ph / 2 : pillY
    const px = midX + (midW - pw) / 2
    nodes.push(solidRect({ x: px, y: py, width: pw, height: ph }, fill, 'delta', ph / 2))
    const ink = readableOn(base, fill)
    nodes.push(...textAligned(ctx, txt, { ...ds, color: ink }, { x: px, y: py + (ph - lineH(ds)) / 2, width: pw }, 'center', 'delta.text').nodes)
  }
  if (caption && cm) {
    const t = textAligned(ctx, caption, capStyle, { x: 0, y: top + mainH + sp.md, width: W }, 'center', 'caption')
    nodes.push(...t.nodes)
  }
  return root(ctx, nodes)
}
