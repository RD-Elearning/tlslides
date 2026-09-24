/**
 * Pure layout function for tls.t.hero-number — large KPI number.
 *
 * Produces a vertically centred stack: headline value (display size), unit label
 * (subheading), and caption (caption), all centred horizontally.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { HeroNumberProps } from './schema'

/**
 * Apply a scale factor to a resolved text style. Mirrors `tls-t-title`'s own helper.
 */
function withScale(style: ReturnType<LayoutContext['resolveText']>, scale: number) {
  return { ...style, scale, size: style.size * scale }
}

export function layout(props: HeroNumberProps, ctx: LayoutContext): LayoutNode {
  const pad = ctx.tokens.space.md
  const gapUnit = ctx.tokens.space.sm

  // Content box after padding
  const cx = pad
  const cy = pad
  const cw = Math.max(0, ctx.box.width - pad * 2)

  const children: LayoutNode[] = []

  // ── Value (display size) ──────────────────────────────────────────────
  const valueColor =
    props.emphasis === 'accent'
      ? ctx.resolveColor('accent')
      : props.emphasis === 'muted'
        ? ctx.resolveColor('textMuted')
        : ctx.resolveColor('text')

  const baseValueStyle = ctx.resolveText('display', {
    letterSpacing: -0.04,
  })

  // Autofit: a hero number is a single emphasised value, never meant to wrap — shrink in 4%
  // steps to a 0.6 floor until it fits on one line at the KPI cell's given width. Mirrors
  // `tls-t-title`'s own autofit loop; this block never had one, so a value a few characters
  // longer than its siblings (e.g. "$4.2M" next to "61%"/"118"/"2.4×") would wrap to two lines
  // (BACKLOG-visual-fix-2.md — found while reviewing the demo deck for visual quality).
  let scale = 1
  let valueMetrics = ctx.measureText(props.value, baseValueStyle, cw)
  while (valueMetrics.lines.length > 1 && scale > 0.6) {
    scale -= 0.04
    valueMetrics = ctx.measureText(props.value, withScale(baseValueStyle, scale), cw)
  }
  const valueStyle = scale < 1 ? withScale(baseValueStyle, scale) : baseValueStyle
  const valueHeight = valueMetrics.height

  children.push({
    k: 'text',
    part: 'value',
    box: { x: cx, y: cy, width: cw, height: valueHeight },
    lines: valueMetrics.lines,
    style: { ...valueStyle, color: valueColor.color },
    propPath: 'value',
  })

  // ── Unit (subheading) ─────────────────────────────────────────────────
  let unitY = cy + valueHeight + gapUnit

  if (props.unit) {
    const unitStyle = ctx.resolveText('subheading')
    const unitColor = ctx.resolveColor('text')
    const unitMetrics = ctx.measureText(props.unit, unitStyle, cw)
    const unitHeight = unitMetrics.height

    children.push({
      k: 'text',
      part: 'unit',
      box: { x: cx, y: unitY, width: cw, height: unitHeight },
      lines: unitMetrics.lines,
      style: { ...unitStyle, color: unitColor.color },
      propPath: 'unit',
    })
    unitY += unitHeight + gapUnit
  }

  // ── Caption (caption size, muted) ─────────────────────────────────────
  if (props.caption) {
    const captionStyle = ctx.resolveText('caption')
    const captionColor = ctx.resolveColor('textMuted')
    const captionMetrics = ctx.measureText(props.caption, captionStyle, cw)
    const captionHeight = captionMetrics.height

    children.push({
      k: 'text',
      part: 'caption',
      box: { x: cx, y: unitY, width: cw, height: captionHeight },
      lines: captionMetrics.lines,
      style: { ...captionStyle, color: captionColor.color },
      propPath: 'caption',
    })
  }

  // Return measured content height (y after last content + bottom pad),
  // not the full available box height.
  const contentHeight = cy + valueHeight + gapUnit + (props.unit ? ctx.resolveText('subheading').size * 1.2 + gapUnit : 0) + (props.caption ? ctx.resolveText('caption').size * 1.2 : 0) + pad

  return {
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: contentHeight },
    part: 'root',
    children,
  }
}
