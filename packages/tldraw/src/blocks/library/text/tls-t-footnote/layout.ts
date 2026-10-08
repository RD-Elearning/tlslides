/**
 * Pure layout for tls.t.footnote — small-print source and footnote lines.
 *
 * Footnote type token, muted colour. The marker is part of each line's text ("1. ", "*", or a
 * "Source: " prefix on the first line) so a wrapped line hangs naturally and edits stay simple.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, ResolvedTextStyle, Size } from '../../../types'
import type { FootnoteProps } from './schema'
import { FOOTNOTE_MAX_ITEMS, FOOTNOTE_MAX_LINES } from './schema'
import { placeText } from '../_engine/text-place'
import { asArray, str } from '../_engine/rich'

export function withMarker(marker: unknown, i: number, text: string): string {
  switch (marker) {
    case 'number':
      return `${i + 1}. ${text}`
    case 'asterisk':
      return `${'*'.repeat(Math.min(i + 1, 3))} ${text}`
    case 'source':
      return i === 0 ? `Source: ${text}` : text
    default:
      return text
  }
}

function compute(props: FootnoteProps, ctx: LayoutContext, width: number) {
  const items = asArray<unknown>(props.items)
  const align = props.align === 'end' ? 'end' : 'start'
  const style: ResolvedTextStyle = { ...ctx.resolveText('footnote'), color: ctx.resolveColor('textMuted').color }
  const gap = ctx.tokens.space['3xs']
  const nodes: LayoutNode[] = []
  let y = 0
  let lines = 0
  items.forEach((it, i) => {
    const placed = placeText(ctx, withMarker(props.marker, i, str(it)), style, { x: 0, y, width }, align, {
      part: `item[${i}]`,
      linePart: (j) => (j === 0 ? `item[${i}]` : `item[${i}].l${j}`),
      propPath: `items.${i}`,
    })
    nodes.push(...placed.nodes)
    lines += placed.lineCount
    y += placed.height + gap
  })
  return { nodes, height: Math.max(0, y - gap), lines, count: items.length, style }
}

export function layout(props: FootnoteProps, ctx: LayoutContext): LayoutNode {
  const width = Math.max(1, ctx.box.width)
  const r = compute(props, ctx, width)
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width, height: r.height }, children: r.nodes }
}

export function capacity(props: FootnoteProps, box: Size, ctx: LayoutContext): CapacityReport {
  const r = compute(props, ctx, Math.max(1, box.width))
  const fits = r.lines <= FOOTNOTE_MAX_LINES && r.count <= FOOTNOTE_MAX_ITEMS && r.height <= box.height + 0.5
  return {
    fits,
    budget: {
      items: { max: FOOTNOTE_MAX_ITEMS, used: r.count, unit: 'items' },
      lines: { max: FOOTNOTE_MAX_LINES, used: r.lines, unit: 'lines' },
    },
    remedy: fits ? [] : [{ kind: 'truncate', slot: 'items' }],
  }
}
