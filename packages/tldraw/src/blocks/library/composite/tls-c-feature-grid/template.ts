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
import { circleIcon, effectiveColumns, featureGridColors, FG_CARD_PAD, FG_CARD_RADIUS, type FeatureGridProps } from './schema'
import { ICONS } from '../../../icons'
import { posterText } from '../../../html-block'

/** The template's text metrics and gaps - the poster measures with the same numbers (LO7). */
export const FG_LH = { title: 1.3, desc: 1.5 } as const
export const FG_ICON = 48
export const FG_ICON_GAP = 12
export const FG_TITLE_GAP = 8

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
  const gap = props.gap ?? 24
  const cols = effectiveColumns(ctx.box.width, props.columns, gap, cells.length)

  // LO7: with a poster (the live host) the text parts paint its lines and metrics.
  const pt = posterText(ctx)
  // AC2 knobs (the poster draws the same geometry).
  const card = props.cell === 'card'
  const center = props.align === 'center'
  const circle = props.iconStyle === 'circle'
  const colors = featureGridColors(ctx.tokens.color as unknown as Record<string, string>)
  const cellW = (ctx.box.width - (cols - 1) * gap) / cols
  const disc = circleIcon(cellW)
  const iconBox = circle ? disc.disc : FG_ICON
  const glyph = circle ? disc.glyph : FG_ICON

  const cellHtml = cells
    .map((cell, i) => {
      const iconPath = getIconPath(cell.icon as string)
      const fillColor = ctx.cssVar('accent')
      
      return (
        `<div style="` +
          `min-width:0;` +
          `box-sizing:border-box;` +
          (card ? `padding:${FG_CARD_PAD}px;background:${colors.card};border-radius:${FG_CARD_RADIUS}px;` : '') +
          (center ? `text-align:center;` : '') +
        `">` +
          // Icon - render as inline SVG with the correct path
          `<div data-part="cell[${i}].icon" style="` +
            `width:${iconBox}px;` +
            `height:${iconBox}px;` +
            `margin-bottom:${FG_ICON_GAP}px;` +
            // LO7: a block, not inline-block - an inline-block icon sat on the line's baseline and
            // the strut's descent pushed the title ~3 units below where the poster puts it.
            `display:${circle ? 'flex' : 'block'};` +
            (circle ? `align-items:center;justify-content:center;border-radius:50%;background:${colors.disc};` : '') +
            (center ? `margin-left:auto;margin-right:auto;` : '') +
          `">` +
            `<svg viewBox="0 0 24 24" width="${glyph}" height="${glyph}" fill="${fillColor}" style="display:block;">` +
              `<path d="${iconPath}" stroke="none"/>` +
            `</svg>` +
          `</div>` +
          // Title
          `<div data-part="cell[${i}].title" style="` +
            `font-family:var(--tls-font-family);` +
            pt.css(`cells.${i}.title`, `font-size:var(--tls-type-subheading);line-height:${FG_LH.title};`) +
            `color:${ctx.cssVar('on')};` +
            `margin-bottom:${FG_TITLE_GAP}px;` +
          `">${pt.html(`cells.${i}.title`, ctx.esc(cell.title))}</div>` +
          // Description
          `<div data-part="cell[${i}].desc" style="` +
            `font-family:var(--tls-font-family);` +
            pt.css(`cells.${i}.desc`, `font-size:var(--tls-type-body);line-height:${FG_LH.desc};`) +
            `color:${ctx.cssVar('text-muted')};` +
          `">${pt.html(`cells.${i}.desc`, ctx.esc(cell.desc))}</div>` +
        `</div>`
      )
    })
    .join('')

  return (
    `<div style="` +
      `display:grid;` +
      `grid-template-columns:repeat(${cols},minmax(0,1fr));` +
      `gap:${gap}px;` +
      `align-items:${card ? 'stretch' : 'start'};` +
    `">${cellHtml}</div>`
  )
}