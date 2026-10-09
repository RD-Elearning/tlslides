/**
 * HTML template for tls.c.big-stat — one enormous headline number with a
 * label and a context line.
 *
 * The template produces markup with `data-part` attributes matching
 * `motion.parts`. All user content goes through `ctx.esc()` — the DeckSpec
 * carries `props` only, never markup (governing rule 2). Colors come from
 * `--tls-*` CSS custom properties.
 *
 * Uses the shared `formatValue()` from schema.ts so the template and the
 * poster always show the same formatted number — the "same story" rule.
 */

import type { HtmlTemplateContext } from '../../../types'
import type { BigStatProps } from './schema'
import { formatValue } from './schema'
import { isShown } from '../../../schema-helpers'
import { posterText } from '../../../html-block'

/** The template's text metrics and gaps - the poster lays out with the same numbers (LO7). */
export const BIG_STAT = { valueLH: 1, valueTracking: -0.04, valueGap: 16, labelLH: 1.4, labelGap: 8, contextLH: 1.4 } as const

export function template(props: BigStatProps, ctx: HtmlTemplateContext): string {
  const valueText = formatValue(props)

  const parts: string[] = []
  // LO7: with a poster (the live host) the texts paint its lines and metrics.
  const pt = posterText(ctx)
  const B = BIG_STAT

  // Value (the enormous headline number)
  parts.push(
    `<div data-part="value" style="` +
      `font-family:var(--tls-font-family);` +
      pt.css('value', `font-size:var(--tls-type-display);line-height:${B.valueLH};letter-spacing:${B.valueTracking}em;`) +
      `color:${ctx.cssVar('on')};` +
      `margin-bottom:${B.valueGap}px;` +
    `">${pt.html('value', ctx.esc(valueText))}</div>`
  )

  // Label
  if (isShown(props, 'showLabel')) {
    parts.push(
      `<div data-part="label" style="` +
        `font-family:var(--tls-font-family);` +
        pt.css('label', `font-size:var(--tls-type-body);line-height:${B.labelLH};`) +
        `color:${ctx.cssVar('text-muted')};` +
        `margin-bottom:${B.labelGap}px;` +
      `">${pt.html('label', ctx.esc(props.label))}</div>`
    )
  }

  // Context (optional)
  if (isShown(props, 'showContext') && props.context) {
    parts.push(
      `<div data-part="context" style="` +
        `font-family:var(--tls-font-family);` +
        pt.css('context', `font-size:var(--tls-type-caption);line-height:${B.contextLH};`) +
        `color:${ctx.cssVar('text-muted')};` +
      `">${pt.html('context', ctx.esc(props.context))}</div>`
    )
  }

  return `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;">${parts.join('')}</div>`
}
