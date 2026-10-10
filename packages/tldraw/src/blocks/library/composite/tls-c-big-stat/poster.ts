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
import { BIG_STAT_LARGE, BIG_STAT_RULE, BIG_STAT_SPLIT_LABEL, formatValue, largeValueSize, splitGeometry } from './schema'
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
  const accent = props.variant === 'accent'
  const display = ctx.tokens.type.display
  const showLabel = isShown(props, 'showLabel')
  const showContext = isShown(props, 'showContext') && !!props.context
  const muted = ctx.resolveColor('textMuted').color
  const textStyles = (large: boolean) => ({
    label: { ...ctx.resolveText(large ? 'lead' : 'body', { letterSpacing: 0, lineHeight: B.labelLH }), color: muted },
    context: { ...ctx.resolveText(large ? 'body' : 'caption', { letterSpacing: 0, lineHeight: B.contextLH }), color: muted },
  })
  const baseValue = { ...ctx.resolveText('display', { letterSpacing: B.valueTracking, lineHeight: B.valueLH }), color: ctx.resolveColor(accent ? 'accent' : 'text').color }
  const perSize = cssTextHeight(1, { ...baseValue, size: 1 })
  const width0 = realWidth(valueText, { size: display.size, letterSpacing: B.valueTracking }) * 1.04 + 4
  const colHeight = (st: ReturnType<typeof textStyles>, colW: number): number =>
    (showLabel ? cssTextHeight(ctx.measureText(props.label, st.label, colW).lines.length, st.label) + B.labelGap : 0) +
    (showContext ? cssTextHeight(ctx.measureText(props.context as string, st.context, colW).lines.length, st.context) : 0)

  // AC2 (lead review): the large tier when the box has the room (see BIG_STAT_LARGE).
  const L = textStyles(true)
  let split = props.variant === 'split' ? splitGeometry(w, valueText, display, B.valueTracking, realWidth) : null
  let size: number | null
  if (split) {
    size = largeValueSize(display.size, ctx.box.height, 0, perSize, w * 0.55, width0)
    const big = size !== null ? splitGeometry(w, valueText, { size }, B.valueTracking, realWidth) : null
    if (big && colHeight(L, big.colW) <= ctx.box.height) split = big
    else size = null
  } else {
    const fixed = (accent ? BIG_STAT_RULE.height + BIG_STAT_RULE.gap : 0) + BIG_STAT_LARGE.valueGap + colHeight(L, w)
    size = largeValueSize(display.size, ctx.box.height, fixed, perSize, w, width0)
  }
  let { label: labelStyle, context: contextStyle } = size !== null ? L : textStyles(false)
  // AC8.6: a large-tier split sets its label to balance the number beside it: the largest of
  // title / heading / subheading whose label takes at most `BIG_STAT_SPLIT_LABEL.maxLines` lines
  // of the column and whose column fits the box (context at lead); else lead / body as before.
  if (split && size !== null) {
    // a one-word last line (an orphan) reads unfinished beside a large number: the next rung
    const orphan = (text: string, style: ResolvedTextStyle) => {
      const ls = ctx.measureText(text, style, split!.colW).lines
      return ls.length > 1 && ls[ls.length - 1].text.trim().split(/\s+/).filter(Boolean).length < 2
    }
    const contextAt = (token: 'lead' | 'body') => ({ ...ctx.resolveText(token, { letterSpacing: 0, lineHeight: B.contextLH }), color: muted })
    const context = showContext && orphan(props.context as string, contextAt('lead')) ? contextAt('body') : contextAt('lead')
    for (const token of BIG_STAT_SPLIT_LABEL.ladder) {
      const st = { label: { ...ctx.resolveText(token, { letterSpacing: 0, lineHeight: B.labelLH }), color: muted }, context }
      const lines = showLabel ? ctx.measureText(props.label, st.label, split.colW).lines.length : 0
      if (showLabel && orphan(props.label, st.label)) continue
      if (lines <= BIG_STAT_SPLIT_LABEL.maxLines && colHeight(st, split.colW) <= ctx.box.height) {
        labelStyle = st.label
        contextStyle = st.context
        break
      }
    }
  }
  const valueStyle = size !== null ? { ...baseValue, size } : baseValue
  const valueGap = size !== null ? BIG_STAT_LARGE.valueGap : B.valueGap
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
    y += text('value', valueText, valueStyle) + valueGap

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
