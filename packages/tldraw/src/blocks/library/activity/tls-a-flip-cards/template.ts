import type { HtmlTemplateContext } from '../../../types'
import { partBox } from '../../../activity/poster-parts'
import { css, footerTop, at, px, questionHtml } from '../../../activity/live-kit'
import { FOOTER_H } from './index'
import type { FlipProps } from './index'

export function template(props: FlipProps, ctx: HtmlTemplateContext): string {
  const { esc, tokens } = ctx
  const cards = (Array.isArray(props.cards) ? props.cards : []).slice(0, 8)
  const body = tokens.type.body
  const extra =
    `[data-activity="flip-cards"] .tlsa-card{justify-content:center;text-align:center;font-weight:700;font-size:${px(body.size * 1.15)}}` +
    `[data-activity="flip-cards"] .tlsa-card .back{display:none;font-weight:400;font-size:${px(body.size)}}` +
    `[data-activity="flip-cards"] .tlsa-card[aria-pressed="true"] .front{display:none}` +
    `[data-activity="flip-cards"] .tlsa-card[aria-pressed="true"] .back{display:block}` +
    `[data-activity="flip-cards"] .tlsa-card[aria-pressed="true"]{background:color-mix(in srgb,${tokens.color.accent} 14%,${tokens.color.surface})}`
  const buttons = cards
    .map((c, i) => {
      const b = partBox(ctx.poster, `cell[${i}]`)
      if (!b) return ''
      return `<button type="button" class="tlsa-cell tlsa-card" data-act="flip" data-i="${i}" aria-pressed="false" style="${at(b)}"><span class="tlsa-t"><span class="front">${esc(String(c.front))}</span><span class="back">${esc(String(c.back))}</span></span></button>`
    })
    .join('')
  const top = footerTop(ctx.poster, tokens.space.md)
  return (
    `<div data-activity="flip-cards" data-part="root"><style>${css('flip-cards', ctx, FOOTER_H)}${extra}</style>` +
    questionHtml(ctx, props.prompt ?? '') + buttons +
    `<div class="tlsa-foot" style="top:${px(top)}"><div class="tlsa-fb" data-part="feedback" role="status" aria-live="polite"></div>` +
    `<button type="button" class="tlsa-btn" data-act="flipall"></button><button type="button" class="tlsa-btn" data-act="unflipall" hidden></button></div></div>`
  )
}
