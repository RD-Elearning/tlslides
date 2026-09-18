/**
 * Pure layout function for tls.t.takeaway — highlighted insight text.
 *
 * Renders as a surface rect with a left accent bar, an optional label,
 * and the insight text. The accent bar and label use the block's `tone`
 * to pick the right colour role.
 */

import type { LayoutContext, LayoutNode, ColorRole, Paint } from '../../../types'
import type { TakeawayProps } from './schema'

/** Map tone to a colour role for the accent bar. */
function toneToColorRole(tone: TakeawayProps['tone']): ColorRole {
  switch (tone) {
    case 'accent':
      return 'accent'
    case 'positive':
      return 'positive'
    case 'warning':
      return 'warning'
    case 'muted':
      return 'textMuted'
  }
}

export function layout(props: TakeawayProps, ctx: LayoutContext): LayoutNode {
  const pad = ctx.tokens.space.md
  const gap = ctx.tokens.space.sm
  const barWidth = ctx.tokens.space.xs
  const radius = ctx.tokens.radius.md

  const role = toneToColorRole(props.tone)
  const accentColor = ctx.resolveColor(role).color

  // Content box after padding
  const barX = pad
  const contentX = barX + barWidth + gap
  const contentW = Math.max(0, ctx.box.width - contentX - pad)
  let y = pad

  const children: LayoutNode[] = []

  // ── Label ────────────────────────────────────────────────────────────
  if (props.label) {
    const labelStyle = ctx.resolveText('caption')
    const labelColor = ctx.resolveColor(role)
    const labelMetrics = ctx.measureText(props.label, labelStyle, contentW)
    const labelHeight = labelMetrics.height

    children.push({
      k: 'text',
      part: 'label',
      box: { x: contentX, y, width: contentW, height: labelHeight },
      lines: labelMetrics.lines,
      style: { ...labelStyle, color: labelColor.color },
    })
    y += labelHeight + gap * 0.5
  }

  // ── Icon ─────────────────────────────────────────────────────────────
  if (props.icon) {
    const iconPath = ctx.icon(props.icon)
    if (iconPath) {
      const iconSize = ctx.tokens.space.md
      children.push({
        k: 'icon',
        part: 'icon',
        box: { x: contentX, y, width: iconSize, height: iconSize },
        icon: iconPath.d,
        fill: accentColor,
      })
      y += iconSize + gap * 0.5
    }
  }

  // ── Text ─────────────────────────────────────────────────────────────
  const textStyle = ctx.resolveText('body', { lineHeight: 1.4 })
  const textColor = ctx.resolveColor('text')
  const textMetrics = ctx.measureText(props.text, textStyle, contentW)
  const textHeight = textMetrics.height

  children.push({
    k: 'text',
    part: 'text',
    box: { x: contentX, y, width: contentW, height: textHeight },
    lines: textMetrics.lines,
    style: { ...textStyle, color: textColor.color },
  })
  y += textHeight

  // ── Accent bar (full height of content) ──────────────────────────────
  const totalContentHeight = Math.max(y - pad, ctx.box.height * 0.4)
  const barHeight = totalContentHeight + pad

  children.unshift({
    k: 'rect',
    part: 'accent-bar',
    box: { x: barX, y: pad, width: barWidth, height: barHeight },
    fill: { type: 'solid', color: accentColor } as Paint,
    radius: barWidth / 2,
  })

  // ── Surface background (subtle tinted rect behind everything) ─────────
  // When the instance specifies a surface Paint, use it; otherwise derive
  // from the accent colour at ~7% opacity.
  const surfacePaint: Paint = ctx.style?.surface && typeof ctx.style.surface !== 'string'
    ? ctx.style.surface
    : {
        type: 'solid',
        color: accentColor + '12', // ~7% opacity via alpha hex
      }

  // Return measured content height (y after last content + bottom pad),
  // not the full available box height.
  const contentHeight = y + pad

  return {
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: contentHeight },
    part: 'root',
    children: [
      {
        k: 'rect',
        part: 'surface',
        box: { x: 0, y: 0, width: ctx.box.width, height: contentHeight },
        fill: surfacePaint,
        radius,
      },
      ...children,
    ],
  }
}
