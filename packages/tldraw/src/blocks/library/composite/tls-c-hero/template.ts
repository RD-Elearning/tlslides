/**
 * HTML template for tls.c.hero — hero / opening slide.
 *
 * The template produces markup with `data-part` attributes matching `motion.parts`.
 * All user content goes through `ctx.esc()` — the DeckSpec carries props only, never
 * markup (governing rule 2). Colors come from `--tls-*` CSS custom properties.
 *
 * The template is code in the registry, never in the DeckSpec.
 *
 * Variants:
 * - `'classic'` (default): standard layout, staggered fade-in
 * - `'split'`: title split into two halves for opposite-side reveal
 * - `'gradient-sweep'`: adds a gradient background element for sweep-in animation
 */

import type { HtmlTemplateContext } from '../../../types'
import type { HeroProps } from './schema'
import { richTextToPlain } from './schema'
import { isShown } from '../../../schema-helpers'

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

/**
 * Split a title (string or rich text) into two halves for the 'split' variant.
 * Finds the nearest word boundary to the midpoint. Returns two HTML-escaped strings
 * preserving rich-text formatting (bold/italic) within each half.
 */
function splitTitleForVariant(
  value: string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean }> },
  esc: (s: string) => string,
): [string, string] {
  if (typeof value === 'string') {
    // Find word boundary near midpoint
    const midpoint = Math.ceil(value.length / 2)
    let splitAt = midpoint
    for (let i = midpoint; i < value.length; i++) {
      if (value[i] === ' ') { splitAt = i + 1; break }
    }
    if (splitAt === midpoint) {
      for (let i = midpoint - 1; i >= 0; i--) {
        if (value[i] === ' ') { splitAt = i + 1; break }
      }
    }
    return [esc(value.slice(0, splitAt).trimEnd()), esc(value.slice(splitAt).trimStart())]
  }

  // Rich text: split runs at the character midpoint
  const runs = value.runs
  const totalLen = runs.reduce((sum, r) => sum + r.text.length, 0)
  const midpoint = Math.ceil(totalLen / 2)

  // Find word boundary near midpoint in the concatenated plain text
  const plainText = runs.map((r) => r.text).join('')
  let splitCharPos = midpoint
  for (let i = midpoint; i < plainText.length; i++) {
    if (plainText[i] === ' ') { splitCharPos = i + 1; break }
  }
  if (splitCharPos === midpoint) {
    for (let i = midpoint - 1; i >= 0; i--) {
      if (plainText[i] === ' ') { splitCharPos = i + 1; break }
    }
  }

  // Split the runs array at splitCharPos
  let pos = 0
  const firstRuns: Array<{ text: string; bold?: boolean; italic?: boolean }> = []
  const secondRuns: Array<{ text: string; bold?: boolean; italic?: boolean }> = []

  for (const run of runs) {
    const runEnd = pos + run.text.length
    if (runEnd <= splitCharPos) {
      firstRuns.push(run)
    } else if (pos >= splitCharPos) {
      secondRuns.push(run)
    } else {
      const splitInRun = splitCharPos - pos
      firstRuns.push({ ...run, text: run.text.slice(0, splitInRun) })
      secondRuns.push({ ...run, text: run.text.slice(splitInRun) })
    }
    pos = runEnd
  }

  return [
    escRichText({ runs: firstRuns } as { runs: Array<{ text: string; bold?: boolean; italic?: boolean }> }, esc),
    escRichText({ runs: secondRuns } as { runs: Array<{ text: string; bold?: boolean; italic?: boolean }> }, esc),
  ]
}

export function template(props: HeroProps, ctx: HtmlTemplateContext): string {
  const variant = props.variant ?? 'classic'
  const parts: string[] = []

  // Kicker (optional) — same for all variants
  if (isShown(props, 'showKicker') && props.kicker) {
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
  if (props.title && isShown(props, 'showTitle')) {
    if (variant === 'split') {
      // Split variant: two halves that animate from opposite sides
      const [firstHalf, secondHalf] = splitTitleForVariant(props.title, ctx.esc)
      parts.push(
        `<div data-part="title" style="` +
          `font-family:var(--tls-font-family);` +
          `font-size:var(--tls-type-display);` +
          `line-height:1.1;` +
          `letter-spacing:-0.03em;` +
          `color:${ctx.cssVar('on')};` +
          `margin-bottom:24px;` +
          `overflow:hidden;` +
        `">` +
          `<div data-half="first" style="line-height:1.1;">${firstHalf}</div>` +
          `<div data-half="second" style="line-height:1.1;">${secondHalf}</div>` +
        `</div>`
      )
    } else {
      // classic / gradient-sweep: same as today
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
  }

  // Subtitle (optional) — same for all variants
  if (isShown(props, 'showSubtitle') && props.subtitle) {
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

  // CTA (optional) — same for all variants
  if (isShown(props, 'showCta') && props.cta) {
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

  // Root wrapper — variant-specific
  if (variant === 'gradient-sweep') {
    return (
      `<div data-variant="gradient-sweep" style="` +
        `position:relative;` +
        `display:flex;flex-direction:column;justify-content:center;` +
        `height:100%;` +
      `">` +
        `<div data-gradient-bg style="` +
          `position:absolute;top:0;left:0;width:100%;height:100%;` +
          `background:linear-gradient(135deg,${ctx.cssVar('accent')} 0%,transparent 60%);` +
          `opacity:0;` +
        `"></div>` +
        `${parts.join('')}` +
      `</div>`
    )
  }

  if (variant === 'split') {
    return (
      `<div data-variant="split" style="` +
        `display:flex;flex-direction:column;justify-content:center;` +
        `height:100%;` +
      `">${parts.join('')}</div>`
    )
  }

  // classic (default) — byte-identical to the original
  return `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;">${parts.join('')}</div>`
}
