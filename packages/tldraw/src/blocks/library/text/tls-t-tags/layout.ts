/**
 * Pure layout for tls.t.tags — pill-shaped tags that wrap onto new rows.
 *
 * Each tag is a rect (`tag[i]`) and a text (`tag[i].label`) sized from the measured label. Rows are
 * filled left to right; `align: center` centres each row. Colours: one accent, or the deck's
 * categorical series colours in turn.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, ResolvedTextStyle, Size, TypeToken } from '../../../types'
import type { TagsProps } from './schema'
import { TAGS_MAX_ITEMS } from './schema'
import { asArray, str } from '../_engine/rich'
import { onColor, readableOn, tintOf } from '../_engine/color'

const SIZE_TOKEN: Record<string, TypeToken> = { sm: 'caption', md: 'body', lg: 'lead' }

function compute(props: TagsProps, ctx: LayoutContext, width: number) {
  const items = asArray<unknown>(props.items).map(str)
  const size = props.size === 'sm' || props.size === 'lg' ? props.size : 'md'
  const tone = props.tone === 'outline' || props.tone === 'solid' ? props.tone : 'soft'
  const align = props.align === 'center' ? 'center' : 'start'
  const sp = ctx.tokens.space
  const base = ctx.resolveText(SIZE_TOKEN[size])
  const padX = Math.round(base.size * 0.7)
  const padY = Math.round(base.size * 0.3)
  const gap = sp.xs
  const rowGap = sp.xs
  const surface = ctx.resolveColor('surface').color
  const cats = ctx.tokens.categorical
  const accent = ctx.resolveColor('accent').color
  const w = Math.max(1, width)

  interface Placed { i: number; w: number; h: number; lines: ReturnType<LayoutContext['measureText']>['lines']; th: number; style: ResolvedTextStyle; color: string; fill?: string; stroke?: string }
  const tags: Placed[] = items.map((label, i) => {
    const color = props.colorBy === 'cycle' && cats.length > 0 ? cats[i % cats.length] : accent
    let fill: string | undefined
    let stroke: string | undefined
    let ink: string
    if (tone === 'solid') {
      fill = color
      ink = readableOn(onColor(ctx, color), color)
    } else if (tone === 'outline') {
      stroke = color
      ink = readableOn(color, surface)
    } else {
      fill = tintOf(surface, color, 0.16)
      ink = readableOn(color, fill)
    }
    const style: ResolvedTextStyle = { ...base, color: ink }
    const m = ctx.measureText(label, style, Math.max(1, w - 2 * padX))
    const tw = Math.min(w, Math.ceil(Math.min(m.width, w - 2 * padX)) + 2 * padX)
    return { i, w: tw, h: m.height + 2 * padY, lines: m.lines, th: m.height, style, color, fill, stroke }
  })

  // Greedy row fill.
  const rows: Placed[][] = []
  let cur: Placed[] = []
  let curW = 0
  for (const t of tags) {
    if (cur.length > 0 && curW + gap + t.w > w + 0.5) {
      rows.push(cur)
      cur = []
      curW = 0
    }
    curW += (cur.length > 0 ? gap : 0) + t.w
    cur.push(t)
  }
  if (cur.length > 0) rows.push(cur)

  const nodes: LayoutNode[] = []
  let y = 0
  for (const row of rows) {
    const rowW = row.reduce((s, t) => s + t.w, 0) + gap * (row.length - 1)
    const rowH = Math.max(...row.map((t) => t.h))
    let x = align === 'center' ? Math.max(0, (w - rowW) / 2) : 0
    for (const t of row) {
      const h = rowH
      nodes.push({
        k: 'rect',
        part: `tag[${t.i}]`,
        box: { x, y, width: t.w, height: h },
        ...(t.fill ? { fill: { type: 'solid', color: t.fill } as const } : {}),
        ...(t.stroke ? { stroke: { color: t.stroke, width: 2 } } : {}),
        radius: props.shape === 'rect' ? ctx.tokens.radius.sm : h / 2,
      })
      nodes.push({
        k: 'text',
        part: `tag[${t.i}].label`,
        box: { x: x + (t.w - Math.min(t.w - 2 * padX, Math.ceil(t.lines.reduce((m, l) => Math.max(m, l.width), 0)))) / 2, y: y + (h - t.th) / 2, width: Math.max(1, t.w - 2 * padX), height: t.th },
        lines: t.lines,
        style: t.style,
        propPath: `items.${t.i}`,
      })
      x += t.w + gap
    }
    y += rowH + rowGap
  }
  return { nodes, height: Math.max(0, y - rowGap), rows: rows.length, count: items.length, size }
}

export function layout(props: TagsProps, ctx: LayoutContext): LayoutNode {
  const width = Math.max(1, ctx.box.width)
  const r = compute(props, ctx, width)
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width, height: r.height }, children: r.nodes }
}

export function capacity(props: TagsProps, box: Size, ctx: LayoutContext): CapacityReport {
  const r = compute(props, ctx, Math.max(1, box.width))
  const fits = r.height <= box.height + 0.5 && r.count <= TAGS_MAX_ITEMS
  const remedy: CapacityReport['remedy'] = []
  if (!fits) {
    if (r.size !== 'sm') remedy.push({ kind: 'reflow', to: "size: 'sm'" })
    remedy.push({ kind: 'truncate', slot: 'items' })
  }
  return {
    fits,
    budget: {
      items: { max: TAGS_MAX_ITEMS, used: r.count, unit: 'items' },
      lines: { max: Math.max(1, Math.floor(box.height / Math.max(1, r.height / Math.max(1, r.rows)))), used: r.rows, unit: 'lines' },
    },
    remedy,
  }
}
