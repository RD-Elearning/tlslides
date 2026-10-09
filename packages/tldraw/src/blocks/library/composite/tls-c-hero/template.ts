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
import { HERO_RULE, richTextToPlain } from './schema'
import { isShown } from '../../../schema-helpers'
import { lineHtml, posterText } from '../../../html-block'

/** Line heights of the hero's text parts — the template's look, and what the poster measures with
 *  (LO7: one set of numbers, so the poster wraps and stacks like the live HTML). */
export const HERO_LH = { kicker: 1.4, title: 1.1, subtitle: 1.2, cta: 1.4 } as const

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

type TitleValue = string | { runs: Array<{ text: string; bold?: boolean; italic?: boolean }> }

/**
 * Split a title (string or rich text) into two halves for the 'split' variant at the word boundary
 * nearest the midpoint, keeping rich-text formatting (bold/italic) within each half. Unescaped:
 * the poster measures the halves (LO7), the template escapes them.
 */
export function splitTitleHalves(value: TitleValue): [TitleValue, TitleValue] {
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
    return [value.slice(0, splitAt).trimEnd(), value.slice(splitAt).trimStart()]
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

  return [{ runs: firstRuns }, { runs: secondRuns }]
}

/** The two halves, HTML-escaped (rich-text runs as `<strong>`/`<em>`). */
function splitTitleForVariant(value: TitleValue, esc: (s: string) => string): [string, string] {
  const [a, b] = splitTitleHalves(value)
  return [escRichText(a, esc), escRichText(b, esc)]
}

export function template(props: HeroProps, ctx: HtmlTemplateContext): string {
  const variant = props.variant ?? 'classic'
  const parts: string[] = []
  // LO7: with a poster (the live host), every text part paints the poster's lines and metrics, so
  // the live hero has the poster's geometry; without one the browser wraps (direct calls).
  const pt = posterText(ctx)
  const space = ctx.tokens?.space
  // AC2 knobs (the poster draws the same geometry).
  const center = props.align === 'center'

  if (props.decoration === 'rule') {
    parts.push(
      `<div style="flex:none;width:${HERO_RULE.width}px;height:${HERO_RULE.height}px;border-radius:${HERO_RULE.height / 2}px;` +
        `background:${ctx.cssVar('accent')};margin-bottom:${space?.md ?? 24}px;${center ? 'align-self:center;' : ''}"></div>`
    )
  }

  // Kicker (optional) — same for all variants
  if (isShown(props, 'showKicker') && props.kicker) {
    parts.push(
      `<div data-part="kicker" style="` +
        `font-family:var(--tls-font-family);` +
        pt.css('kicker', `font-size:var(--tls-type-caption);line-height:${HERO_LH.kicker};letter-spacing:0.08em;`) +
        `color:${ctx.cssVar('accent')};` +
        `text-transform:uppercase;` +
        `margin-bottom:${space?.sm ?? 16}px;` +
      `">${pt.html('kicker', ctx.esc(props.kicker))}</div>`
    )
  }

  // Title (required)
  if (props.title && isShown(props, 'showTitle')) {
    const titleCss = pt.css('title', `font-size:var(--tls-type-display);line-height:${HERO_LH.title};letter-spacing:-0.03em;`)
    if (variant === 'split') {
      // Split variant: two halves that animate from opposite sides
      const [firstHalf, secondHalf] = splitTitleForVariant(props.title, ctx.esc)
      const halves = pt.leaves('title')
      const half = (k: 0 | 1, fallback: string): string =>
        halves.length === 2 ? halves[k].lines.map((l) => lineHtml(l, ctx.esc)).join('<br>') : fallback
      parts.push(
        `<div data-part="title" style="` +
          `font-family:var(--tls-font-family);` +
          titleCss +
          `color:${ctx.cssVar('on')};` +
          `margin-bottom:${space?.md ?? 24}px;` +
          `overflow:hidden;` +
        `">` +
          `<div data-half="first">${half(0, firstHalf)}</div>` +
          `<div data-half="second">${half(1, secondHalf)}</div>` +
        `</div>`
      )
    } else {
      // classic / gradient-sweep: same as today
      parts.push(
        `<div data-part="title" style="` +
          `font-family:var(--tls-font-family);` +
          titleCss +
          `color:${ctx.cssVar('on')};` +
          `margin-bottom:${space?.md ?? 24}px;` +
        `">${pt.html('title', escRichText(props.title, ctx.esc))}</div>`
      )
    }
  }

  // Subtitle (optional) — same for all variants
  if (isShown(props, 'showSubtitle') && props.subtitle) {
    parts.push(
      `<div data-part="subtitle" style="` +
        `font-family:var(--tls-font-family);` +
        pt.css('subtitle', `font-size:var(--tls-type-subheading);line-height:${HERO_LH.subtitle};`) +
        `color:${ctx.cssVar('text-muted')};` +
        `margin-bottom:${space?.lg ?? 32}px;` +
      `">${pt.html('subtitle', escRichText(props.subtitle, ctx.esc))}</div>`
    )
  }

  // CTA (optional) — same for all variants. A pill as wide as its label, at the text's start edge
  // (LO7: `align-self` — as a flex item it used to stretch to the full width; the poster draws it
  // at the label's width).
  if (isShown(props, 'showCta') && props.cta) {
    const ctaText = richTextToPlain(props.cta)
    parts.push(
      `<div data-part="cta" style="` +
        `display:inline-block;align-self:${center ? 'center' : 'flex-start'};` +
        `font-family:var(--tls-font-family);` +
        pt.css('cta', `font-size:var(--tls-type-body);line-height:${HERO_LH.cta};`) +
        // AC2 lead review: the poster's on-accent colour (surface or text, whichever reads on the
        // accent pill); without a poster the surface colour.
        `color:${pt.leaves('cta')[0]?.style.color ?? ctx.cssVar('surface-color')};` +
        `background:${ctx.cssVar('accent')};` +
        `padding:${space?.xs ?? 12}px ${space?.lg ?? 32}px;` +
        `border-radius:9999px;` +
      `">${pt.html('cta', ctx.esc(ctaText))}</div>`
    )
  }

  // Root wrapper — variant-specific
  if (variant === 'gradient-sweep') {
    return (
      `<div data-variant="gradient-sweep" style="` +
        `position:relative;` +
        `display:flex;flex-direction:column;justify-content:center;` +
        `height:100%;` +
        (center ? `text-align:center;` : '') +
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
        (center ? `text-align:center;` : '') +
      `">${parts.join('')}</div>`
    )
  }

  // classic (default) — byte-identical to the original
  return `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;${center ? 'text-align:center;' : ''}">${parts.join('')}</div>`
}
