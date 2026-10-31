/**
 * Pure layout function for tls.t.hero-number — large KPI number.
 *
 * Produces a vertically centred stack: headline value (display size), unit label
 * (subheading), and caption (caption), all centred horizontally.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { HeroNumberProps } from './schema'
import { realWidth } from '../../data/_chart/inter-width'
import { withRealWidths } from '../../data/_chart/kit'

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
  // Lines as wide as the browser draws them (the face's measured table): a connector attaches to the
  // painted box, and the flat estimate drew a 218-px "6.000" in Patrick Hand 44 units narrower than
  // the glyphs, so the arrow started inside the number (2026-10-24 review).
  const mc = withRealWidths(ctx)

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
  // Widths come from the measured Inter table (the flat estimate is 15-30% narrow on figures, so
  // "$4.2M" used to be judged to fit when the browser drew it past the box; RV04).
  let scale = 1
  while (realWidth(props.value, withScale(baseValueStyle, scale)) * 1.03 > cw && scale > 0.4) scale -= 0.04
  const fitsOneLine = realWidth(props.value, withScale(baseValueStyle, scale)) * 1.03 <= cw
  let valueMetrics = mc.measureText(props.value, withScale(baseValueStyle, scale), fitsOneLine ? undefined : cw)
  // the wider of the face table and the host's own measure (the browser's canvas draws with the real
  // font; the table only approximates a script face's figures)
  if (fitsOneLine && valueMetrics.lines.length === 1) {
    const host = ctx.measureText(props.value, withScale(baseValueStyle, scale))
    if (host.lines.length === 1 && host.width > valueMetrics.width) {
      const width = Math.min(cw, Math.ceil(host.width))
      valueMetrics = { ...valueMetrics, width, lines: valueMetrics.lines.map((l) => ({ ...l, width })) }
    }
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
    const unitMetrics = mc.measureText(props.unit, unitStyle, cw)
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
    const captionMetrics = mc.measureText(props.caption, captionStyle, cw)
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

  // Content height: the bottom of the last text plus the same padding as the top (the caption used
  // to sit on the block's bottom edge because the height was a guess of line heights).
  const last = children[children.length - 1]
  const contentHeight = last.box.y + last.box.height + pad

  return {
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: contentHeight },
    part: 'root',
    children,
  }
}
