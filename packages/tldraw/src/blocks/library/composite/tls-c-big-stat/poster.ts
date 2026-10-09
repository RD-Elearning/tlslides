/**
 * Poster layout for tls.c.big-stat — the still image used for SVG export
 * and thumbnails.
 *
 * The poster must be honest about height: `compileSlide` stacks regions by
 * measured height, and the poster is what the compiler and the parity
 * harness use for `kind: 'html'` blocks.
 *
 * Uses the shared `formatValue()` from schema.ts so the poster and the
 * template always show the same formatted number — the "same story" rule.
 */

import type { LayoutContext, LayoutNode, Paint, ResolvedTextStyle } from '../../../types'
import type { BigStatProps } from './schema'
import { formatValue } from './schema'
import { isShown } from '../../../schema-helpers'
import { cssTextHeight } from '../../../html-block'
import { BIG_STAT as B } from './template'

export function poster(props: BigStatProps, ctx: LayoutContext): LayoutNode {
  const children: LayoutNode[] = []
  let y = 0
  const w = ctx.box.width
  // LO7: the template's metrics and margins; the template paints these lines, so the stack is
  // the live geometry (text heights are CSS line boxes; the root ends after the last margin, as
  // the template's flex column does).
  const text = (key: string, value: string, style: ResolvedTextStyle): number => {
    const m = ctx.measureText(value, style, w)
    const h = cssTextHeight(m.lines.length, style)
    children.push({ k: 'text', part: key, propPath: key, box: { x: 0, y, width: w, height: h }, lines: m.lines, style })
    return h
  }

  // Value (the enormous headline number)
  const valueStyle = { ...ctx.resolveText('display', { letterSpacing: B.valueTracking, lineHeight: B.valueLH }), color: ctx.resolveColor('text').color }
  y += text('value', formatValue(props), valueStyle) + B.valueGap

  // Label
  if (isShown(props, 'showLabel')) {
    const style = { ...ctx.resolveText('body', { letterSpacing: 0, lineHeight: B.labelLH }), color: ctx.resolveColor('textMuted').color }
    y += text('label', props.label, style) + B.labelGap
  }

  // Context (optional)
  if (isShown(props, 'showContext') && props.context) {
    const style = { ...ctx.resolveText('caption', { letterSpacing: 0, lineHeight: B.contextLH }), color: ctx.resolveColor('textMuted').color }
    y += text('context', props.context, style)
  }

  const totalHeight = y

  // Background paint — instance Paint when set, else resolved surface role.
  // No `part` attribute: structural, not a motion part.
  const surfacePaint: Paint =
    ctx.style?.surface && typeof ctx.style.surface !== 'string'
      ? ctx.style.surface
      : { type: 'solid', color: ctx.resolveColor('surface').color }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: w, height: totalHeight },
    part: 'root',
    children: [
      {
        k: 'rect',
        box: { x: 0, y: 0, width: w, height: totalHeight },
        fill: surfacePaint,
      },
      ...children,
    ],
  }
}
