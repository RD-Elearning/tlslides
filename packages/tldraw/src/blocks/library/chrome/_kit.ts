/**
 * Shared helpers for the chrome blocks: single-line text runs, ellipsis fitting and hairlines.
 *
 * Chrome text is one line, small and quiet. `estimateMetrics` can be 20% narrow to 35% wide, so
 * widths come from the per-glyph table (`tableMetrics`, within ~3%) plus a little slack, and the
 * node box is 6% + 4 px wider than the glyph table says, so the DOM does not wrap a line the SVG draws whole.
 *
 * Pure and DOM-free.
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle } from '../../types'
import { tableMetrics } from '../../layout/measure'
import { str } from '../data/_chart/kit'

const TABLE = tableMetrics()

/** Rendered width of one line of text (glyph table), 0 when it cannot be measured. */
export function textWidth(text: string, style: ResolvedTextStyle): number {
  try {
    return TABLE(text, style).lines[0]?.width ?? 0
  } catch {
    return 0
  }
}

/** Trim `text` with an ellipsis until it measures at most `max` wide. */
export function fitText(text: string, style: ResolvedTextStyle, max: number): string {
  const t = str(text).replace(/\s+/g, ' ').trim()
  if (!t || max <= 0) return ''
  if (textWidth(t, style) <= max) return t
  let lo = 0
  let hi = t.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (textWidth(t.slice(0, mid).trimEnd() + '…', style) <= max) lo = mid
    else hi = mid - 1
  }
  return lo > 0 ? t.slice(0, lo).trimEnd() + '…' : ''
}

export interface Run {
  node: LayoutNode
  width: number
}

/** One single-line text node at (x, y); `width` is the box width (never narrower than the estimate). */
export function runNode(
  ctx: LayoutContext,
  text: string,
  style: ResolvedTextStyle,
  x: number,
  y: number,
  part: string,
  propPath?: string
): Run {
  const m = ctx.measureText(text, style, 100000)
  const real = textWidth(text, style)
  const est = m.lines[0]?.width ?? 0
  const width = Math.max(1, Math.ceil((real || est) * 1.06 + 4))
  return {
    width,
    node: {
      k: 'text',
      part,
      box: { x, y, width, height: m.height },
      lines: m.lines.slice(0, 1),
      style,
      ...(propPath ? { propPath } : {}),
    } as LayoutNode,
  }
}

/** Hairline as a thin filled rect (`line` nodes are unreliable in the DOM renderer). */
export function hairline(ctx: LayoutContext, x: number, y: number, width: number, height: number, part: string): LayoutNode {
  return {
    k: 'rect',
    part,
    box: { x, y, width: Math.max(0, width), height: Math.max(0, height) },
    fill: { type: 'solid', color: ctx.resolveColor('line').color },
  } as LayoutNode
}

export const RULE_GAP = 10
export const HAIR = 2
