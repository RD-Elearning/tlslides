/**
 * Pure layout for tls.m.icon-list — a vertical list of points, each led by its own icon.
 *
 * Icon column of fixed width (the icon sits centred on a tinted shape for `circle`/`square`),
 * title in bold body text, optional description in a muted caption below. Row height is the
 * larger of the icon box and the title + description stack.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, ColorRole, LayoutContext, LayoutNode, ResolvedTextStyle, Size, TypeToken } from '../../../types'
import type { IconListProps } from './schema'
import { ICON_LIST_MAX_ITEMS } from './schema'
import { asArray, spacingGap, str } from '../../text/_engine/rich'
import { iconLeaf } from '../../text/_engine/icon'
import { isShown } from '../../../schema-helpers'

function toneRole(tone: unknown): ColorRole {
  return tone === 'accent2' ? 'accent2' : tone === 'text' ? 'text' : 'accent'
}

function field(item: unknown, key: 'icon' | 'title' | 'text'): string {
  return item && typeof item === 'object' ? str((item as Record<string, unknown>)[key]) : ''
}

/** AC8.5 `size: fit`: title / description tokens, largest first; the list may take this share. */
export const FIT_RUNGS: Array<[TypeToken, TypeToken]> = [['subheading', 'lead'], ['lead', 'body'], ['body', 'caption']]
export const FIT_SHARE = 0.6

function compute(props: IconListProps, ctx: LayoutContext, width: number, rung: [TypeToken, TypeToken] = ['body', 'caption']) {
  const items = asArray<unknown>(props.items)
  const body = ctx.resolveText(rung[0])
  const titleStyle: ResolvedTextStyle = { ...body, color: ctx.resolveColor('text').color }
  const textStyle: ResolvedTextStyle = { ...ctx.resolveText(rung[1]), color: ctx.resolveColor('textMuted').color }
  const showText = isShown(props, 'showText')
  const style = props.iconStyle === 'plain' || props.iconStyle === 'square' ? props.iconStyle : 'circle'
  const shape = Math.round(body.size * 2)
  const glyph = style === 'plain' ? Math.round(shape * 0.72) : Math.round(shape * 0.5)
  const gap = rung[0] === 'body' ? spacingGap(ctx, props.spacing) : Math.round(body.size * 0.7)
  const colGap = ctx.tokens.space.md
  const textX = shape + colGap
  const textW = Math.max(1, width - textX)
  const tone = ctx.resolveColor(toneRole(props.iconTone)).color
  const shapeFill = ctx.resolveColor('surfaceAlt').color
  const innerGap = ctx.tokens.space['3xs']

  const nodes: LayoutNode[] = []
  let y = 0
  let lineCount = 0
  items.forEach((item, i) => {
    const title = field(item, 'title')
    const desc = showText ? field(item, 'text') : ''
    const tm = ctx.measureText({ runs: [{ text: title, bold: true }] }, titleStyle, textW)
    const dm = desc ? ctx.measureText(desc, textStyle, textW) : undefined
    lineCount += tm.lines.length + (dm ? dm.lines.length : 0)
    const stack = tm.height + (dm ? innerGap + dm.height : 0)
    const rowH = Math.max(shape, stack)
    const iconTop = y
    const stackTop = y + Math.max(0, (rowH - stack) / 2)

    if (style !== 'plain') {
      nodes.push({
        k: 'rect',
        part: `iconbg[${i}]`,
        box: { x: 0, y: iconTop, width: shape, height: shape },
        fill: { type: 'solid', color: shapeFill },
        radius: style === 'circle' ? shape / 2 : Math.round(shape * 0.22),
      })
    }
    nodes.push(iconLeaf(field(item, 'icon'), { x: (shape - glyph) / 2, y: iconTop + (shape - glyph) / 2, width: glyph, height: glyph }, tone, `icon[${i}]`))
    nodes.push({
      k: 'text',
      part: `title[${i}]`,
      box: { x: textX, y: stackTop, width: textW, height: tm.height },
      lines: tm.lines,
      style: titleStyle,
      propPath: `items.${i}.title`,
    })
    if (dm) {
      nodes.push({
        k: 'text',
        part: `text[${i}]`,
        box: { x: textX, y: stackTop + tm.height + innerGap, width: textW, height: dm.height },
        lines: dm.lines,
        style: textStyle,
        propPath: `items.${i}.text`,
      })
    }
    y += rowH + gap
  })
  const height = Math.max(0, y - gap)
  return { nodes, height, items, lineCount, rowMin: shape, gap }
}

export function layout(props: IconListProps, ctx: LayoutContext): LayoutNode {
  if (props.size === 'fit') {
    const H = ctx.box.height
    for (let i = 0; i < FIT_RUNGS.length; i++) {
      const r = compute(props, ctx, ctx.box.width, FIT_RUNGS[i])
      if (i < FIT_RUNGS.length - 1 && r.height > H * FIT_SHARE) continue
      // centred in the box: a short list beside a full-height photo sits at its middle
      const dy = Math.max(0, (H - r.height) / 2)
      const children = r.nodes.map((c) => ({ ...c, box: { ...c.box, y: c.box.y + dy } }) as LayoutNode)
      return { k: 'group', part: 'root', box: { x: 0, y: 0, width: ctx.box.width, height: Math.max(H, r.height) }, children }
    }
  }
  const { nodes, height } = compute(props, ctx, ctx.box.width)
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width: ctx.box.width, height }, children: nodes }
}

export function capacity(props: IconListProps, box: Size, ctx: LayoutContext): CapacityReport {
  const r = compute(props, ctx, box.width)
  const fits = r.height <= box.height + 0.5 && r.items.length <= ICON_LIST_MAX_ITEMS
  const remedy: CapacityReport['remedy'] = []
  if (!fits) {
    if (isShown(props, 'showText')) remedy.push({ kind: 'reflow', to: 'showText: false' })
    remedy.push({ kind: 'truncate', slot: 'items' })
  }
  return {
    fits,
    budget: {
      items: { max: ICON_LIST_MAX_ITEMS, used: r.items.length, unit: 'items' },
      lines: { max: Math.max(1, Math.floor((box.height + r.gap) / (r.rowMin + r.gap))), used: r.items.length, unit: 'lines' },
    },
    remedy,
  }
}
