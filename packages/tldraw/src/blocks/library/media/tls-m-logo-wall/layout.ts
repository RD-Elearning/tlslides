/**
 * Pure layout for tls.m.logo-wall — logos in an even grid, at equal visual weight.
 *
 * `uniform: height` gives every logo one height (the widest logo still fits its cell); `uniform:
 * area` gives every logo the same *area*, so a 4:1 wordmark and a 1:1 badge weigh the same: with
 * ratio r a logo of area A is sqrt(A*r) wide and sqrt(A/r) tall, and A is the largest value at which
 * every logo still fits the cell's inner box. A logo whose ratio is unknown (no `ratio`, not in the
 * asset table) is fitted by `contain` inside a full-width, uniform-height box.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, LintFinding, Size } from '../../../types'
import type { LogoWallProps } from './schema'
import { WALL_MAX_LOGOS } from './schema'
import { altFindings, asArr, enumOf, imageLeaf, logoRatio, objs, side, str } from '../_kit'
import { placeLines } from '../../diagram/_kit'

/** Column count for `auto`: at most 5 per row, rows balanced. */
export function autoLogoCols(n: number): number {
  if (n <= 0) return 1
  const rows = Math.ceil(n / 5)
  return Math.ceil(n / rows)
}

export interface LogoSize {
  width: number
  height: number
}

/**
 * Size every logo inside an `iw x ih` inner box. `ratios[i]` is width / height, or undefined when
 * unknown. Pure; exported for the equal-area test.
 */
export function sizeLogos(mode: 'height' | 'area', ratios: Array<number | undefined>, iw: number, ih: number): LogoSize[] {
  const known = ratios.filter((r): r is number => r !== undefined)
  if (mode === 'area' && known.length > 0) {
    // Largest A such that sqrt(A*r) <= iw and sqrt(A/r) <= ih for every known r.
    const A = Math.min(...known.map((r) => Math.min((iw * iw) / r, ih * ih * r)))
    return ratios.map((r) => (r === undefined ? { width: iw, height: Math.sqrt(A) } : { width: Math.sqrt(A * r), height: Math.sqrt(A / r) }))
  }
  // Same height; the widest known logo still fits the width.
  let h = ih
  for (const r of known) h = Math.min(h, iw / r)
  return ratios.map((r) => (r === undefined ? { width: iw, height: h } : { width: h * r, height: h }))
}

function read(props: LogoWallProps, ctx: LayoutContext) {
  const items = objs(props.logos).slice(0, WALL_MAX_LOGOS)
  const n = items.length
  const colsRaw = Number(str(props.cols))
  const cols = colsRaw >= 3 && colsRaw <= 6 ? Math.min(colsRaw, Math.max(1, n)) : autoLogoCols(n)
  const uniform = enumOf(props.uniform, ['height', 'area'] as const, 'height')
  const heading = str(props.heading).trim()
  const showHeading = props.showHeading !== false && !!heading
  return { items, n, cols: Math.max(1, cols), rows: Math.max(1, Math.ceil(n / Math.max(1, cols))), uniform, heading, showHeading }
}

export function layout(props: LogoWallProps, ctx: LayoutContext): LayoutNode {
  const W = side(ctx.box.width)
  const H = side(ctx.box.height)
  const r = read(props, ctx)
  const out: LayoutNode[] = []
  const gap = ctx.tokens.space.md
  let top = 0
  if (r.showHeading) {
    const s = { ...ctx.resolveText('caption'), color: ctx.resolveColor('textMuted').color }
    const p = placeLines(ctx, r.heading, s, { x: 0, y: 0, width: W }, 'center', 1, 'heading')
    out.push(...p.nodes)
    top = p.height + gap
  }
  const areaH = Math.max(1, H - top)
  const cw = Math.max(1, (W - gap * (r.cols - 1)) / r.cols)
  const ch = Math.max(1, (areaH - gap * (r.rows - 1)) / r.rows)
  const p = Math.round(Math.min(cw, ch) * 0.14)
  const iw = Math.max(1, cw - 2 * p)
  const ih = Math.max(1, Math.min(ch - 2 * p, iw * 0.5, 160))
  const sizes = sizeLogos(
    r.uniform,
    r.items.map((it) => logoRatio(ctx, it.image, it.ratio)),
    iw,
    ih
  )
  const plateColor = ctx.resolveColor('surfaceAlt').color
  const divColor = ctx.resolveColor('line').color
  r.items.forEach((it, i) => {
    const row = Math.floor(i / r.cols)
    const col = i % r.cols
    const inLast = row === r.rows - 1 ? r.n - (r.rows - 1) * r.cols : r.cols
    const x0 = col * (cw + gap) + ((r.cols - inLast) * (cw + gap)) / 2
    const y0 = top + row * (ch + gap)
    if (props.plates === true) {
      out.push({
        k: 'rect',
        part: `plate[${i}]`,
        box: { x: x0, y: y0, width: cw, height: ch },
        fill: { type: 'solid', color: plateColor },
        radius: Math.min(ctx.tokens.radius.md, ch / 2),
      })
    }
    if (props.dividers === true && col < inLast - 1) {
      const dh = ch * 0.5
      out.push({
        k: 'rect',
        part: `divider[${i}]`,
        box: { x: x0 + cw + gap / 2 - 1, y: y0 + (ch - dh) / 2, width: 2, height: dh },
        fill: { type: 'solid', color: divColor },
      })
    }
    const sz = sizes[i]
    out.push(
      imageLeaf(ctx, it.image, it.alt, { x: x0 + (cw - sz.width) / 2, y: y0 + (ch - sz.height) / 2, width: sz.width, height: sz.height }, { part: `logo[${i}]`, fit: 'contain' })
    )
  })
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children: out }
}

export function lint(props: LogoWallProps): LintFinding[] {
  return altFindings(objs(props.logos).map((it, i) => ({ src: it.image, alt: it.alt, part: `logo[${i}]` })))
}

export function capacity(props: LogoWallProps, box: Size, ctx: LayoutContext): CapacityReport {
  const n = asArr(props.logos).length
  const r = read(props, ctx)
  const gap = ctx.tokens.space.md
  const cw = (side(box.width) - gap * (r.cols - 1)) / r.cols
  const fits = n <= WALL_MAX_LOGOS && cw >= 80
  return {
    fits,
    budget: {
      logos: { max: WALL_MAX_LOGOS, used: n, unit: 'items' },
      cell: { max: 80, used: Math.max(0, Math.round(cw)), unit: 'items' },
    },
    remedy: fits ? [] : [{ kind: 'truncate', slot: 'logos' }],
  }
}

