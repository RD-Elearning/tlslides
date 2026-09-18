/**
 * Poster layout for tls.c.hero — the still image used for SVG export and thumbnails.
 *
 * The poster must be honest about height: `compileSlide` stacks regions by measured
 * height, and the poster is what the compiler and the parity harness use for
 * `kind: 'html'` blocks. The poster renders the same text content as the template,
 * using existing text measurement primitives (no DOM, pure layout).
 */

import type { LayoutContext, LayoutNode, RichText } from '../../../types'
import type { HeroProps } from './schema'
import { richTextToPlain } from './schema'

export function poster(props: HeroProps, ctx: LayoutContext): LayoutNode {
  const children: LayoutNode[] = []
  let y = 0
  const w = ctx.box.width

  // Kicker (optional)
  if (props.kicker) {
    const kickerStyle = ctx.resolveText('caption', { letterSpacing: 0.08 })
    const kickerColor = ctx.resolveColor('accent').color
    const kickerResolved = { ...kickerStyle, color: kickerColor }
    const kickerText = props.kicker.toUpperCase()
    const m = ctx.measureText(kickerText, kickerResolved, w)
    children.push({
      k: 'text',
      part: 'kicker',
      box: { x: 0, y, width: w, height: m.height },
      lines: m.lines,
      style: kickerResolved,
    })
    y += m.height + ctx.tokens.space.sm
  }

  // Title (required)
  const titleStyle = ctx.resolveText('display', { letterSpacing: -0.03 })
  const titleColor = ctx.resolveColor('text').color
  const titleResolved = { ...titleStyle, color: titleColor }
  const titleValue = props.title ?? ''
  const mTitle = ctx.measureText(titleValue as string | RichText, titleResolved, w)
  children.push({
    k: 'text',
    part: 'title',
    box: { x: 0, y, width: w, height: mTitle.height },
    lines: mTitle.lines,
    style: titleResolved,
  })
  y += mTitle.height + ctx.tokens.space.md

  // Subtitle (optional)
  if (props.subtitle) {
    const subStyle = ctx.resolveText('subheading')
    const subColor = ctx.resolveColor('textMuted').color
    const subResolved = { ...subStyle, color: subColor }
    const mSub = ctx.measureText(props.subtitle as string | RichText, subResolved, w)
    children.push({
      k: 'text',
      part: 'subtitle',
      box: { x: 0, y, width: w, height: mSub.height },
      lines: mSub.lines,
      style: subResolved,
    })
    y += mSub.height + ctx.tokens.space.lg
  }

  // CTA (optional)
  if (props.cta) {
    const ctaStyle = ctx.resolveText('body')
    const ctaColor = ctx.resolveColor('text').color
    const ctaResolved = { ...ctaStyle, color: ctaColor }
    const ctaText = richTextToPlain(props.cta)
    const mCta = ctx.measureText(ctaText, ctaResolved, w)
    // CTA pill: centered, with padding
    const pillW = mCta.width + ctx.tokens.space.lg * 2
    const pillH = mCta.height + ctx.tokens.space.sm * 2
    const pillX = (w - pillW) / 2
    children.push({
      k: 'rect',
      part: 'cta-bg',
      box: { x: pillX, y, width: pillW, height: pillH },
      fill: { type: 'solid', color: ctx.resolveColor('accent').color },
      radius: pillH / 2,
    })
    children.push({
      k: 'text',
      part: 'cta',
      box: { x: pillX, y: y + ctx.tokens.space.sm, width: pillW, height: mCta.height },
      lines: mCta.lines,
      style: { ...ctaResolved, color: ctx.resolveColor('text').color },
    })
    y += pillH
  }

  const totalHeight = y

  return {
    k: 'group',
    box: { x: 0, y: 0, width: w, height: totalHeight },
    part: 'root',
    children,
  }
}
