/**
 * HTML template for tls.c.feature-reveal. Parts: card[i], icon[i], title[i], text[i].
 * The card grid sits in a `perspective` container so the expressive timeline can tilt cards in 3D.
 */

import type { HtmlTemplateContext } from '../../../types'
import { iconSvg, roleVar } from '../_showcase'
import type { FeatureRevealProps } from './schema'
import { geometry, itemsOf, REVEAL } from './schema'
import { posterText } from '../../../html-block'

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

  // LO7: with a poster (the live host) every text paints the poster's lines and metrics (and
  // only the lines that fit the card, as the poster does).
  const pt = posterText(ctx)

  const cards = items
    .map((m, i) => {
      const b = g.cards[i]
      // Two decimals (RVM2): the browser re-serialises a long fraction (452.333333px → 452.333px)
      // the first time the timeline writes this element's inline style.
      const px = (n: number) => Math.round(n * 100) / 100
      return (
        `<div data-part="card[${i}]" style="position:absolute;left:${px(b.x)}px;top:${px(b.y)}px;width:${px(b.w)}px;height:${px(b.h)}px;` +
        `box-sizing:border-box;padding:${px(g.pad)}px;border-radius:24px;background:${card};overflow:hidden;` +
        `box-shadow:0 18px 40px -24px rgba(0,0,0,0.35);backface-visibility:hidden;">` +
        `<div data-part="icon[${i}]" style="width:${px(g.icon)}px;height:${px(g.icon)}px;border-radius:50%;display:flex;align-items:center;justify-content:center;` +
        `background:color-mix(in srgb, ${accent} 16%, transparent);">${iconSvg(m.icon ?? '', g.icon * 0.55, accent)}</div>` +
        `<div data-part="title[${i}]" style="margin-top:${px(g.pad * 0.6)}px;${pt.css(`items.${i}.title`, `font-size:${titleSize}px;line-height:${REVEAL.titleLH};`)}` +
        `font-weight:700;color:${ctx.cssVar('on')};">${pt.html(`items.${i}.title`, ctx.esc(m.title), false)}</div>` +
        (m.text
          ? `<div data-part="text[${i}]" style="margin-top:${REVEAL.textGap}px;${pt.css(`items.${i}.text`, `font-size:${textSize}px;line-height:${REVEAL.textLH};`)}` +
            `color:${ctx.cssVar('text-muted')};">${pt.html(`items.${i}.text`, ctx.esc(m.text))}</div>`
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
