/**
 * Pure layout for tls.d.icon-array — `value` of `total` icons filled (a pictogram), a large figure
 * (7/10 or 70%) with the label beside a wide box or above a tall one, and a caption.
 *
 * The grid takes the shape that gives the largest icon in its area (columns tried from 1 to the
 * count); filled icons come first in reading order. The figure counts up as the icons pop in.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { IconArrayProps } from './schema'
import { ICON_ARRAY_MAX } from './schema'
import { capacityOf, chartColors, emptyState, enumOf, fmtNum, lineH, mutedStyle, numOrNull, root, str, style, textAligned } from '../_chart/kit'
import { iconLeaf } from '../../text/_engine/icon'
import { placeLines } from '../../diagram/_kit'

/** The best grid for `n` square cells in w×h: of the column counts whose cell is within 85 % of the
 *  largest, the one with the fewest empty cells (10 icons as 5×2, not 4×3 with two in the last row). */
export function iconGrid(n: number, w: number, h: number): { cols: number; rows: number; cell: number } {
  const all: Array<{ cols: number; rows: number; cell: number }> = []
  for (let cols = 1; cols <= Math.max(1, n); cols++) {
    const rows = Math.ceil(Math.max(1, n) / cols)
    all.push({ cols, rows, cell: Math.min(w / cols, h / rows) })
  }
  const top = Math.max(...all.map((g) => g.cell))
  const empty = (g: { cols: number; rows: number }) => g.cols * g.rows - Math.max(1, n)
  return all.filter((g) => g.cell >= top * 0.85).sort((a, b) => empty(a) - empty(b) || b.cell - a.cell)[0]
}

export function layout(props: IconArrayProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const totalRaw = numOrNull(props.total)
  const total = Math.max(1, Math.min(ICON_ARRAY_MAX, Math.round(totalRaw ?? 10)))
  const valueRaw = numOrNull(props.value)
  if (valueRaw === null) return emptyState(ctx, 'No value')
  const filled = Math.max(0, Math.min(total, Math.round(valueRaw)))
  const c = chartColors(ctx)
  const tone = enumOf(props.tone, ['accent', 'accent2', 'negative', 'positive'] as const, 'accent')
  const on = ctx.resolveColor(tone).color
  const off = c.track
  const figureMode = enumOf(props.figure, ['fraction', 'percent', 'none'] as const, 'fraction')
  const sp = ctx.tokens.space
  const label = str(props.label)
  const caption = str(props.caption)

  // the text panel: beside the icons in a wide box, above them in a tall one
  const wide = W >= H * 1.25
  const textW = wide ? Math.min(W * 0.4, Math.max(200, W * 0.34)) : W
  const fig = figureMode === 'none' ? '' : figureMode === 'percent' ? `${fmtNum(Math.round((filled / total) * 100), 'plain', ctx.tokens.locale)}%` : `${filled}/${total}`
  let figS = style(ctx, 'display', on)
  for (let k = 0; k < 6 && fig && ctx.measureText(fig, figS).width * 1.08 > textW; k++) figS = { ...figS, size: figS.size * 0.85 }
  const labelS = style(ctx, 'subheading', c.text)
  const capS = mutedStyle(ctx, 'footnote')

  // the text stack, made smaller until it fits its room: fewer label lines, no caption, a smaller figure
  const room = wide ? H : H * 0.5
  const build = (labelLines: number, withCaption: boolean, figK: number) => {
    const nodes: LayoutNode[] = []
    let y = 0
    const fs = { ...figS, size: figS.size * figK }
    if (fig) {
      const t = textAligned(ctx, fig, fs, { x: 0, y, width: textW }, wide ? 'start' : 'center', 'value')
      nodes.push(...t.nodes)
      y += t.height + sp['2xs']
    }
    if (label) {
      const t = placeLines(ctx, label, labelS, { x: 0, y, width: textW }, wide ? 'start' : 'center', labelLines, 'label')
      nodes.push(...t.nodes)
      y += t.height + sp['2xs']
    }
    if (caption && withCaption) {
      const t = placeLines(ctx, caption, capS, { x: 0, y, width: textW }, wide ? 'start' : 'center', 2, 'caption')
      nodes.push(...t.nodes)
      y += t.height
    }
    return { nodes, height: Math.max(0, y) }
  }
  let built = build(3, true, 1)
  for (const [lines, cap, k] of [[2, true, 1], [2, false, 1], [2, false, 0.8], [1, false, 0.7], [1, false, 0.55]] as const) {
    if (built.height <= room) break
    built = build(lines, cap, k)
  }
  const text = built.nodes
  const textH = built.height

  const gap = wide ? sp.lg : sp.md
  const area = wide ? { x: textW + gap, y: 0, width: Math.max(1, W - textW - gap), height: H } : { x: 0, y: textH + gap, width: W, height: Math.max(1, H - textH - gap) }
  const g = iconGrid(total, area.width, area.height)
  // an icon is 78 % of its cell; the grid is centred in its area
  const iconS = Math.max(1, g.cell * 0.78)
  const gx = area.x + (area.width - g.cols * g.cell) / 2
  const gy = area.y + (area.height - g.rows * g.cell) / 2
  const icons: LayoutNode[] = []
  for (let i = 0; i < total; i++) {
    const col = i % g.cols
    const row = Math.floor(i / g.cols)
    const x = gx + col * g.cell + (g.cell - iconS) / 2
    const yy = gy + row * g.cell + (g.cell - iconS) / 2
    icons.push(iconLeaf(props.icon || 'user', { x, y: yy, width: iconS, height: iconS }, i < filled ? on : off, `${i < filled ? 'on' : 'off'}[${i < filled ? i : i - filled}]`))
  }

  // the text block centred against the grid in a wide box
  const ty = wide ? Math.max(0, (H - textH) / 2) : 0
  const shifted = text.map((n) => ({ ...n, box: { ...n.box, y: n.box.y + ty } }) as LayoutNode)
  return root(ctx, [...icons, ...shifted])
}

export function intrinsicSize(props: IconArrayProps, ctx: LayoutContext): Size {
  void props
  void ctx
  return { width: 900, height: 420 }
}

export function capacity(props: IconArrayProps, box: Size, ctx: LayoutContext): CapacityReport {
  void ctx
  const total = Math.round(numOrNull(props.total) ?? 10)
  // an icon smaller than a caption line cannot be read as a person
  const g = iconGrid(Math.max(1, Math.min(ICON_ARRAY_MAX, total)), box.width * 0.6, box.height)
  const small = g.cell * 0.78 < 18
  return capacityOf({ total: { max: ICON_ARRAY_MAX, used: total } }, !small, [{ kind: 'truncate', slot: 'total' }])
}

void lineH
