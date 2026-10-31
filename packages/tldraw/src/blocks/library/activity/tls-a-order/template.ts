import type { HtmlTemplateContext } from '../../../types'
import { partBox } from '../../../activity/poster-parts'
import { css, explHtml, footerHtml, footerTop, at, questionHtml } from '../../../activity/live-kit'
import { FOOTER_H, displayOrder } from './index'
import type { OrderProps } from './index'

/** Row k (poster `cell[k]`) shows correct-index displayOrder[k]; the number badge appears once picked. */
export function template(props: OrderProps, ctx: HtmlTemplateContext): string {
  const { esc, tokens } = ctx
  const items = (Array.isArray(props.items) ? props.items : []).slice(0, 7).map(String)
  const ord = displayOrder({ ...props, items })
  const extra = `[data-activity="order"] .tlsa-badge{flex:none;min-width:36px;height:36px;border-radius:18px;background:${tokens.color.accent};color:${tokens.color.surface};font-weight:700;text-align:center;line-height:36px}`
  const rows = ord
    .map((ci, k) => {
      const b = partBox(ctx.poster, `cell[${k}]`)
      return b ? `<button type="button" class="tlsa-cell" data-act="item" data-i="${ci}" data-state="idle" aria-pressed="false" style="${at(b)}"><span class="tlsa-badge" hidden></span><span class="tlsa-t">${esc(items[ci])}</span><span class="tlsa-mark" aria-hidden="true"></span></button>` : ''
    })
    .join('')
  const top = footerTop(ctx.poster, tokens.space.md)
  return (
    `<div data-activity="order" data-part="root"><style>${css('order', ctx, FOOTER_H)}${extra}</style>` +
    questionHtml(ctx, props.prompt) + rows + footerHtml(top, { check: true, show: true }) + explHtml(ctx, props.explanation, top + FOOTER_H) + `</div>`
  )
}
