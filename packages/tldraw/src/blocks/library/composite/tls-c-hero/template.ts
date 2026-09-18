/**
 * HTML template for tls.c.hero — hero / opening slide.
 *
 * The template produces markup with `data-part` attributes matching `motion.parts`.
 * All user content goes through `ctx.esc()` — the DeckSpec carries props only, never
 * markup (governing rule 2). Colors come from `--tls-*` CSS custom properties.
 *
 * The template is code in the registry, never in the DeckSpec.
 */

import type { HtmlTemplateContext } from '../../../types'
import type { HeroProps } from './schema'
import { richTextToPlain } from './schema'

/**
 * Extract plain text from rich-text, HTML-escaping each run via ctx.esc().
 */
function escRichText(
  value: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean }> },
  esc: (s: string) => string,
): string {
  if (typeof value === 'string') return esc(value)
  return value.runs
    .map((r) => {
      let inner = esc(r.text)
      if (r.bold) inner = `<strong>${inner}</strong>`
      if (r.italic) inner = `<em>${inner}</em>`
      return inner
    })
    .join('')
}

export function template(props: HeroProps, ctx: HtmlTemplateContext): string {
  const parts: string[] = []

  // Kicker (optional)
  if (props.kicker) {
    parts.push(
      `<div data-part="kicker" style="` +
        `font-family:var(--tls-font-family);` +
        `font-size:var(--tls-type-caption);` +
        `line-height:1.4;` +
        `letter-spacing:0.08em;` +
        `color:${ctx.cssVar('accent')};` +
        `text-transform:uppercase;` +
        `margin-bottom:16px;` +
      `">${ctx.esc(props.kicker)}</div>`
    )
  }

  // Title (required)
  if (props.title) {
    parts.push(
      `<div data-part="title" style="` +
        `font-family:var(--tls-font-family);` +
        `font-size:var(--tls-type-display);` +
        `line-height:1.1;` +
        `letter-spacing:-0.03em;` +
        `color:${ctx.cssVar('on')};` +
        `margin-bottom:24px;` +
      `">${escRichText(props.title, ctx.esc)}</div>`
    )
  }

  // Subtitle (optional)
  if (props.subtitle) {
    parts.push(
      `<div data-part="subtitle" style="` +
        `font-family:var(--tls-font-family);` +
        `font-size:var(--tls-type-subheading);` +
        `line-height:1.2;` +
        `color:${ctx.cssVar('text-muted')};` +
        `margin-bottom:32px;` +
      `">${escRichText(props.subtitle, ctx.esc)}</div>`
    )
  }

  // CTA (optional)
  if (props.cta) {
    const ctaText = richTextToPlain(props.cta)
    parts.push(
      `<div data-part="cta" style="` +
        `display:inline-block;` +
        `font-family:var(--tls-font-family);` +
        `font-size:var(--tls-type-body);` +
        `line-height:1.4;` +
        `color:${ctx.cssVar('on')};` +
        `background:${ctx.cssVar('accent')};` +
        `padding:12px 32px;` +
        `border-radius:9999px;` +
      `">${ctx.esc(ctaText)}</div>`
    )
  }

  return `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;">${parts.join('')}</div>`
}
