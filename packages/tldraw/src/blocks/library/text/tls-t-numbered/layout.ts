/**
 * Pure layout for tls.t.numbered — numbered points.
 *
 * One shared marker column whose width is the widest marker, so the text edge is constant.
 * `badge` draws the number inside a filled accent circle. Items run down one column or are
 * balanced over two. Built on `_engine/marker-rows.ts`.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, ColorRole, LayoutContext, LayoutNode, ResolvedTextStyle, Size } from '../../../types'
import type { NumberedProps } from './schema'
import { NUMBERED_MAX_ITEMS } from './schema'
import { layoutMarkerRows } from '../_engine/marker-rows'
import { asArray, spacingGap, toAlpha, toMeasurable, toRoman } from '../_engine/rich'
import { onColor } from '../_engine/color'

export function markerLabel(style: unknown, n: number): string {
  switch (style) {
    case 'padded':
      return String(n).padStart(2, '0')
    case 'roman':
      return `${toRoman(n)}.`
    case 'alpha':
      return `${toAlpha(n)}.`
    case 'badge':
      return String(n)
    default:
      return `${n}.`
  }
}

function toneRole(tone: unknown): ColorRole {
  return tone === 'text' ? 'text' : tone === 'muted' ? 'textMuted' : 'accent'
}

function startOf(props: NumberedProps): number {
  const s = Math.floor(Number(props.start))
  return Number.isFinite(s) && s >= 1 ? Math.min(s, 9999) : 1
}

function compute(props: NumberedProps, ctx: LayoutContext, width: number) {
  const items = asArray<unknown>(props.items)
  const style = props.markerStyle ?? 'decimal'
  const start = startOf(props)
  const textStyle: ResolvedTextStyle = { ...ctx.resolveText('body'), color: ctx.resolveColor('text').color }
  const markerColor = ctx.resolveColor(toneRole(props.markerTone)).color
  const badge = style === 'badge'
  const badgeSize = Math.round(textStyle.size * 1.5)
  const markerStyleText: ResolvedTextStyle = badge
    ? { ...textStyle, size: Math.round(textStyle.size * 0.8), lineHeight: 1.2, color: onColor(ctx, markerColor) }
    : { ...textStyle, color: markerColor }

  const labels = items.map((_, i) => markerLabel(style, start + i))
  const widest = labels.reduce(
    (w, l) => Math.max(w, ctx.measureText({ runs: [{ text: l, bold: true }] }, markerStyleText).width),
    0
  )
  const markerWidth = badge ? badgeSize : Math.ceil(widest) + 2
  const columns: 1 | 2 = String(props.columns) === '2' ? 2 : 1

  const rows = layoutMarkerRows({
    ctx,
    width,
    columns,
    gap: spacingGap(ctx, props.spacing),
    colGap: ctx.tokens.space.lg,
    items: items.map((it, i) => ({
      text: toMeasurable(it),
      part: `item[${i}].text`,
      propPath: `items.${i}`,
    })),
    textStyle,
    markerWidth,
    markerHeight: badge ? badgeSize : textStyle.size * textStyle.lineHeight,
    markerGap: ctx.tokens.space.sm,
    markerNodes(i, box) {
      const part = `item[${i}].marker`
      const label = labels[i]
      if (badge) {
        const bm = ctx.measureText({ runs: [{ text: label, bold: true }] }, markerStyleText)
        const w = Math.min(box.width, bm.width)
        return [
          { k: 'rect', part: `item[${i}].badge`, box, fill: { type: 'solid', color: markerColor }, radius: box.width / 2 },
          {
            k: 'text',
            part,
            box: { x: box.x + (box.width - w) / 2, y: box.y + (box.height - bm.height) / 2, width: w + 1, height: bm.height },
            lines: bm.lines,
            style: markerStyleText,
          } as LayoutNode,
        ]
      }
      const m = ctx.measureText({ runs: [{ text: label, bold: true }] }, markerStyleText, box.width + 4)
      return [{ k: 'text', part, box: { ...box, height: m.height }, lines: m.lines, style: markerStyleText }]
    },
  })
  return { rows, items, columns, textStyle }
}

export function layout(props: NumberedProps, ctx: LayoutContext): LayoutNode {
  const { rows } = compute(props, ctx, ctx.box.width)
  return {
    k: 'group',
    part: 'root',
    box: { x: 0, y: 0, width: ctx.box.width, height: rows.height },
    children: rows.nodes,
  }
}

export function capacity(props: NumberedProps, box: Size, ctx: LayoutContext): CapacityReport {
  const { rows, items, columns, textStyle } = compute(props, ctx, box.width)
  const gap = spacingGap(ctx, props.spacing)
  const lineH = textStyle.size * textStyle.lineHeight
  const perColumn = Math.max(1, Math.floor((box.height + gap) / (lineH + gap)))
  const fits = rows.height <= box.height + 0.5 && items.length <= NUMBERED_MAX_ITEMS
  const remedy: CapacityReport['remedy'] = []
  if (!fits) {
    if (columns === 1 && box.width >= 900) remedy.push({ kind: 'reflow', to: "columns: '2'" })
    remedy.push({ kind: 'truncate', slot: 'items' })
  }
  return {
    fits,
    budget: {
      items: { max: NUMBERED_MAX_ITEMS, used: items.length, unit: 'items' },
      lines: { max: perColumn * columns, used: rows.lineCount, unit: 'lines' },
    },
    remedy,
  }
}
