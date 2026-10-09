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
import { BIG_STAT_RULE, formatValue, splitGeometry } from './schema'
import { isShown } from '../../../schema-helpers'
import { cssTextHeight } from '../../../html-block'
import { BIG_STAT as B } from './template'
import { alignText } from '../_kit'
import { realWidth } from '../../data/_chart/inter-width'

export function poster(props: BigStatProps, ctx: LayoutContext): LayoutNode {
  const children: LayoutNode[] = []
  let y = 0
  const w = ctx.box.width
  // AC2 knobs (the template paints the same geometry).
  const valueText = formatValue(props)
  const split = props.variant === 'split' ? splitGeometry(w, valueText, ctx.tokens.type.display, B.valueTracking, realWidth) : null
  const accent = props.variant === 'accent'
  const align = props.align === 'center' && !split ? 'center' : 'start'
  // LO7: the template's metrics and margins; the template paints these lines, so the stack is
  // the live geometry (text heights are CSS line boxes; the root ends after the last margin, as
  // the template's flex column does).
  const text = (key: string, value: string, style: ResolvedTextStyle): number => {
    const m = ctx.measureText(value, style, w)
    const h = cssTextHeight(m.lines.length, style)
    children.push(...alignText([{ k: 'text', part: key, propPath: key, box: { x: 0, y, width: w, height: h }, lines: m.lines, style }], align))
    return h
  }

  if (accent) {
    const rx = align === 'center' ? (w - BIG_STAT_RULE.width) / 2 : 0
    children.push({ k: 'rect', box: { x: rx, y, width: BIG_STAT_RULE.width, height: BIG_STAT_RULE.height }, fill: { type: 'solid', color: ctx.resolveColor('accent').color }, radius: BIG_STAT_RULE.height / 2 })
    y += BIG_STAT_RULE.height + BIG_STAT_RULE.gap
  }

  // Value (the enormous headline number)
  const valueStyle = { ...ctx.resolveText('display', { letterSpacing: B.valueTracking, lineHeight: B.valueLH }), color: ctx.resolveColor(accent ? 'accent' : 'text').color }
  const labelStyle = { ...ctx.resolveText('body', { letterSpacing: 0, lineHeight: B.labelLH }), color: ctx.resolveColor('textMuted').color }
  const contextStyle = { ...ctx.resolveText('caption', { letterSpacing: 0, lineHeight: B.contextLH }), color: ctx.resolveColor('textMuted').color }
  const showLabel = isShown(props, 'showLabel')
  const showContext = isShown(props, 'showContext') && !!props.context

  if (split) {
    // Number left, label/context column beside it; both centred on the row (the template's
    // `align-items:center` flex row; a flex item keeps its last child's margin).
    const vStyle = { ...valueStyle, size: split.valueSize }
    const vm = ctx.measureText(valueText, vStyle, split.valueW)
    const valueH = cssTextHeight(vm.lines.length, vStyle)
    const lm = showLabel ? ctx.measureText(props.label, labelStyle, split.colW) : undefined
    const lH = lm ? cssTextHeight(lm.lines.length, labelStyle) : 0
    const cm = showContext ? ctx.measureText(props.context as string, contextStyle, split.colW) : undefined
    const cH = cm ? cssTextHeight(cm.lines.length, contextStyle) : 0
    const colH = (lm ? lH + B.labelGap : 0) + cH
    const rowH = Math.max(valueH, colH)
    children.push(...alignText([{ k: 'text', part: 'value', propPath: 'value', box: { x: 0, y: (rowH - valueH) / 2, width: split.valueW, height: valueH }, lines: vm.lines, style: vStyle }], 'end'))
    let cy = (rowH - colH) / 2
    if (lm) {
      children.push({ k: 'text', part: 'label', propPath: 'label', box: { x: split.colX, y: cy, width: split.colW, height: lH }, lines: lm.lines, style: labelStyle })
      cy += lH + B.labelGap
    }
    if (cm) children.push({ k: 'text', part: 'context', propPath: 'context', box: { x: split.colX, y: cy, width: split.colW, height: cH }, lines: cm.lines, style: contextStyle })
    y = rowH
  } else {
    y += text('value', valueText, valueStyle) + B.valueGap

    // Label
    if (showLabel) y += text('label', props.label, labelStyle) + B.labelGap

    // Context (optional)
    if (showContext) y += text('context', props.context as string, contextStyle)
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
