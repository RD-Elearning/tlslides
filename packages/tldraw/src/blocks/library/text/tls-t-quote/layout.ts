/**
 * Pure layout function for tls.t.quote — pull quote with quotation glyph.
 *
 * The quotation glyph is rendered as a `path` node (not text), so it scales
 * with the box and is always an SVG shape. The glyph sits at top-left,
 * sized proportionally to the text block.
 */

import type { LayoutContext, LayoutNode, Paint } from '../../../types'
import type { QuoteProps } from './schema'

/** Standard double-quotation-mark SVG path (open-quote). Normalised to a 100×80 viewBox. */
const QUOTE_GLYPH_PATH =
  'M0 60 C0 32 18 12 40 8 L40 20 C26 24 16 36 14 50 L40 50 L40 80 L0 80 Z' +
  'M52 60 C52 32 70 12 92 8 L92 20 C78 24 68 36 66 50 L92 50 L92 80 L52 80 Z'

export function layout(props: QuoteProps, ctx: LayoutContext): LayoutNode {
  const pad = ctx.tokens.space.lg
  const gapSmall = ctx.tokens.space.sm
  const gapMd = ctx.tokens.space.md

  // Content box after padding
  const cx = pad
  const cy = pad
  const cw = Math.max(0, ctx.box.width - pad * 2)
  const ch = Math.max(0, ctx.box.height - pad * 2)

  const children: LayoutNode[] = []

  // ── Quotation glyph (SVG path node) ──────────────────────────────────
  if (props.markStyle === 'glyph') {
    const glyphSize = Math.min(cw * 0.15, ch * 0.25, 120)
    const glyphH = glyphSize * 0.8

    children.push({
      k: 'path',
      part: 'glyph',
      box: { x: cx, y: cy, width: glyphSize, height: glyphH },
      d: QUOTE_GLYPH_PATH,
      fill: { type: 'solid', color: ctx.resolveColor('accent').color } as Paint,
    })
  }

  // ── Rule (decorative line) ───────────────────────────────────────────
  if (props.markStyle === 'rule') {
    const ruleH = 6
    children.push({
      k: 'rect',
      part: 'glyph',
      box: { x: cx, y: cy, width: Math.min(cw * 0.4, 200), height: ruleH },
      fill: { type: 'solid', color: ctx.resolveColor('accent').color } as Paint,
      radius: 3,
    })
  }

  // ── Quote text ───────────────────────────────────────────────────────
  const textStyle = ctx.resolveText('heading', {
    lineHeight: 1.35,
  })
  const textColor = ctx.resolveColor('text')

  const glyphOffset =
    props.markStyle === 'glyph'
      ? Math.min(cw * 0.15, ch * 0.25, 120) * 0.8 + gapSmall
      : props.markStyle === 'rule'
        ? 6 + gapSmall
        : 0

  const textX = cx + glyphOffset
  const textW = Math.max(0, cw - glyphOffset)
  const textMetrics = ctx.measureText(props.text, textStyle, textW)
  const textHeight = textMetrics.height

  children.push({
    k: 'text',
    part: 'text',
    box: { x: textX, y: cy, width: textW, height: textHeight },
    lines: textMetrics.lines,
    style: { ...textStyle, color: textColor.color },
    propPath: 'text',
  })

  // ── Attribution ──────────────────────────────────────────────────────
  const attrY = cy + textHeight + gapMd

  if (props.attribution) {
    const attrStyle = ctx.resolveText('body')
    const attrColor = ctx.resolveColor('text')
    const attrText = props.role ? `${props.attribution} — ${props.role}` : props.attribution
    const attrMetrics = ctx.measureText(attrText, attrStyle, cw)
    const attrHeight = attrMetrics.height

    children.push({
      k: 'text',
      part: 'attribution',
      box: { x: cx, y: attrY, width: cw, height: attrHeight },
      lines: attrMetrics.lines,
      style: { ...attrStyle, color: attrColor.color },
      propPath: 'attribution',
    })
  }

  // Compute final y position after the last content element.
  let finalY = cy + textHeight + gapMd
  if (props.attribution) {
    const attrStyle = ctx.resolveText('body')
    const attrMetrics = ctx.measureText(
      props.role ? `${props.attribution} — ${props.role}` : props.attribution,
      attrStyle,
      cw,
    )
    finalY += attrMetrics.height
  }

  // Return measured content height (y after last content + bottom pad),
  // not the full available box height.
  const contentHeight = finalY + pad

  return {
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: contentHeight },
    part: 'root',
    children,
  }
}
