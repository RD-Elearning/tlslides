/**
 * Pure layout for tls.g.iceberg — a tip above a waterline, a larger mass below it.
 *
 * The waterline sits a third or half way down. The tip is a small irregular polygon on the line;
 * the hidden mass is a wider polygon under it, in a water band. The tip's items are listed to the
 * right of it, the hidden items inside the mass (two columns once there are more than three).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { IcebergProps } from './schema'
import { ABOVE_MAX, BELOW_MAX } from './schema'
import { asArr, capacityOf, chartColors, clamp, dot, emptyState, enumOf, linesHeight, lineH, mutedStyle, objs, pathNode, placeLines, root, solidRect, str, style, tintOf } from '../_kit'

const f = (v: number) => String(Math.round(v * 100) / 100)
const poly = (pts: Array<[number, number]>) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`
const list = (v: unknown, max: number) => asArr(v).map(str).filter((s) => s.trim() !== '').slice(0, max)

export function layout(props: IcebergProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const a = objs([props.above])[0] ?? {}
  const b = objs([props.below])[0] ?? {}
  const aItems = list(a.items, ABOVE_MAX)
  const bItems = list(b.items, BELOW_MAX)
  if (aItems.length + bItems.length === 0) return emptyState(ctx, 'Add visible and hidden items')
  const c = chartColors(ctx)
  const cx = W / 2
  const headS = style(ctx, 'caption', c.text)
  const itemS = mutedStyle(ctx, 'footnote')
  // The waterline never sits higher than the tip's text needs (up to half the height).
  const aNeed = (str(a.label) ? lineH(headS) + 6 : 0) + aItems.length * (lineH(itemS) + 6) + 16
  const wl = Math.min(Math.max(H * (enumOf(props.waterline, ['third', 'half'] as const, 'third') === 'half' ? 0.5 : 0.34), aNeed), H * 0.5)
  const itemText = { ...itemS, color: c.text }
  const water = ctx.resolveColor('accent2').color
  const group = (part: string, children: LayoutNode[]): LayoutNode => ({ k: 'group', part, box: { x: 0, y: 0, width: W, height: H }, children })
  const nodes: LayoutNode[] = []

  // water band
  nodes.push(group('water', [solidRect({ x: 0, y: wl, width: W, height: H - wl }, tintOf(c.surface, water, 0.12), 'water[band]'), solidRect({ x: 0, y: wl - 1.5, width: W, height: 3 }, tintOf(c.surface, water, 0.7), 'water[line]')]))

  // hidden mass
  const h = H - wl
  const tw = Math.min(W * 0.3, 360)
  const bw = Math.min(W * 0.78, 900)
  const belowShape = poly([
    [cx - tw / 2, wl],
    [cx + tw / 2, wl],
    [cx + bw * 0.5, wl + h * 0.26],
    [cx + bw * 0.42, wl + h * 0.62],
    [cx + bw * 0.12, H - 4],
    [cx - bw * 0.2, H - h * 0.08 - 4],
    [cx - bw * 0.46, wl + h * 0.66],
    [cx - bw * 0.5, wl + h * 0.3],
  ])
  const below: LayoutNode[] = [pathNode(ctx, belowShape, 'below[shape]', { fill: tintOf(c.surface, c.accent, 0.26), stroke: c.accent, strokeWidth: 2 })]
  const cols = bItems.length > 3 ? 2 : 1
  const rows = Math.max(1, Math.ceil(bItems.length / cols))
  const textW = Math.max(20, bw * 0.5 * (cols === 2 ? 0.98 : 0.6))
  const colW = textW / cols
  const rowH = lineH(itemS) + 6
  const headH = str(b.label) ? lineH(headS) + 6 : 0
  const blockH = headH + rows * rowH
  const top = wl + Math.max(10, Math.min((h - blockH) * 0.35, h * 0.18))
  const left = cx - textW / 2
  if (str(b.label)) below.push(...placeLines(ctx, str(b.label), headS, { x: left, y: top, width: textW }, 'center', 1, 'below[label]').nodes)
  bItems.forEach((t, i) => {
    const col = cols === 2 ? i % 2 : 0
    const row = cols === 2 ? Math.floor(i / 2) : i
    const x = left + col * colW
    const y = top + headH + row * rowH
    below.push(dot(x + 5, y + lineH(itemS) / 2, 3.5, c.accent, `below[dot][${i}]`))
    below.push(...placeLines(ctx, t, itemText, { x: x + 16, y, width: Math.max(10, colW - 20) }, 'start', 1, `below[item][${i}]`).nodes)
  })
  nodes.push(group('below', below))

  // tip
  const tip = poly([
    [cx - tw / 2, wl],
    [cx - tw * 0.22, wl * 0.45],
    [cx - tw * 0.06, wl * 0.1],
    [cx + tw * 0.1, wl * 0.3],
    [cx + tw * 0.28, wl * 0.5],
    [cx + tw / 2, wl],
  ])
  const above: LayoutNode[] = [pathNode(ctx, tip, 'above[shape]', { fill: tintOf(c.surface, c.accent, 0.1), stroke: c.accent, strokeWidth: 2 })]
  const ax = cx + tw / 2 + 28
  const aw = Math.max(20, W - ax)
  const avail = wl - 8
  const fitsHead = !!str(a.label) && lineH(headS) + 6 + aItems.length * lineH(itemS) <= avail
  const aHeadH = fitsHead ? linesHeight(ctx, str(a.label), headS, aw, 1) + 6 : 0
  const aRow = clamp((avail - aHeadH) / Math.max(1, aItems.length), lineH(itemS), lineH(itemS) + 6)
  const aTop = Math.max(0, Math.min(avail - (aHeadH + aItems.length * aRow), wl * 0.3))
  if (fitsHead) above.push(...placeLines(ctx, str(a.label), headS, { x: ax, y: aTop, width: aw }, 'start', 1, 'above[label]').nodes)
  aItems.forEach((t, i) => {
    const y = aTop + aHeadH + i * aRow
    above.push(dot(ax + 5, y + lineH(itemS) / 2, 3.5, c.accent, `above[dot][${i}]`))
    above.push(...placeLines(ctx, t, itemText, { x: ax + 16, y, width: Math.max(10, aw - 16) }, 'start', 1, `above[item][${i}]`).nodes)
  })
  nodes.push(group('above', above))
  return root(ctx, nodes)
}

export function capacity(props: IcebergProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  const n = (o: unknown) => asArr((objs([o])[0] ?? {}).items).length
  return capacityOf({ above: { max: ABOVE_MAX, used: n(props.above) }, below: { max: BELOW_MAX, used: n(props.below) } }, true, [
    { kind: 'truncate', slot: 'below' },
    { kind: 'paginate' },
  ])
}
