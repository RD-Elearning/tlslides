/**
 * Poster layout for tls.c.testimonial — the still image used for SVG export and thumbnails.
 *
 * The poster must be honest about height: `compileSlide` stacks regions by measured
 * height, and the poster is what the compiler and the parity harness use for
 * `kind: 'html'` blocks. The poster renders the same text content as the template,
 * using existing text measurement primitives (no DOM, pure layout).
 */

import type { LayoutContext, LayoutNode, RichText } from '../../../types'
import type { TestimonialProps } from './schema'
import { richTextToPlain, getInitials, isSafeAvatarUrl } from './schema'

export function poster(props: TestimonialProps, ctx: LayoutContext): LayoutNode {
  const children: LayoutNode[] = []
  const w = ctx.box.width
  const centerX = 0
  const avatarSize = 72

  // Start vertically centred with some top padding
  let y = ctx.tokens.space.xl

  // Quote (required)
  if (props.quote) {
    const quoteStyle = ctx.resolveText('subheading')
    const quoteColor = ctx.resolveColor('text').color
    const quoteResolved = { ...quoteStyle, color: quoteColor }
    const quoteText = `"${richTextToPlain(props.quote as string | RichText)}"`
    const mQuote = ctx.measureText(quoteText, quoteResolved, w - ctx.tokens.space.xl * 2)
    children.push({
      k: 'text',
      part: 'quote',
      box: { x: centerX, y, width: w, height: mQuote.height },
      lines: mQuote.lines,
      style: quoteResolved,
    })
    y += mQuote.height + ctx.tokens.space.lg
  }

  // Avatar (optional)
  const avatarUrl = typeof props.avatar === 'string' ? props.avatar : ''
  if (isSafeAvatarUrl(avatarUrl)) {
    // For the poster, render a circle placeholder (no DOM image loading)
    children.push({
      k: 'rect',
      part: 'avatar',
      box: {
        x: centerX + (w - avatarSize) / 2,
        y,
        width: avatarSize,
        height: avatarSize,
      },
      fill: { type: 'solid', color: ctx.resolveColor('accent').color },
      radius: avatarSize / 2,
    })
  } else {
    // Initials fallback frame
    children.push({
      k: 'rect',
      part: 'avatar',
      box: {
        x: centerX + (w - avatarSize) / 2,
        y,
        width: avatarSize,
        height: avatarSize,
      },
      fill: { type: 'solid', color: ctx.resolveColor('accent').color },
      radius: avatarSize / 2,
    })
    // Initials text on top of the avatar circle
    const initials = getInitials(props.name || '')
    if (initials) {
      const initStyle = ctx.resolveText('body')
      const initColor = ctx.resolveColor('text').color
      const mInit = ctx.measureText(initials, { ...initStyle, color: initColor }, avatarSize)
      children.push({
        k: 'text',
        box: {
          x: centerX + (w - avatarSize) / 2,
          y: y + (avatarSize - mInit.height) / 2,
          width: avatarSize,
          height: mInit.height,
        },
        lines: mInit.lines,
        style: { ...initStyle, color: initColor },
      })
    }
  }
  y += avatarSize + ctx.tokens.space.md

  // Name (required)
  if (props.name) {
    const nameStyle = ctx.resolveText('body')
    const nameColor = ctx.resolveColor('text').color
    const nameResolved = { ...nameStyle, color: nameColor }
    const mName = ctx.measureText(props.name, nameResolved, w - ctx.tokens.space.xl * 2)
    children.push({
      k: 'text',
      part: 'name',
      box: { x: centerX, y, width: w, height: mName.height },
      lines: mName.lines,
      style: nameResolved,
    })
    y += mName.height + ctx.tokens.space.xs
  }

  // Role (required)
  if (props.role) {
    const roleStyle = ctx.resolveText('caption')
    const roleColor = ctx.resolveColor('textMuted').color
    const roleResolved = { ...roleStyle, color: roleColor }
    const mRole = ctx.measureText(props.role, roleResolved, w - ctx.tokens.space.xl * 2)
    children.push({
      k: 'text',
      part: 'role',
      box: { x: centerX, y, width: w, height: mRole.height },
      lines: mRole.lines,
      style: roleResolved,
    })
    y += mRole.height
  }

  const totalHeight = y + ctx.tokens.space.xl

  return {
    k: 'group',
    box: { x: 0, y: 0, width: w, height: totalHeight },
    part: 'root',
    children,
  }
}
