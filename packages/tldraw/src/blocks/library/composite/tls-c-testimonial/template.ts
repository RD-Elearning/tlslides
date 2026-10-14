/**
 * HTML template for tls.c.testimonial — pull-quote testimonial with attribution.
 *
 * The template produces markup with `data-part` attributes matching `motion.parts`.
 * All user content goes through `ctx.esc()` — the DeckSpec carries props only, never
 * markup (governing rule 2). Colors come from `--tls-*` CSS custom properties.
 *
 * The quote text wraps each word in a `<span data-word>` for word-by-word animation.
 * The avatar degrades to an initials frame when the URL is absent or unsafe.
 */

import type { HtmlTemplateContext } from '../../../types'
import type { TestimonialProps } from './schema'
import type { LayoutNode } from '../../../types'
import { getInitials, isSafeAvatarUrl, photoGeometry, photoPlaceholder, testimonialScale, initialsInk, TESTIMONIAL } from './schema'
import { posterText } from '../../../html-block'
import type { TextLine } from '../../../types'
import { cardCssFromPoster } from '../_kit'

/** LO7: the poster's quote lines as word spans (same structure as `escQuoteRichText`: the
 *  quotation marks are runs of their own, so they become words of their own), `<br>` between. */
function quoteLinesHtml(lines: TextLine[], esc: (s: string) => string): string {
  return lines
    .map((line) => {
      const end = line.text.replace(/\s+$/, '').length
      let at = 0
      return (line.runs && line.runs.length ? line.runs : [{ text: line.text }])
        .map((r: { text: string; bold?: boolean; italic?: boolean }) => {
          const text = r.text.slice(0, Math.max(0, end - at))
          at += r.text.length
          if (!text) return ''
          const words = wrapWordsInSpans(text, esc)
          if (r.bold) return `<strong>${words}</strong>`
          if (r.italic) return `<em>${words}</em>`
          return words
        })
        .join('')
    })
    .join('<br>')
}

/**
 * Wrap words in <span data-word> elements for word-by-word animation.
 * Each word is individually escapable via ctx.esc().
 */
function wrapWordsInSpans(
  text: string,
  esc: (s: string) => string,
): string {
  const words = text.split(/(\s+)/)
  return words
    .map((word) => {
      if (/^\s+$/.test(word)) return word // preserve whitespace as-is
      return `<span data-word>${esc(word)}</span>`
    })
    .join('')
}

/**
 * Build quote markup from a rich-text value, wrapping each word in spans.
 * Each run's text is split into words, and formatting tags wrap the escaped content.
 */
function escQuoteRichText(
  value: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean }> },
  esc: (s: string) => string,
): string {
  if (typeof value === 'string') return wrapWordsInSpans(value, esc)
  return value.runs
    .map((r) => {
      const wrappedWords = wrapWordsInSpans(r.text, esc)
      if (r.bold) return `<strong>${wrappedWords}</strong>`
      if (r.italic) return `<em>${wrappedWords}</em>`
      return wrappedWords
    })
    .join('')
}

export function template(props: TestimonialProps, ctx: HtmlTemplateContext): string {
  const parts: string[] = []
  // LO7: with a poster (the live host) the texts paint its lines and metrics.
  const pt = posterText(ctx)
  const T = TESTIMONIAL
  const quoteLines = pt.lines('quote')
  // AC2 `variant: 'photo'`: photo left, text column left-aligned (the poster draws the same row).
  const photo = props.variant === 'photo'
  const ta = photo ? 'left' : 'center'
  // AC8.5: with a poster, the avatar is the poster's (the `size: lg` rung the poster chose)
  const posterAvatar = (() => {
    let w: number | undefined
    const walk = (n: LayoutNode): void => {
      if (n.k === 'group') n.children.forEach(walk)
      else if (n.k === 'rect' && n.part === 'avatar') w = n.box.width
    }
    if (ctx.poster) walk(ctx.poster)
    return w
  })()
  const sc0 = testimonialScale(props)
  const sc = { ...sc0, avatar: !photo && posterAvatar ? posterAvatar : sc0.avatar }

  // Quote (required)
  if (props.quote) {
    parts.push(
      `<div data-part="quote" style="` +
        `font-family:var(--tls-font-family);` +
        pt.css('quote', `font-size:var(--tls-type-${sc.quote});line-height:${T.quoteLH};`) +
        `color:${ctx.cssVar('on')};` +
        `font-style:italic;` +
        `margin-bottom:${photo && !props.name && !props.role ? 0 : T.quoteGap}px;` +
        `text-align:${ta};` +
      // RVM5: the quotation marks are words of their own, so they enter with the first and the
      // last word instead of showing with the (fading) container before the words.
      `">${
        quoteLines
          ? quoteLinesHtml(quoteLines, ctx.esc)
          : `<span data-word>"</span>${escQuoteRichText(props.quote, ctx.esc)}<span data-word>"</span>`
      }</div>`
    )
  }

  // Avatar (optional — fallback to initials frame)
  const avatarUrl = typeof props.avatar === 'string' ? props.avatar : ''
  let photoHtml = ''
  if (photo) {
    const { photoW } = photoGeometry(ctx.box.width)
    photoHtml =
      `<div data-part="avatar" style="width:${photoW}px;flex:none;align-self:stretch;border-radius:${T.photoRadius}px;overflow:hidden;background:${photoPlaceholder(ctx.tokens?.color as unknown as Record<string, string>)};">` +
      (isSafeAvatarUrl(avatarUrl) ? `<img src="${ctx.esc(avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />` : '') +
      `</div>`
  } else if (isSafeAvatarUrl(avatarUrl)) {
    parts.push(
      `<div data-part="avatar" style="` +
        `width:${sc.avatar}px;height:${sc.avatar}px;border-radius:50%;overflow:hidden;flex:none;` +
        `margin-bottom:${T.avatarGap}px;` +
      `">` +
        `<img src="${ctx.esc(avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;" />` +
      `</div>`
    )
  } else {
    const initials = getInitials(props.name || '')
    parts.push(
      `<div data-part="avatar" style="` +
        `width:${sc.avatar}px;height:${sc.avatar}px;border-radius:50%;flex:none;` +
        `background:${ctx.cssVar('accent')};` +
        `display:flex;align-items:center;justify-content:center;` +
        `margin-bottom:${T.avatarGap}px;` +
        `font-family:var(--tls-font-family);` +
        `font-size:var(--tls-type-${sc.name});` +
        `color:${initialsInk(ctx.tokens?.color as unknown as Record<string, string>) ?? ctx.cssVar('on')};` +
        `font-weight:600;` +
      `">${ctx.esc(initials)}</div>`
    )
  }

  // Name (required)
  if (props.name) {
    parts.push(
      `<div data-part="name" style="` +
        `font-family:var(--tls-font-family);` +
        pt.css('name', `font-size:var(--tls-type-${sc.name});line-height:${T.nameLH};`) +
        `color:${ctx.cssVar('on')};` +
        `font-weight:600;` +
        `margin-bottom:${photo && !props.role ? 0 : T.nameGap}px;` +
        `text-align:${ta};` +
      `">${pt.html('name', ctx.esc(props.name), false)}</div>`
    )
  }

  // Role (required)
  if (props.role) {
    parts.push(
      `<div data-part="role" style="` +
        `font-family:var(--tls-font-family);` +
        pt.css('role', `font-size:var(--tls-type-${sc.role});line-height:${T.roleLH};`) +
        `color:${ctx.cssVar('text-muted')};` +
        `text-align:${ta};` +
      `">${pt.html('role', ctx.esc(props.role))}</div>`
    )
  }

  if (photo) {
    return (
      `<div style="display:flex;flex-direction:row;align-items:stretch;gap:${T.pad}px;height:100%;box-sizing:border-box;padding:${T.pad}px;${cardCssFromPoster(ctx.poster, 'card') ?? ''}">` +
      photoHtml +
      `<div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;align-items:stretch;">${parts.join('')}</div>` +
      `</div>`
    )
  }
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;box-sizing:border-box;padding:${T.pad}px;${cardCssFromPoster(ctx.poster, 'card') ?? ''}">${parts.join('')}</div>`
}
