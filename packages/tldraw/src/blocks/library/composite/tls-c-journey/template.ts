/**
 * HTML template for tls.c.journey. Parts: path, node[i], label[i].
 * The path is an inline SVG over a faint dotted track; its dash length (`data-length`) is
 * computed from the same geometry as the poster, so no DOM measurement is needed to draw it.
 */

import type { HtmlTemplateContext } from '../../../types'
import { roleVar } from '../_showcase'
import type { JourneyProps } from './schema'
import { geometry, labelTokens, milestonesOf } from './schema'
import { posterText } from '../../../html-block'

/** The label stack's metrics and gaps - the poster lays out with the same numbers (LO7). */
export const JOURNEY_LABEL = {
  whenLH: 1.4,
  whenTracking: 0.06,
  titleLH: 1.25,
  titleGap: 4,
  textLH: 1.4,
  textGap: 6,
} as const

export function template(props: JourneyProps, ctx: HtmlTemplateContext): string {
  const W = ctx.box?.width ?? 1728
  const H = ctx.box?.height ?? 752
  const items = milestonesOf(props)
  const g = geometry(W, H, items.length)
  const accent = ctx.cssVar('accent')
  const accent2 = roleVar(ctx, 'accent2', 'accent2')
  const track = roleVar(ctx, 'line', 'line')
  const tok = labelTokens(items.length)
  const t = ctx.tokens?.type
  const out: string[] = []
  // LO7: with a poster (the live host) every label paints the poster's lines and metrics, at the
  // poster's top (the poster also clamps a stack into the box).
  const pt = posterText(ctx)
  const L = JOURNEY_LABEL

  out.push(
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:0;top:0;overflow:visible" aria-hidden="true">` +
      `<defs><linearGradient id="tls-journey-grad" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${accent2}"/></linearGradient></defs>` +
      // RVM6: the dotted guide track is a part, so it fades in with the rest (it popped in one frame)
      `<path data-part="track" d="${g.d}" fill="none" stroke="${track}" stroke-width="${g.stroke}" stroke-linecap="round" stroke-dasharray="1 ${g.stroke * 3}"/>` +
      `<path data-part="path" data-length="${g.length}" d="${g.d}" fill="none" stroke="url(#tls-journey-grad)" ` +
      `stroke-width="${g.stroke}" stroke-linecap="round" stroke-dasharray="${g.length}" style="stroke-dashoffset:0"/>` +
      `</svg>`
  )

  items.forEach((m, i) => {
    const n = g.nodes[i]
    out.push(
      `<div data-part="node[${i}]" style="position:absolute;left:${n.x - g.r}px;top:${n.y - g.r}px;width:${g.r * 2}px;height:${g.r * 2}px;">` +
        `<div data-halo style="position:absolute;inset:${-g.r * 0.6}px;border-radius:50%;background:color-mix(in srgb, ${accent} 22%, transparent);"></div>` +
        `<div style="position:absolute;inset:0;border-radius:50%;background:${accent};box-shadow:inset 0 0 0 ${Math.max(2, g.r * 0.3)}px color-mix(in srgb, white 35%, transparent);"></div>` +
        `</div>`
    )
    const key = `milestones.${i}`
    const posterTop = pt.leaves(`${key}.when`)[0]?.box.y
    const pos =
      posterTop !== undefined ? `top:${posterTop}px;` : n.above ? `bottom:${H - (n.y - g.gap)}px;` : `top:${n.y + g.gap}px;`
    // A column flex box centres each line even when the browser paints it a little wider than
    // the label (the lines are the poster's, not re-wrapped).
    out.push(
      `<div data-part="label[${i}]" style="position:absolute;left:${n.x - g.labelW / 2}px;${pos}width:${g.labelW}px;text-align:center;` +
        `display:flex;flex-direction:column;align-items:center;">` +
        `<div style="${pt.css(`${key}.when`, `font-size:${t?.caption?.size ?? 22}px;line-height:${L.whenLH};letter-spacing:${L.whenTracking}em;`)}` +
        `font-weight:700;text-transform:uppercase;color:${accent};">${pt.html(`${key}.when`, ctx.esc(m.when), false)}</div>` +
        `<div style="margin-top:${L.titleGap}px;${pt.css(`${key}.title`, `font-size:${t?.[tok.title]?.size ?? 36}px;line-height:${L.titleLH};`)}` +
        `font-weight:700;color:${ctx.cssVar('on')};">${pt.html(`${key}.title`, ctx.esc(m.title), false)}</div>` +
        (m.text
          ? `<div style="margin-top:${L.textGap}px;${pt.css(`${key}.text`, `font-size:${t?.[tok.text]?.size ?? 22}px;line-height:${L.textLH};`)}` +
            `color:${ctx.cssVar('text-muted')};">${pt.html(`${key}.text`, ctx.esc(m.text))}</div>`
          : '') +
        `</div>`
    )
  })

  return `<div data-journey style="position:relative;width:100%;height:100%;font-family:var(--tls-font-family);">${out.join('')}</div>`
}
