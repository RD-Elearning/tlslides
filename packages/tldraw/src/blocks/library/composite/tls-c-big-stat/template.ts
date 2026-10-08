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

export function template(props: BigStatProps, ctx: HtmlTemplateContext): string {
  const valueText = formatValue(props)

  const parts: string[] = []

  // Value (the enormous headline number)
  parts.push(
    `<div data-part="value" style="` +
      `font-family:var(--tls-font-family);` +
      `font-size:var(--tls-type-display);` +
      `line-height:1.0;` +
      `letter-spacing:-0.04em;` +
      `color:${ctx.cssVar('on')};` +
      `margin-bottom:16px;` +
    `">${ctx.esc(valueText)}</div>`
  )

  // Label
  if (isShown(props, 'showLabel')) {
    parts.push(
      `<div data-part="label" style="` +
        `font-family:var(--tls-font-family);` +
        `font-size:var(--tls-type-body);` +
        `line-height:1.4;` +
        `color:${ctx.cssVar('text-muted')};` +
        `margin-bottom:8px;` +
      `">${ctx.esc(props.label)}</div>`
    )
  }

  // Context (optional)
  if (isShown(props, 'showContext') && props.context) {
    parts.push(
      `<div data-part="context" style="` +
        `font-family:var(--tls-font-family);` +
        `font-size:var(--tls-type-caption);` +
        `line-height:1.4;` +
        `color:${ctx.cssVar('text-muted')};` +
      `">${ctx.esc(props.context)}</div>`
    )
  }

  return `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;">${parts.join('')}</div>`
}
