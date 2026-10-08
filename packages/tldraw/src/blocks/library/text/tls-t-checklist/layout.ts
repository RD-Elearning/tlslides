/**
 * Pure layout for tls.t.checklist — items that are done, open or blocked.
 *
 * Marks: done = positive filled box with a tick, open = empty `line` box, blocked = negative
 * filled box with a cross. `doneStyle` decides what else happens to done text: nothing (`check`),
 * a strike-through rect per line (`strike`) or the muted text role (`dim`).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, ResolvedTextStyle, Size } from '../../../types'
import type { ChecklistProps, ChecklistState } from './schema'
import { CHECKLIST_MAX_ITEMS } from './schema'
import { layoutMarkerRows, markerCapacity } from '../_engine/marker-rows'
import { asArray, spacingGap, str } from '../_engine/rich'
import { onColor } from '../_engine/color'
import { getIcon } from '../../../icons'
import { scaleIconPath } from '../../../icons/scale-path'

/** Cross glyph on the 24x24 icon grid (the icon set has no plain "x"). */
export const CROSS_PATH = 'M7 7L17 17M17 7L7 17'

export function stateOf(item: unknown): ChecklistState {
  const s = item && typeof item === 'object' ? (item as { state?: unknown }).state : undefined
  return s === 'done' || s === 'blocked' ? s : 'open'
}

function textOf(item: unknown): string {
  if (item && typeof item === 'object') return str((item as { text?: unknown }).text)
  return str(item)
}

function compute(props: ChecklistProps, ctx: LayoutContext, width: number) {
  const items = asArray<unknown>(props.items)
  const base: ResolvedTextStyle = { ...ctx.resolveText('body'), color: ctx.resolveColor('text').color }
  const muted = ctx.resolveColor('textMuted').color
  const positive = ctx.resolveColor('positive').color
  const negative = ctx.resolveColor('negative').color
  const line = ctx.resolveColor('line').color
  const markSize = Math.round(base.size * 0.9)
  const doneStyle = props.doneStyle === 'strike' || props.doneStyle === 'dim' ? props.doneStyle : 'check'
  const columns: 1 | 2 = String(props.columns) === '2' ? 2 : 1
  const check = getIcon('check')
  const glyph = Math.round(markSize * 0.8)

  const styleFor = (i: number): ResolvedTextStyle =>
    stateOf(items[i]) === 'done' && doneStyle !== 'check' ? { ...base, color: muted } : base

  // The engine takes one text style; per-item colour is patched onto the placed node afterwards.
  const rows = layoutMarkerRows({
    ctx,
    width,
    columns,
    gap: spacingGap(ctx, props.spacing),
    colGap: ctx.tokens.space.lg,
    items: items.map((it, i) => ({ text: textOf(it), part: `item[${i}].text`, propPath: `items.${i}.text` })),
    textStyle: base,
    markerWidth: markSize,
    markerHeight: markSize,
    markerGap: ctx.tokens.space.sm,
    markerNodes(i, box) {
      const part = `item[${i}].mark`
      const state = stateOf(items[i])
      const radius = Math.round(markSize * 0.25)
      if (state === 'open') {
        return [{ k: 'rect', part, box, stroke: { color: line, width: 2 }, radius }]
      }
      const fill = state === 'done' ? positive : negative
      const ink = onColor(ctx, fill)
      const inner = { x: box.x + (box.width - glyph) / 2, y: box.y + (box.height - glyph) / 2, width: glyph, height: glyph }
      const glyphNode: LayoutNode =
        state === 'done' && check
          ? { k: 'icon', part, box: inner, icon: scaleIconPath(check.path, glyph / 24), fill: ink }
          : { k: 'icon', part, box: inner, icon: scaleIconPath(CROSS_PATH, glyph / 24), fill: ink, strokeWidth: 2.5 }
      return [{ k: 'rect', part, box, fill: { type: 'solid', color: fill }, radius }, glyphNode]
    },
    decorate(i, textNode) {
      const style = styleFor(i)
      textNode.style = style
      if (stateOf(items[i]) !== 'done' || doneStyle !== 'strike') return []
      const lineH = style.size * style.lineHeight
      return textNode.lines.map((l, k): LayoutNode => ({
        k: 'rect',
        part: `item[${i}].strike`,
        box: {
          x: textNode.box.x,
          y: textNode.box.y + (l.top ?? k * lineH) + lineH * 0.52,
          width: Math.min(textNode.box.width, Math.max(1, l.width)),
          height: 2,
        },
        fill: { type: 'solid', color: muted },
      }))
    },
  })
  return { rows, items, columns, base }
}

export function layout(props: ChecklistProps, ctx: LayoutContext): LayoutNode {
  const { rows } = compute(props, ctx, ctx.box.width)
  return {
    k: 'group',
    part: 'root',
    box: { x: 0, y: 0, width: ctx.box.width, height: rows.height },
    children: rows.nodes,
  }
}

export function capacity(props: ChecklistProps, box: Size, ctx: LayoutContext): CapacityReport {
  const { rows, items, columns, base } = compute(props, ctx, box.width)
  return markerCapacity({
    rows,
    itemCount: items.length,
    maxItems: CHECKLIST_MAX_ITEMS,
    columns,
    box,
    gap: spacingGap(ctx, props.spacing),
    lineHeight: base.size * base.lineHeight,
  })
}
