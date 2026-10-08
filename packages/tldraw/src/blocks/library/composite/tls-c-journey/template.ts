/**
 * HTML template for tls.c.journey. Parts: path, node[i], label[i].
 * The path is an inline SVG over a faint dotted track; its dash length (`data-length`) is
 * computed from the same geometry as the poster, so no DOM measurement is needed to draw it.
 */

import type { HtmlTemplateContext } from '../../../types'
import { roleVar } from '../_showcase'
import type { JourneyProps } from './schema'
import { geometry, labelTokens, milestonesOf } from './schema'

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
    const pos = n.above ? `bottom:${H - (n.y - g.gap)}px;` : `top:${n.y + g.gap}px;`
    out.push(
      `<div data-part="label[${i}]" style="position:absolute;left:${n.x - g.labelW / 2}px;${pos}width:${g.labelW}px;text-align:center;">` +
        `<div style="font-size:${t?.caption?.size ?? 22}px;line-height:1.4;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${accent};">${ctx.esc(m.when)}</div>` +
        `<div style="margin-top:4px;font-size:${t?.[tok.title]?.size ?? 36}px;line-height:1.25;font-weight:700;color:${ctx.cssVar('on')};">${ctx.esc(m.title)}</div>` +
        (m.text
          ? `<div style="margin-top:6px;font-size:${t?.[tok.text]?.size ?? 22}px;line-height:1.4;color:${ctx.cssVar('text-muted')};">${ctx.esc(m.text)}</div>`
          : '') +
        `</div>`
    )
  })

  return `<div data-journey style="position:relative;width:100%;height:100%;font-family:var(--tls-font-family);">${out.join('')}</div>`
}
