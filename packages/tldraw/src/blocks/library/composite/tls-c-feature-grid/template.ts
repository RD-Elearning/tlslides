/**
 * HTML template for tls.c.feature-grid — a grid of feature cells.
 *
 * The template produces markup with `data-part` attributes matching `motion.parts`.
 * All user content goes through `ctx.esc()` — the DeckSpec carries props only, never
 * markup (governing rule 2). Colors come from `--tls-*` CSS custom properties.
 *
 * Parts emitted: cell[i].icon, cell[i].title, cell[i].desc for i = 0..N-1.
 */

import type { HtmlTemplateContext } from '../../../types'
import type { FeatureGridProps } from './schema'

export function template(props: FeatureGridProps, ctx: HtmlTemplateContext): string {
  const cells = props.cells ?? []
  const cols = props.columns ?? 3
  const gap = props.gap ?? 24

  const cellWidth = `calc((100% - ${(cols - 1) * gap}px) / ${cols})`

  const cellHtml = cells
    .map((cell, i) => {
      return (
        `<div style="` +
          `width:${cellWidth};` +
          `display:inline-block;` +
          `vertical-align:top;` +
          `box-sizing:border-box;` +
        `">` +
          // Icon
          `<div data-part="cell[${i}].icon" style="` +
            `width:48px;` +
            `height:48px;` +
            `margin-bottom:12px;` +
            `color:${ctx.cssVar('accent')};` +
          `">${ctx.esc(cell.icon)}</div>` +
          // Title
          `<div data-part="cell[${i}].title" style="` +
            `font-family:var(--tls-font-family);` +
            `font-size:var(--tls-type-subheading);` +
            `line-height:1.3;` +
            `color:${ctx.cssVar('on')};` +
            `margin-bottom:8px;` +
          `">${ctx.esc(cell.title)}</div>` +
          // Description
          `<div data-part="cell[${i}].desc" style="` +
            `font-family:var(--tls-font-family);` +
            `font-size:var(--tls-type-body);` +
            `line-height:1.5;` +
            `color:${ctx.cssVar('text-muted')};` +
          `">${ctx.esc(cell.desc)}</div>` +
        `</div>`
      )
    })
    .join('')

  return (
    `<div style="` +
      `display:flex;` +
      `flex-wrap:wrap;` +
      `gap:${gap}px;` +
      `align-items:flex-start;` +
    `">${cellHtml}</div>`
  )
}
