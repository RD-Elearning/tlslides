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
import { getInitials, isSafeAvatarUrl } from './schema'

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

  // Quote (required)
  if (props.quote) {
    parts.push(
      `<div data-part="quote" style="` +
        `font-family:var(--tls-font-family);` +
        `font-size:var(--tls-type-subheading);` +
        `line-height:1.5;` +
        `color:${ctx.cssVar('on')};` +
        `font-style:italic;` +
        `margin-bottom:32px;` +
        `text-align:center;` +
      `">"${escQuoteRichText(props.quote, ctx.esc)}"</div>`
    )
  }

  // Avatar (optional — fallback to initials frame)
  const avatarUrl = typeof props.avatar === 'string' ? props.avatar : ''
  if (isSafeAvatarUrl(avatarUrl)) {
    parts.push(
      `<div data-part="avatar" style="` +
        `width:72px;height:72px;border-radius:50%;overflow:hidden;` +
        `margin-bottom:16px;` +
      `">` +
        `<img src="${ctx.esc(avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;" />` +
      `</div>`
    )
  } else {
    const initials = getInitials(props.name || '')
    parts.push(
      `<div data-part="avatar" style="` +
        `width:72px;height:72px;border-radius:50%;` +
        `background:${ctx.cssVar('accent')};` +
        `display:flex;align-items:center;justify-content:center;` +
        `margin-bottom:16px;` +
        `font-family:var(--tls-font-family);` +
        `font-size:var(--tls-type-body);` +
        `color:${ctx.cssVar('on')};` +
        `font-weight:600;` +
      `">${ctx.esc(initials)}</div>`
    )
  }

  // Name (required)
  if (props.name) {
    parts.push(
      `<div data-part="name" style="` +
        `font-family:var(--tls-font-family);` +
        `font-size:var(--tls-type-body);` +
        `line-height:1.4;` +
        `color:${ctx.cssVar('on')};` +
        `font-weight:600;` +
        `margin-bottom:4px;` +
        `text-align:center;` +
      `">${ctx.esc(props.name)}</div>`
    )
  }

  // Role (required)
  if (props.role) {
    parts.push(
      `<div data-part="role" style="` +
        `font-family:var(--tls-font-family);` +
        `font-size:var(--tls-type-caption);` +
        `line-height:1.4;` +
        `color:${ctx.cssVar('text-muted')};` +
        `text-align:center;` +
      `">${ctx.esc(props.role)}</div>`
    )
  }

  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:48px;">${parts.join('')}</div>`
}
