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
import { effectiveColumns, featureGridColors, FG_CARD_RADIUS, FG_TIERS, tierCircleIcon, type FeatureGridProps } from './schema'
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
  // AC3 pre-item: the poster chose the tier (it measures); a heading-size title leaf means roomy.
  const t0 = pt.leaves('cells.0.title')[0]
  const tier = t0 && t0.style.size >= ctx.tokens.type.heading.size - 0.5 ? FG_TIERS[0] : FG_TIERS[1]
  const disc = tierCircleIcon(cellW, tier)
  const iconBox = circle ? disc.disc : tier.icon
  const glyph = circle ? disc.glyph : tier.icon
  // Stretched card rows: the poster's card heights, row by row.
  const rowHs: number[] = []
  if (card && tier.stretch > 1 && ctx.poster) {
    const walk = (n: import('../../../types').LayoutNode): void => {
      if (n.k === 'group') n.children.forEach(walk)
      else if (n.k === 'rect' && /^cell\[(\d+)\]\.card$/.test(n.part ?? '')) {
        const i = Number(/\d+/.exec(n.part as string)![0])
        if (i % cols === 0) rowHs[Math.floor(i / cols)] = n.box.height
      }
    }
    walk(ctx.poster)
  }

  const cellHtml = cells
    .map((cell, i) => {
      const iconPath = getIconPath(cell.icon as string)
      const fillColor = ctx.cssVar('accent')
      
      return (
        `<div style="` +
          `min-width:0;` +
          `box-sizing:border-box;` +
          (card ? `padding:${tier.pad}px;background:${colors.card};border-radius:${FG_CARD_RADIUS}px;` : '') +
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
            pt.css(`cells.${i}.title`, `font-size:var(--tls-type-${tier.title});line-height:${FG_LH.title};`) +
            `color:${ctx.cssVar('on')};` +
            `margin-bottom:${FG_TITLE_GAP}px;` +
          `">${pt.html(`cells.${i}.title`, ctx.esc(cell.title))}</div>` +
          // Description
          `<div data-part="cell[${i}].desc" style="` +
            `font-family:var(--tls-font-family);` +
            pt.css(`cells.${i}.desc`, `font-size:var(--tls-type-${tier.desc});line-height:${FG_LH.desc};`) +
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
      (rowHs.length ? `grid-template-rows:${rowHs.map((h) => `${h}px`).join(' ')};` : '') +
      `align-items:${card ? 'stretch' : 'start'};` +
    `">${cellHtml}</div>`
  )
}