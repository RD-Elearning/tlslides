/**
 * Pure layout for tls.m.image-grid.
 *
 * Cells are computed per pattern (even, feature-left, feature-top, mosaic), then each cell holds an
 * image (`img[i]`) and, per `captions`, a caption below it or a floating pill over its bottom edge
 * (`cap[i]`). Missing images render the renderers' dashed placeholder with the alt text.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, LintFinding, Size } from '../../../types'
import type { ImageGridProps } from './schema'
import { GRID_MAX_IMAGES } from './schema'
import { altFindings, asArr, clamp, enumOf, imageLeaf, lineH, objs, onColor, side, str } from '../_kit'
import { placeLines } from '../../diagram/_kit'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Even cells in `c` columns; an incomplete last row is centred. */
export function evenCells(n: number, c: number, area: Rect, g: number): Rect[] {
  if (n <= 0) return []
  const cols = clamp(Math.floor(c), 1, n)
  const rows = Math.ceil(n / cols)
  const cw = Math.max(1, (area.width - g * (cols - 1)) / cols)
  const ch = Math.max(1, (area.height - g * (rows - 1)) / rows)
  const out: Rect[] = []
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols)
    const col = i % cols
    const inLast = r === rows - 1 ? n - (rows - 1) * cols : cols
    const off = ((cols - inLast) * (cw + g)) / 2
    out.push({ x: area.x + off + col * (cw + g), y: area.y + r * (ch + g), width: cw, height: ch })
  }
  return out
}

/** Column count for `even` when `cols` is auto: the cell closest to a 4:3 frame. */
export function autoCols(n: number, W: number, H: number, g: number): number {
  let best = 1
  let bestScore = Infinity
  for (let c = 1; c <= Math.min(n, 4); c++) {
    const rows = Math.ceil(n / c)
    const cw = (W - g * (c - 1)) / c
    const ch = (H - g * (rows - 1)) / rows
    if (cw <= 0 || ch <= 0) continue
    const score = Math.abs(Math.log(cw / ch / (4 / 3)))
    if (score < bestScore - 1e-9) {
      bestScore = score
      best = c
    }
  }
  return best
}

export function gridCells(
  pattern: string,
  n: number,
  W: number,
  H: number,
  g: number,
  cols: number | 'auto'
): Rect[] {
  const all: Rect = { x: 0, y: 0, width: W, height: H }
  if (n <= 0) return []
  if (n === 1) return [all]
  if (pattern === 'feature-left') {
    const fw = (W - g) * 0.58
    const rest = n - 1
    const rc = rest <= 2 ? 1 : rest <= 6 ? 2 : 3
    const x0 = fw + g
    return [{ x: 0, y: 0, width: fw, height: H }, ...evenCells(rest, rc, { x: x0, y: 0, width: Math.max(1, W - x0), height: H }, g)]
  }
  if (pattern === 'feature-top') {
    const fh = (H - g) * 0.56
    const rest = n - 1
    const rc = rest <= 4 ? rest : Math.ceil(rest / 2)
    const y0 = fh + g
    return [{ x: 0, y: 0, width: W, height: fh }, ...evenCells(rest, rc, { x: 0, y: y0, width: W, height: Math.max(1, H - y0) }, g)]
  }
  if (pattern === 'mosaic') {
    const rows = Math.ceil(n / 2)
    const ch = Math.max(1, (H - g * (rows - 1)) / rows)
    const out: Rect[] = []
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / 2)
      const lastSingle = n % 2 === 1 && i === n - 1
      const y = r * (ch + g)
      if (lastSingle) {
        out.push({ x: 0, y, width: W, height: ch })
        continue
      }
      const wide = (W - g) * 0.6
      const narrow = W - g - wide
      const firstWide = r % 2 === 0
      const w0 = firstWide ? wide : narrow
      out.push(i % 2 === 0 ? { x: 0, y, width: w0, height: ch } : { x: w0 + g, y, width: W - w0 - g, height: ch })
    }
    return out
  }
  return evenCells(n, cols === 'auto' ? autoCols(n, W, H, g) : cols, all, g)
}

function read(props: ImageGridProps, ctx: LayoutContext) {
  const items = objs(props.images).slice(0, GRID_MAX_IMAGES)
  const pattern = enumOf(props.pattern, ['even', 'feature-left', 'feature-top', 'mosaic'] as const, 'even')
  const gapKey = enumOf(props.gap, ['md', 'sm', 'none'] as const, 'md')
  const g = gapKey === 'none' ? 0 : gapKey === 'sm' ? ctx.tokens.space.xs : ctx.tokens.space.md
  const rKey = enumOf(props.radius, ['md', 'none', 'lg'] as const, 'md')
  const radius = rKey === 'none' ? 0 : rKey === 'lg' ? ctx.tokens.radius.lg : ctx.tokens.radius.md
  const captions = enumOf(props.captions, ['below', 'overlay', 'none'] as const, 'below')
  const colsRaw = str(props.cols)
  const cols: number | 'auto' = colsRaw === '2' || colsRaw === '3' || colsRaw === '4' ? Number(colsRaw) : 'auto'
  const hasCaps = captions !== 'none' && items.some((it) => str(it.caption).trim())
  return { items, pattern, g, radius, captions, cols, hasCaps }
}

export function layout(props: ImageGridProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const r = read(props, ctx)
  const cells = gridCells(r.pattern, r.items.length, W, H, r.g, r.cols)
  const capStyle = { ...ctx.resolveText('caption'), color: ctx.resolveColor('textMuted').color }
  const capH = Math.ceil(lineH(capStyle)) + 8
  const nodes: LayoutNode[] = []
  const scrim = ctx.resolveColor('scrim').color
  r.items.forEach((it, i) => {
    const c = cells[i]
    if (!c) return
    const cap = str(it.caption).trim()
    const below = r.hasCaps && r.captions === 'below'
    const imgH = below ? Math.max(1, c.height - capH) : c.height
    nodes.push(imageLeaf(ctx, it.image, it.alt, { x: c.x, y: c.y, width: c.width, height: imgH }, { part: `img[${i}]`, radius: r.radius }))
    if (!cap || !r.hasCaps) return
    if (below) {
      nodes.push(...placeLines(ctx, cap, capStyle, { x: c.x, y: c.y + imgH + 6, width: c.width }, 'start', 1, `cap[${i}]`).nodes)
    } else {
      const inset = 12
      const ph = Math.ceil(lineH(capStyle)) + 12
      const pw = Math.max(1, c.width - 2 * inset)
      if (ph + 2 * inset > imgH || pw < 40) return
      const py = c.y + imgH - inset - ph
      nodes.push({
        k: 'rect',
        part: `cap[${i}].scrim`,
        box: { x: c.x + inset, y: py, width: pw, height: ph },
        fill: { type: 'solid', color: scrim },
        radius: Math.min(ph / 2, Math.max(4, r.radius / 2)),
      })
      const ink = { ...capStyle, color: onColor(ctx, '#000000') }
      nodes.push(...placeLines(ctx, cap, ink, { x: c.x + inset + 12, y: py + 6, width: Math.max(1, pw - 24) }, 'start', 1, `cap[${i}]`).nodes)
    }
  })
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children: nodes }
}

export function lint(props: ImageGridProps): LintFinding[] {
  return altFindings(objs(props.images).map((it, i) => ({ src: it.image, alt: it.alt, part: `img[${i}]` })))
}

export function capacity(props: ImageGridProps, box: Size, ctx: LayoutContext): CapacityReport {
  const n = asArray(props.images).length
  const r = read(props, ctx)
  const cells = gridCells(r.pattern, Math.min(n, GRID_MAX_IMAGES), side(box.width), side(box.height), r.g, r.cols)
  const smallest = cells.length ? Math.min(...cells.map((c) => Math.min(c.width, c.height))) : Infinity
  const fits = n <= GRID_MAX_IMAGES && smallest >= 100
  return {
    fits,
    budget: {
      images: { max: GRID_MAX_IMAGES, used: n, unit: 'items' },
      cell: { max: 100, used: Math.round(Number.isFinite(smallest) ? smallest : 0), unit: 'items' },
    },
    remedy: fits ? [] : [{ kind: 'truncate', slot: 'images' }],
  }
}

const asArray = asArr
