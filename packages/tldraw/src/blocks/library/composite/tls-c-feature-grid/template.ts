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
import { ICONS } from '../../../icons'

/**
 * Get icon path by name, with fallback to alert icon for unknown names.
 */
function getIconPath(iconName: string): string {
  const icon = ICONS[iconName]
  if (icon) return icon.path
  // Fallback to alert icon
  return ICONS['alert']?.path ?? ''
}

export function template(props: FeatureGridProps, ctx: HtmlTemplateContext): string {
  const cells = props.cells ?? []
  const cols = props.columns ?? 3
  const gap = props.gap ?? 24

  const cellWidth = `calc((100% - ${(cols - 1) * gap}px) / ${cols})`

  const cellHtml = cells
    .map((cell, i) => {
      const iconPath = getIconPath(cell.icon as string)
      const fillColor = ctx.cssVar('accent')
      
      return (
        `<div style="` +
          `width:${cellWidth};` +
          `display:inline-block;` +
          `vertical-align:top;` +
          `box-sizing:border-box;` +
        `">` +
          // Icon - render as inline SVG with the correct path
          `<div data-part="cell[${i}].icon" style="` +
            `width:48px;` +
            `height:48px;` +
            `margin-bottom:12px;` +
            `display:inline-block;` +
          `">` +
            `<svg viewBox="0 0 24 24" width="48" height="48" fill="${fillColor}" style="display:block;">` +
              `<path d="${iconPath}" stroke="none"/>` +
            `</svg>` +
          `</div>` +
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