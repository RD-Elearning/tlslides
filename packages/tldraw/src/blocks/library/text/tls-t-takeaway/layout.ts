/**
 * Pure layout function for tls.t.takeaway — highlighted insight text.
 *
 * Renders as a surface rect with a left accent bar, an optional label,
 * and the insight text. The accent bar and label use the block's `tone`
 * to pick the right colour role.
 */

import type { LayoutContext, LayoutNode, ColorRole, Paint, TypeToken } from '../../../types'
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

/** AC8.5 `size: column`: the rungs tried, largest first; the card may take this share of the box. */
export const COLUMN_RUNGS: TypeToken[] = ['heading', 'subheading', 'lead']
export const COLUMN_SHARE = 0.7

export function layout(props: TakeawayProps, ctx: LayoutContext): LayoutNode {
  if (props.size === 'column') {
    const H = ctx.box.height
    for (let i = 0; i < COLUMN_RUNGS.length; i++) {
      const card = layoutCard(props, ctx, COLUMN_RUNGS[i])
      if (i < COLUMN_RUNGS.length - 1 && H > 0 && card.box.height > H * COLUMN_SHARE) continue
      // centred in a tall column (beside a chart): the card sits at its middle
      const dy = H > card.box.height ? (H - card.box.height) / 2 : 0
      const kids = card.k === 'group' ? card.children : []
      return { k: 'group', part: 'root', box: { x: 0, y: 0, width: ctx.box.width, height: Math.max(H, card.box.height) }, children: kids.map((c) => ({ ...c, box: { ...c.box, y: c.box.y + dy } }) as LayoutNode) }
    }
  }
  return layoutCard(props, ctx)
}

function layoutCard(props: TakeawayProps, ctx: LayoutContext, column?: TypeToken): LayoutNode {
  const pad = column ? ctx.tokens.space.xl : ctx.tokens.space.md
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
    const labelStyle = ctx.resolveText(column ? 'body' : 'caption')
    const labelColor = ctx.resolveColor(role)
    const labelMetrics = ctx.measureText(props.label, labelStyle, contentW)
    const labelHeight = labelMetrics.height

    children.push({
      k: 'text',
      part: 'label',
      box: { x: contentX, y, width: contentW, height: labelHeight },
      lines: labelMetrics.lines,
      style: { ...labelStyle, color: labelColor.color },
      propPath: 'label',
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
  // AC2 `size: 'lead'`: the bigger tier when it fits the box height; a short box keeps `body`.
  const bodyStyle = column ? ctx.resolveText(column, { lineHeight: 1.2 }) : ctx.resolveText('body', { lineHeight: 1.4 })
  let textStyle = bodyStyle
  let textMetrics = ctx.measureText(props.text, bodyStyle, contentW)
  if (!column && props.size === 'lead') {
    const leadStyle = ctx.resolveText('lead', { lineHeight: 1.3 })
    const leadMetrics = ctx.measureText(props.text, leadStyle, contentW)
    if (!(ctx.box.height > 0) || y + leadMetrics.height + pad <= ctx.box.height + 0.5) {
      textStyle = leadStyle
      textMetrics = leadMetrics
    }
  }
  const textColor = ctx.resolveColor('text')
  const textHeight = textMetrics.height

  children.push({
    k: 'text',
    part: 'text',
    box: { x: contentX, y, width: contentW, height: textHeight },
    lines: textMetrics.lines,
    style: { ...textStyle, color: textColor.color },
    propPath: 'text',
  })
  y += textHeight

  // ── Accent bar (full height of content) ──────────────────────────────
  // Exactly the content's height, inset by `pad` top and bottom like the text. (It used to be
  // max(content, 40% of the box) + pad: flush with the surface's bottom edge, and in a tall box
  // it ran far below the tinted surface.)
  const barHeight = Math.max(0, y - pad)

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
