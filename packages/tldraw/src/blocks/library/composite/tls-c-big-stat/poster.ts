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

import type { LayoutContext, LayoutNode, Paint } from '../../../types'
import type { BigStatProps } from './schema'
import { formatValue } from './schema'

export function poster(props: BigStatProps, ctx: LayoutContext): LayoutNode {
  const children: LayoutNode[] = []
  let y = 0
  const w = ctx.box.width

  // Value (the enormous headline number)
  const valueText = formatValue(props)
  const valueStyle = ctx.resolveText('display', { letterSpacing: -0.04 })
  const valueColor = ctx.resolveColor('text').color
  const valueResolved = { ...valueStyle, color: valueColor }
  const mValue = ctx.measureText(valueText, valueResolved, w)
  children.push({
    k: 'text',
    part: 'value',
    box: { x: 0, y, width: w, height: mValue.height },
    lines: mValue.lines,
    style: valueResolved,
  })
  y += mValue.height + ctx.tokens.space.sm

  // Label
  const labelStyle = ctx.resolveText('body')
  const labelColor = ctx.resolveColor('textMuted').color
  const labelResolved = { ...labelStyle, color: labelColor }
  const mLabel = ctx.measureText(props.label, labelResolved, w)
  children.push({
    k: 'text',
    part: 'label',
    box: { x: 0, y, width: w, height: mLabel.height },
    lines: mLabel.lines,
    style: labelResolved,
  })
  y += mLabel.height + ctx.tokens.space.sm

  // Context (optional)
  if (props.context) {
    const ctxStyle = ctx.resolveText('caption')
    const ctxColor = ctx.resolveColor('textMuted').color
    const ctxResolved = { ...ctxStyle, color: ctxColor }
    const mCtx = ctx.measureText(props.context, ctxResolved, w)
    children.push({
      k: 'text',
      part: 'context',
      box: { x: 0, y, width: w, height: mCtx.height },
      lines: mCtx.lines,
      style: ctxResolved,
    })
    y += mCtx.height
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
