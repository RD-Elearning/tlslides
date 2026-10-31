/**
 * Pure layout for tls.g.iceberg — a tip above a waterline, a larger mass below it.
 *
 * The waterline sits a third or half way down. The tip is a small irregular berg on the line; the
 * hidden mass is a wider one under it, in a water band. The tip's items are listed to the right of
 * it, the hidden items inside the mass (two columns once there are more than three).
 *
 * spro creative CR7a: redrawn — the outlines turn their corners in curves (no crude polygon), each
 * berg has a lit face on its left (a lighter facet, as ice is drawn), and the labels step their type
 * up with the box (`promoteToFit`): a whole-slide iceberg no longer reads in footnote type.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { IcebergProps } from './schema'
import { ABOVE_MAX, BELOW_MAX } from './schema'
import { asArr, capacityOf, chartColors, clamp, dot, emptyState, enumOf, linesHeight, lineH, mutedStyle, objs, pathNode, placeLines, promoteToFit, root, solidRect, str, style, tintOf } from '../_kit'
import { withRealWidths } from '../../data/_chart/kit'

const f = (v: number) => String(Math.round(v * 100) / 100)
const poly = (pts: Array<[number, number]>) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`
/** `pts` pulled `d` units toward `c`: a facet kept inside its rounded outline (corners included). */
const inset = (pts: Array<[number, number]>, c: [number, number], d: number): Array<[number, number]> =>
  pts.map(([x, y]) => {
    const len = Math.hypot(c[0] - x, c[1] - y) || 1
    const k = Math.min(d, len / 2) / len
    return [x + (c[0] - x) * k, y + (c[1] - y) * k]
  })
/** A closed outline through `pts` whose corners turn in curves of up to `r` units (half an edge at most). */
function rounded(pts: Array<[number, number]>, r: number): string {
  const n = pts.length
  const at = (i: number) => pts[(i + n) % n]
  const toward = (a: [number, number], b: [number, number], d: number): [number, number] => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const k = Math.min(d, len / 2) / len
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
  }
  let d = ''
  for (let i = 0; i < n; i++) {
    const p = at(i)
    const a = toward(p, at(i - 1), r)
    const b = toward(p, at(i + 1), r)
    d += `${i === 0 ? 'M' : 'L'}${f(a[0])} ${f(a[1])}Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])}`
  }
  return d + 'Z'
}
const list = (v: unknown, max: number) => asArr(v).map(str).filter((s) => s.trim() !== '').slice(0, max)

/** CR7a: the labels step their type up while the larger text still fits. */
export function layout(props: IcebergProps, ctx: LayoutContext): LayoutNode {
  return promoteToFit(ctx, (c) => layoutAt(props, c))
}

function layoutAt(props: IcebergProps, ctx0: LayoutContext): LayoutNode {
  // Browser-true single-line widths: axis labels and captions are anchored by their width (RV06).
  const ctx = withRealWidths(ctx0)
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
  const massPts: Array<[number, number]> = [
    [cx - tw / 2, wl],
    [cx + tw / 2, wl],
    [cx + bw * 0.5, wl + h * 0.26],
    [cx + bw * 0.42, wl + h * 0.62],
    [cx + bw * 0.12, H - 4],
    [cx - bw * 0.2, H - h * 0.08 - 4],
    [cx - bw * 0.46, wl + h * 0.66],
    [cx - bw * 0.5, wl + h * 0.3],
  ]
  const r = Math.max(6, Math.min(28, Math.min(W, H) * 0.04))
  // the lit face: the left flank down to a ridge a little left of the centre line
  const massFace = poly(inset([massPts[0], [cx - bw * 0.04, wl + h * 0.42], [cx - bw * 0.12, H - h * 0.14], massPts[5], massPts[6], massPts[7]], [cx - bw * 0.2, wl + h * 0.45], r + 4))
  const below: LayoutNode[] = [
    pathNode(ctx, rounded(massPts, r), 'below[shape]', { fill: tintOf(c.surface, c.accent, 0.26), stroke: c.accent, strokeWidth: 2 }),
    pathNode(ctx, massFace, 'below[face]', { fill: tintOf(c.surface, c.accent, 0.12) }),
  ]
  const cols = bItems.length > 3 ? 2 : 1
  const rows = Math.max(1, Math.ceil(bItems.length / cols))
  const textW = Math.max(20, bw * (cols === 2 ? 0.62 : 0.42))
  const colW = textW / cols
  const rowH = lineH(itemS) + 6
  const headH = str(b.label) ? lineH(headS) + 6 : 0
  const blockH = headH + rows * rowH
  const top = wl + Math.max(10, (h - blockH) * 0.4)
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
  const tipPts: Array<[number, number]> = [
    [cx - tw / 2, wl],
    [cx - tw * 0.22, wl * 0.45],
    [cx - tw * 0.06, wl * 0.1],
    [cx + tw * 0.1, wl * 0.3],
    [cx + tw * 0.28, wl * 0.5],
    [cx + tw / 2, wl],
  ]
  const tipFace = poly(inset([tipPts[0], tipPts[1], tipPts[2], [cx - tw * 0.02, wl * 0.55], [cx - tw * 0.08, wl]], [cx - tw * 0.15, wl * 0.6], r * 0.6 + 3))
  const above: LayoutNode[] = [
    pathNode(ctx, rounded(tipPts, r * 0.6), 'above[shape]', { fill: tintOf(c.surface, c.accent, 0.1), stroke: c.accent, strokeWidth: 2 }),
    pathNode(ctx, tipFace, 'above[face]', { fill: tintOf(c.surface, c.accent, 0.03) }),
  ]
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
