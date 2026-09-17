/**
 * Pure layout function for tls.t.hero-number — large KPI number.
 *
 * Produces a vertically centred stack: headline value (display size), unit label
 * (subheading), and caption (caption), all centred horizontally.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { HeroNumberProps } from './schema'

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

  const valueStyle = ctx.resolveText('display', {
    letterSpacing: -0.04,
  })

  const valueMetrics = ctx.measureText(props.value, valueStyle, cw)
  const valueHeight = valueMetrics.height

  children.push({
    k: 'text',
    part: 'value',
    box: { x: cx, y: cy, width: cw, height: valueHeight },
    lines: valueMetrics.lines,
    style: { ...valueStyle, color: valueColor.color },
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
    })
  }

  return {
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: ctx.box.height },
    part: 'root',
    children,
  }
}
