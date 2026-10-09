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
import { BIG_STAT_LARGE, BIG_STAT_RULE, formatValue, isLargeTier, splitGeometry } from './schema'
import { isShown } from '../../../schema-helpers'
import { posterText } from '../../../html-block'
import { realWidth } from '../../data/_chart/inter-width'

/** The template's text metrics and gaps - the poster lays out with the same numbers (LO7). */
export const BIG_STAT = { valueLH: 1, valueTracking: -0.04, valueGap: 16, labelLH: 1.4, labelGap: 8, contextLH: 1.4 } as const

export function template(props: BigStatProps, ctx: HtmlTemplateContext): string {
  const valueText = formatValue(props)

  const parts: string[] = []
  // LO7: with a poster (the live host) the texts paint its lines and metrics.
  const pt = posterText(ctx)
  const B = BIG_STAT
  // AC2 knobs (the poster draws the same geometry).
  const display = ctx.tokens?.type?.display ?? { size: 152 }
  // AC2 (lead review): the large tier is the poster's choice (it measures the label); its number
  // size is the poster's value leaf. Without a poster the compact tier, as before.
  const posterSize = pt.leaves('value')[0]?.style.size
  const large = isLargeTier(posterSize, display.size)
  const split = props.variant === 'split' ? splitGeometry(ctx.box?.width ?? 1920, valueText, large ? { size: posterSize as number } : display, B.valueTracking, realWidth) : null
  const accent = props.variant === 'accent'
  const center = props.align === 'center' && !split

  if (accent) {
    parts.push(
      `<div style="width:${BIG_STAT_RULE.width}px;height:${BIG_STAT_RULE.height}px;border-radius:${BIG_STAT_RULE.height / 2}px;` +
        `background:${ctx.cssVar('accent')};margin-bottom:${BIG_STAT_RULE.gap}px;${center ? 'margin-left:auto;margin-right:auto;' : ''}"></div>`
    )
  }

  // Value (the enormous headline number)
  const valueHtml =
    `<div data-part="value" style="` +
      `font-family:var(--tls-font-family);` +
      pt.css('value', `font-size:${split ? `${split.valueSize}px` : 'var(--tls-type-display)'};line-height:${B.valueLH};letter-spacing:${B.valueTracking}em;`) +
      `color:${ctx.cssVar(accent ? 'accent' : 'on')};` +
      (split ? 'text-align:right;' : `margin-bottom:${large ? BIG_STAT_LARGE.valueGap : B.valueGap}px;`) +
    `">${pt.html('value', ctx.esc(valueText))}</div>`
  if (!split) parts.push(valueHtml)

  const col: string[] = []
  // Label
  if (isShown(props, 'showLabel')) {
    col.push(
      `<div data-part="label" style="` +
        `font-family:var(--tls-font-family);` +
        pt.css('label', `font-size:var(--tls-type-${large ? 'lead' : 'body'});line-height:${B.labelLH};`) +
        `color:${ctx.cssVar('text-muted')};` +
        `margin-bottom:${B.labelGap}px;` +
      `">${pt.html('label', ctx.esc(props.label))}</div>`
    )
  }

  // Context (optional)
  if (isShown(props, 'showContext') && props.context) {
    col.push(
      `<div data-part="context" style="` +
        `font-family:var(--tls-font-family);` +
        pt.css('context', `font-size:var(--tls-type-${large ? 'body' : 'caption'});line-height:${B.contextLH};`) +
        `color:${ctx.cssVar('text-muted')};` +
      `">${pt.html('context', ctx.esc(props.context))}</div>`
    )
  }

  if (split) {
    return (
      `<div style="display:flex;flex-direction:row;align-items:center;height:100%;">` +
        `<div style="flex:none;width:${split.valueW}px;">${valueHtml}</div>` +
        `<div style="flex:none;width:${split.colW}px;margin-left:${split.gap}px;">${col.join('')}</div>` +
      `</div>`
    )
  }
  parts.push(...col)
  return `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;${center ? 'text-align:center;' : ''}">${parts.join('')}</div>`
}
