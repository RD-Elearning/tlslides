/**
 * Poster layout for tls.c.hero — the still image used for SVG export and thumbnails.
 *
 * The poster must be honest about height: `compileSlide` stacks regions by measured
 * height, and the poster is what the compiler and the parity harness use for
 * `kind: 'html'` blocks. The poster renders the same text content as the template,
 * using existing text measurement primitives (no DOM, pure layout).
 */

import type { LayoutContext, LayoutNode, Paint, ResolvedTextStyle, RichText } from '../../../types'
import type { HeroProps } from './schema'
import { HERO_RULE, richTextToPlain } from './schema'
import { isShown } from '../../../schema-helpers'
import { cssTextHeight } from '../../../html-block'
import { HERO_LH, splitTitleHalves } from './template'
import { alignText } from '../_kit'
import { onColor } from '../../text/_engine/color'


export function poster(props: HeroProps, ctx: LayoutContext): LayoutNode {
  const children: LayoutNode[] = []
  let y = 0
  const w = ctx.box.width
  const space = ctx.tokens.space
  // AC2 knobs (the template paints the same geometry).
  const align = props.align === 'center' ? 'center' : 'start'
  const aligned = (n: LayoutNode): LayoutNode[] => alignText([n], align)
  // LO7: the template paints these lines with these metrics (`posterText`), so the stack below
  // is the live geometry: each text advances by its CSS line boxes (lines × size × line-height),
  // then the template's margin. Line heights/tracking are the template's (`HERO_LH`).
  const text = (
    part: string,
    value: string | RichText,
    style: ResolvedTextStyle,
    x = 0
  ): { node: LayoutNode; height: number; width: number } => {
    const m = ctx.measureText(value, style, w)
    const height = cssTextHeight(m.lines.length, style)
    return {
      node: { k: 'text', part, propPath: part, box: { x, y, width: w, height }, lines: m.lines, style },
      height,
      width: m.width,
    }
  }

  if (props.decoration === 'rule') {
    const rx = align === 'center' ? (w - HERO_RULE.width) / 2 : 0
    children.push({ k: 'rect', box: { x: rx, y, width: HERO_RULE.width, height: HERO_RULE.height }, fill: { type: 'solid', color: ctx.resolveColor('accent').color }, radius: HERO_RULE.height / 2 })
    y += HERO_RULE.height + space.md
  }

  // Kicker (optional)
  if (isShown(props, 'showKicker') && props.kicker) {
    const style = { ...ctx.resolveText('caption', { letterSpacing: 0.08, lineHeight: HERO_LH.kicker }), color: ctx.resolveColor('accent').color }
    const t = text('kicker', props.kicker.toUpperCase(), style)
    children.push(...aligned(t.node))
    y += t.height + space.sm
  }

  // Title (required). The split variant paints its halves as two blocks: each starts a new line.
  if (props.title && isShown(props, 'showTitle')) {
    const style = { ...ctx.resolveText('display', { letterSpacing: -0.03, lineHeight: HERO_LH.title }), color: ctx.resolveColor('text').color }
    const titleValue = (props.title ?? '') as string | RichText
    if (props.variant === 'split') {
      // One `title` part (a group, as the template's title div) holding the two halves.
      const top = y
      const halves = splitTitleHalves(titleValue).map((half) => {
        const t = text('title', half as string | RichText, style)
        const node = { ...t.node, box: { ...t.node.box, y: y - top } } as Extract<LayoutNode, { k: 'text' }>
        delete node.part
        y += t.height
        return aligned(node)
      }).flat()
      children.push({ k: 'group', part: 'title', box: { x: 0, y: top, width: w, height: y - top }, children: halves })
    } else {
      const t = text('title', titleValue, style)
      children.push(...aligned(t.node))
      y += t.height
    }
    y += space.md
  }

  // Subtitle (optional)
  if (isShown(props, 'showSubtitle') && props.subtitle) {
    const style = { ...ctx.resolveText('subheading', { letterSpacing: 0, lineHeight: HERO_LH.subtitle }), color: ctx.resolveColor('textMuted').color }
    const t = text('subtitle', props.subtitle as string | RichText, style)
    children.push(...aligned(t.node))
    y += t.height + space.lg
  }

  // CTA (optional): a pill as wide as its label plus `lg` either side, at the start edge.
  if (isShown(props, 'showCta') && props.cta) {
    // AC2 lead review: the label in the on-accent colour (whichever of surface / text reads on the
    // accent pill), as the template paints it.
    const accent = ctx.resolveColor('accent').color
    const style = { ...ctx.resolveText('body', { letterSpacing: 0, lineHeight: HERO_LH.cta }), color: onColor(ctx, accent) }
    const ctaText = richTextToPlain(props.cta)
    const m = ctx.measureText(ctaText, style, w)
    const textH = cssTextHeight(m.lines.length, style)
    const pillW = Math.min(w, m.width + space.lg * 2)
    const pillH = textH + space.xs * 2
    const px = align === 'center' ? (w - pillW) / 2 : 0
    children.push({
      k: 'rect',
      part: 'cta-bg',
      box: { x: px, y, width: pillW, height: pillH },
      fill: { type: 'solid', color: accent },
      radius: pillH / 2,
    })
    children.push({
      k: 'text',
      part: 'cta',
      propPath: 'cta',
      box: { x: px + space.lg, y: y + space.xs, width: Math.max(1, pillW - space.lg * 2), height: textH },
      lines: m.lines,
      style,
    })
    y += pillH
  }

  // The root ends after the last part's margin, as the template's flex column does (its content
  // height includes that margin; with the host box this tall, `justify-content:center` is a no-op).

  const totalHeight = y

  // The hero's own background: the instance's Paint when set, else the resolved surface
  // role. Rendered first so it sits behind every text part. Deliberately *no* `part`: it is
  // structural, not a motion part, and the template/poster data-part sets must stay equal
  // (R0.5 item 5).
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
