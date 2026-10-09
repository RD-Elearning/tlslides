/**
 * Poster layout for tls.c.testimonial — the still image used for SVG export and thumbnails.
 *
 * The poster must be honest about height: `compileSlide` stacks regions by measured
 * height, and the poster is what the compiler and the parity harness use for
 * `kind: 'html'` blocks. The poster renders the same text content as the template,
 * using existing text measurement primitives (no DOM, pure layout).
 */

import type { LayoutContext, LayoutNode, ResolvedTextStyle, RichText } from '../../../types'
import type { TestimonialProps } from './schema'
import { getInitials, isSafeAvatarUrl, photoGeometry, photoPlaceholder, TESTIMONIAL as T } from './schema'
import { cssTextHeight } from '../../../html-block'
import { alignText, cardNodes, cardPaint } from '../_kit'
import { backdrop } from '../_showcase'

/**
 * LO7: the template's flex column (padding `T.pad`, every part centred, its margins), with the
 * template's text metrics; the template paints these lines, so this is the live geometry. The
 * root is the column's height, so the template's `justify-content:center` is a no-op.
 */
export function poster(props: TestimonialProps, ctx: LayoutContext): LayoutNode {
  if (props.variant === 'photo') return photoPoster(props, ctx)
  const children: LayoutNode[] = []
  const w = ctx.box.width
  const inner = Math.max(1, w - T.pad * 2)
  let y = T.pad

  const text = (key: string, value: string | RichText, style: ResolvedTextStyle): number => {
    const m = ctx.measureText(value, style, inner)
    const h = cssTextHeight(m.lines.length, style)
    const node: LayoutNode = { k: 'text', part: key, propPath: key, box: { x: T.pad, y, width: inner, height: h }, lines: m.lines, style }
    children.push(...alignText([node], 'center'))
    return h
  }

  // Quote (required): the quotation marks are runs of their own, as in the template.
  if (props.quote) {
    const style = { ...ctx.resolveText('subheading', { letterSpacing: 0, lineHeight: T.quoteLH }), color: ctx.resolveColor('text').color }
    const runs = typeof props.quote === 'string' ? [{ text: props.quote }] : (props.quote as RichText).runs
    y += text('quote', { runs: [{ text: '"' }, ...runs, { text: '"' }] }, style) + T.quoteGap
  }

  // Avatar: a circle (the poster loads no image), initials on it when there is no safe URL.
  const avatarUrl = typeof props.avatar === 'string' ? props.avatar : ''
  const ax = (w - T.avatar) / 2
  children.push({
    k: 'rect',
    part: 'avatar',
    box: { x: ax, y, width: T.avatar, height: T.avatar },
    fill: { type: 'solid', color: ctx.resolveColor('accent').color },
    radius: T.avatar / 2,
  })
  if (!isSafeAvatarUrl(avatarUrl)) {
    const initials = getInitials(props.name || '')
    if (initials) {
      const initStyle = { ...ctx.resolveText('body'), color: ctx.resolveColor('text').color }
      const mInit = ctx.measureText(initials, initStyle, T.avatar)
      children.push({
        k: 'text',
        box: { x: ax, y: y + (T.avatar - mInit.height) / 2, width: T.avatar, height: mInit.height },
        lines: mInit.lines,
        style: initStyle,
      })
    }
  }
  y += T.avatar + T.avatarGap

  // Name (required; weight 600, measured bold)
  if (props.name) {
    const style = { ...ctx.resolveText('body', { letterSpacing: 0, lineHeight: T.nameLH }), color: ctx.resolveColor('text').color }
    y += text('name', { runs: [{ text: props.name, bold: true }] }, style) + T.nameGap
  }

  // Role (required)
  if (props.role) {
    const style = { ...ctx.resolveText('caption', { letterSpacing: 0, lineHeight: T.roleLH }), color: ctx.resolveColor('textMuted').color }
    y += text('role', props.role, style)
  }

  const totalHeight = y + T.pad

  return {
    k: 'group',
    box: { x: 0, y: 0, width: w, height: totalHeight },
    part: 'root',
    // A transparent full-box rect first: the SVG export's extent is the host box (the parity
    // probe compares the two), and nothing paints under the parts.
    children: [backdrop(w, totalHeight), ...deckCard(ctx, w, totalHeight), ...children],
  }
}

/** AC4: with a deck surface the testimonial sits on a card (`cardPaint`); without one, as before. */
function deckCard(ctx: LayoutContext, w: number, h: number): LayoutNode[] {
  const cp = cardPaint(ctx, { fill: { type: 'solid', color: ctx.resolveColor('surfaceAlt').color } })
  return cp.styled ? cardNodes(cp, { x: 0, y: 0, width: w, height: h }, ctx.tokens.radius.lg, 'card') : []
}

/**
 * AC2 `variant: 'photo'`: the template's flex row — the avatar as a photo (rounded, full inner
 * height) on the left, the quote, name and role left-aligned in a column centred vertically on the
 * right. Same paddings and text metrics as the centred variant; no initials disc.
 */
function photoPoster(props: TestimonialProps, ctx: LayoutContext): LayoutNode {
  const w = ctx.box.width
  const { photoW, colX, colW } = photoGeometry(w)
  const texts: LayoutNode[] = []
  let y = 0
  const text = (key: string, value: string | RichText, style: ResolvedTextStyle): number => {
    const m = ctx.measureText(value, style, colW)
    const h = cssTextHeight(m.lines.length, style)
    texts.push({ k: 'text', part: key, propPath: key, box: { x: colX, y, width: colW, height: h }, lines: m.lines, style })
    return h
  }
  if (props.quote) {
    const style = { ...ctx.resolveText('subheading', { letterSpacing: 0, lineHeight: T.quoteLH }), color: ctx.resolveColor('text').color }
    const runs = typeof props.quote === 'string' ? [{ text: props.quote }] : (props.quote as RichText).runs
    y += text('quote', { runs: [{ text: '"' }, ...runs, { text: '"' }] }, style)
    if (props.name || props.role) y += T.quoteGap
  }
  if (props.name) {
    const style = { ...ctx.resolveText('body', { letterSpacing: 0, lineHeight: T.nameLH }), color: ctx.resolveColor('text').color }
    y += text('name', { runs: [{ text: props.name, bold: true }] }, style)
    if (props.role) y += T.nameGap
  }
  if (props.role) {
    const style = { ...ctx.resolveText('caption', { letterSpacing: 0, lineHeight: T.roleLH }), color: ctx.resolveColor('textMuted').color }
    y += text('role', props.role, style)
  }
  const total = Math.max(T.photoMinH, y + 2 * T.pad)
  const dy = (total - y) / 2
  const shifted = texts.map((n) => ({ ...n, box: { ...n.box, y: n.box.y + dy } }) as LayoutNode)
  const avatarUrl = typeof props.avatar === 'string' ? props.avatar : ''
  const photoBox = { x: T.pad, y: T.pad, width: photoW, height: total - 2 * T.pad }
  const photo: LayoutNode = isSafeAvatarUrl(avatarUrl)
    ? { k: 'image', part: 'avatar', box: photoBox, assetId: '', url: avatarUrl, alt: '', fit: 'cover', radius: T.photoRadius }
    : { k: 'rect', part: 'avatar', box: photoBox, fill: { type: 'solid', color: photoPlaceholder(ctx.tokens.color as unknown as Record<string, string>) }, radius: T.photoRadius }
  return {
    k: 'group',
    box: { x: 0, y: 0, width: w, height: total },
    part: 'root',
    children: [backdrop(w, total), ...deckCard(ctx, w, total), photo, ...shifted],
  }
}
