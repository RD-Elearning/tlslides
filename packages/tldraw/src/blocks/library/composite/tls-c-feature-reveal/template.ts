/**
 * HTML template for tls.c.feature-reveal. Parts: card[i], icon[i], title[i], text[i].
 * The card grid sits in a `perspective` container so the expressive timeline can tilt cards in 3D.
 */

import type { HtmlTemplateContext } from '../../../types'
import { iconSvg, roleVar } from '../_showcase'
import type { FeatureRevealProps } from './schema'
import { geometry, itemsOf } from './schema'

export function template(props: FeatureRevealProps, ctx: HtmlTemplateContext): string {
  const W = ctx.box?.width ?? 1728
  const H = ctx.box?.height ?? 752
  const items = itemsOf(props)
  const g = geometry(W, H, items.length)
  const accent = ctx.cssVar('accent')
  const card = roleVar(ctx, 'surfaceAlt', 'surface-alt')
  const t = ctx.tokens?.type
  const titleSize = g.compact ? t?.body?.size ?? 28 : t?.lead?.size ?? 36
  const textSize = g.compact ? t?.caption?.size ?? 22 : t?.body?.size ?? 28

  const cards = items
    .map((m, i) => {
      const b = g.cards[i]
      return (
        `<div data-part="card[${i}]" style="position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;` +
        `box-sizing:border-box;padding:${g.pad}px;border-radius:24px;background:${card};overflow:hidden;` +
        `box-shadow:0 18px 40px -24px rgba(0,0,0,0.35);backface-visibility:hidden;">` +
        `<div data-part="icon[${i}]" style="width:${g.icon}px;height:${g.icon}px;border-radius:50%;display:flex;align-items:center;justify-content:center;` +
        `background:color-mix(in srgb, ${accent} 16%, transparent);">${iconSvg(m.icon ?? '', g.icon * 0.55, accent)}</div>` +
        `<div data-part="title[${i}]" style="margin-top:${g.pad * 0.6}px;font-size:${titleSize}px;line-height:1.25;font-weight:700;color:${ctx.cssVar('on')};">${ctx.esc(m.title)}</div>` +
        (m.text
          ? `<div data-part="text[${i}]" style="margin-top:8px;font-size:${textSize}px;line-height:1.45;color:${ctx.cssVar('text-muted')};">${ctx.esc(m.text)}</div>`
          : '') +
        `</div>`
      )
    })
    .join('')

  return (
    `<div data-feature-reveal style="position:relative;width:100%;height:100%;perspective:1600px;font-family:var(--tls-font-family);">` +
    `${cards}</div>`
  )
}
