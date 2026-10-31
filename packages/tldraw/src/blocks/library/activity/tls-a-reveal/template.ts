import type { HtmlTemplateContext } from '../../../types'
import { partBox } from '../../../activity/poster-parts'
import { css, footerTop, at, px, questionHtml } from '../../../activity/live-kit'
import { FOOTER_H } from './index'
import type { RevealProps } from './index'

export function template(props: RevealProps, ctx: HtmlTemplateContext): string {
  const { esc, tokens } = ctx
  const hints = (Array.isArray(props.hints) ? props.hints : []).slice(0, 3)
  const extra =
    `[data-activity="reveal"] .tlsa-hint[hidden]{display:none}` +
    `[data-activity="reveal"] .tlsa-area{position:absolute;box-sizing:border-box;display:flex;align-items:center;padding:0 ${px(tokens.space.lg)};border-radius:${px(tokens.radius.lg)};background:${tokens.color.surfaceAlt};border:3px dashed ${tokens.color.accent};font-size:${px(tokens.type.body.size)};line-height:${tokens.type.body.lineHeight}}` +
    `[data-activity="reveal"] .tlsa-area[data-shown="true"]{border-style:solid;background:color-mix(in srgb,${tokens.color.positive} 14%,${tokens.color.surface})}` +
    `[data-activity="reveal"] .tlsa-area .ans{visibility:hidden}` +
    `[data-activity="reveal"] .tlsa-area[data-shown="true"] .ans{visibility:visible}`
  const rows = hints
    .map((h, i) => {
      const b = partBox(ctx.poster, `cell[${i}]`)
      return b ? `<div class="tlsa-cell tlsa-hint" data-hint="${i}" style="${at(b)}" hidden><span class="tlsa-t">${esc(String(h))}</span></div>` : ''
    })
    .join('')
  const a = partBox(ctx.poster, 'area')
  const area = a ? `<div class="tlsa-area" data-part="answer" data-shown="false" style="${at(a)}"><span class="ans">${esc(String(props.answer ?? ''))}</span></div>` : ''
  const top = footerTop(ctx.poster, tokens.space.md)
  return (
    `<div data-activity="reveal" data-part="root"><style>${css('reveal', ctx, FOOTER_H)}${extra}</style>` +
    questionHtml(ctx, props.prompt) + rows + area +
    `<div class="tlsa-foot" style="top:${px(top)}"><div class="tlsa-fb" data-part="feedback" role="status" aria-live="polite"></div>` +
    `<button type="button" class="tlsa-btn" data-act="hint" hidden></button><button type="button" class="tlsa-btn primary" data-act="show"></button><button type="button" class="tlsa-btn" data-act="retry" hidden></button></div></div>`
  )
}
