/**
 * Pure layout function for tls.t.quote — pull quote with quotation glyph.
 *
 * The quotation glyph is rendered as a `path` node (not text). A path's `d` is drawn in its box's
 * own coordinates with no viewBox scaling, so the 100×80 master glyph is scaled into the box here
 * (an unscaled glyph in a small box was clipped to a sliver of its first mark).
 *
 * Autofit: the quote text starts at the `heading` step and shrinks in 5% steps (floor 0.6) until
 * mark + text + attribution fit the box height; the glyph scales with the text. Below the floor
 * the measured height is reported as-is so the region can grow.
 */

import type { LayoutContext, LayoutNode, Paint, ResolvedTextStyle } from '../../../types'
import type { QuoteProps } from './schema'

/** Standard double-quotation-mark SVG path (open-quote), in a 100×80 master space. */
const QUOTE_GLYPH_PATH =
  'M0 60 C0 32 18 12 40 8 L40 20 C26 24 16 36 14 50 L40 50 L40 80 L0 80 Z' +
  'M52 60 C52 32 70 12 92 8 L92 20 C78 24 68 36 66 50 L92 50 L92 80 L52 80 Z'

/** Width of the inked glyph in master units (the right mark ends at x = 92). */
const GLYPH_INK = 0.92

/**
 * Scale every coordinate of the (absolute, number-pair-only) master glyph path by `s`, then shift
 * it by (`dx`, `dy`). Numbers alternate x, y, so the even ones get `dx` and the odd ones `dy`.
 */
export function scaledGlyphPath(s: number, dx = 0, dy = 0): string {
  let i = 0
  return QUOTE_GLYPH_PATH.replace(/-?\d+(\.\d+)?/g, (n) => {
    const v = Number(n) * s + (i++ % 2 === 0 ? dx : dy)
    return String(Math.round(v * 100) / 100)
  })
}

const AUTOFIT_FLOOR = 0.6
const AUTOFIT_STEP = 0.05

interface Placement {
  scale: number
  textStyle: ResolvedTextStyle
  glyphSize: number
  offset: number
  textW: number
  text: ReturnType<LayoutContext['measureText']>
  attr?: ReturnType<LayoutContext['measureText']>
  attrText: string
  height: number
}

function place(props: QuoteProps, ctx: LayoutContext, scale: number): Placement {
  const pad = ctx.tokens.space.lg
  const gapSmall = ctx.tokens.space.sm
  const gapMd = ctx.tokens.space.md
  const cw = Math.max(0, ctx.box.width - pad * 2)

  const base = ctx.resolveText('heading', { lineHeight: 1.35 })
  const textStyle: ResolvedTextStyle = { ...base, size: base.size * scale, color: ctx.resolveColor('text').color }

  // The glyph tracks the text size (a touch larger than a cap height pair), never wider than 15%.
  const glyphSize = props.markStyle === 'glyph' ? Math.min(cw * 0.15, textStyle.size * 1.25, 120) : 0
  const offset =
    props.markStyle === 'glyph' ? glyphSize * GLYPH_INK + gapSmall : props.markStyle === 'rule' ? 6 + gapSmall : 0

  const textW = Math.max(1, cw - offset)
  const text = ctx.measureText(props.text, textStyle, textW)

  const attrText = props.attribution ? (props.role ? `${props.attribution} — ${props.role}` : props.attribution) : ''
  const attr = attrText ? ctx.measureText(attrText, { ...ctx.resolveText('body'), color: ctx.resolveColor('text').color }, Math.max(1, cw)) : undefined

  const body = Math.max(text.height, glyphSize * 0.8)
  const height = pad + body + (attr ? gapMd + attr.height : 0) + pad
  return { scale, textStyle, glyphSize, offset, textW, text, attr, attrText, height }
}

export function layout(props: QuoteProps, ctx: LayoutContext): LayoutNode {
  const pad = ctx.tokens.space.lg
  const gapMd = ctx.tokens.space.md
  const cx = pad
  const cy = pad
  const cw = Math.max(0, ctx.box.width - pad * 2)

  let p = place(props, ctx, 1)
  for (let s = 1 - AUTOFIT_STEP; p.height > ctx.box.height + 0.5 && s >= AUTOFIT_FLOOR - 1e-9; s -= AUTOFIT_STEP) {
    p = place(props, ctx, Math.round(s * 100) / 100)
  }

  const children: LayoutNode[] = []
  const accent = ctx.resolveColor('accent').color

  if (props.markStyle === 'glyph' && p.glyphSize > 0) {
    children.push({
      k: 'path',
      part: 'glyph',
      box: { x: cx, y: cy, width: p.glyphSize, height: p.glyphSize * 0.8 },
      d: scaledGlyphPath(p.glyphSize / 100),
      fill: { type: 'solid', color: accent } as Paint,
    })
  }

  // `rule`: a vertical accent bar beside the quote (the text is already offset by its width).
  if (props.markStyle === 'rule') {
    children.push({
      k: 'rect',
      part: 'glyph',
      box: { x: cx, y: cy, width: 6, height: Math.max(6, p.text.height) },
      fill: { type: 'solid', color: accent } as Paint,
      radius: 3,
    })
  }

  children.push({
    k: 'text',
    part: 'text',
    box: { x: cx + p.offset, y: cy, width: p.textW, height: p.text.height },
    lines: p.text.lines,
    style: p.textStyle,
    propPath: 'text',
  })

  let bottom = cy + Math.max(p.text.height, p.glyphSize * 0.8)
  if (p.attr) {
    const attrY = bottom + gapMd
    children.push({
      k: 'text',
      part: 'attribution',
      box: { x: cx, y: attrY, width: cw, height: p.attr.height },
      lines: p.attr.lines,
      style: { ...ctx.resolveText('body'), color: ctx.resolveColor('text').color },
      propPath: 'attribution',
    })
    bottom = attrY + p.attr.height
  }

  // Measured content height (last content + bottom pad), not the full available box height.
  return {
    k: 'group',
    box: { x: 0, y: 0, width: ctx.box.width, height: bottom + pad },
    part: 'root',
    children,
  }
}
