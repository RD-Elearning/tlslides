import type { HtmlTemplateContext } from '../../../types'
import { partBox } from '../../../activity/poster-parts'
import { css, explHtml, footerHtml, footerTop, at, px, questionHtml } from '../../../activity/live-kit'
import { FOOTER_H, displayOrder } from './index'
import type { SortProps } from './index'

export function template(props: SortProps, ctx: HtmlTemplateContext): string {
  const { esc, tokens } = ctx
  const c = tokens.color
  const items = (Array.isArray(props.items) ? props.items : []).slice(0, 9)
  const bins = (Array.isArray(props.bins) ? props.bins : []).slice(0, 3).map(String)
  const ord = displayOrder({ ...props, items })
  const extra =
    `[data-activity="sort"] .tlsa-badge{flex:none;min-width:32px;height:32px;border-radius:16px;background:${c.accent};color:${c.surface};font-weight:700;text-align:center;line-height:32px}` +
    `[data-activity="sort"] .tlsa-chip{position:absolute;box-sizing:border-box;border:3px solid ${c.accent};border-radius:999px;background:${c.surfaceAlt};font-size:${px(tokens.type.body.size)};text-align:center;padding:0}`
  const cells = ord
    .map((ii, k) => {
      const b = partBox(ctx.poster, `cell[${k}]`)
      return b ? `<button type="button" class="tlsa-cell" data-act="item" data-i="${ii}" data-state="idle" aria-pressed="false" style="${at(b)}"><span class="tlsa-t">${esc(String(items[ii].text))}</span><span class="tlsa-badge" hidden></span><span class="tlsa-mark" aria-hidden="true"></span></button>` : ''
    })
    .join('')
  const chips = bins
    .map((name, i) => {
      const b = partBox(ctx.poster, `chip[${i}]`)
      return b ? `<button type="button" class="tlsa-chip" data-act="bin" data-b="${i}" style="${at(b)}">${i + 1}. ${esc(name)}</button>` : ''
    })
    .join('')
  const top = footerTop(ctx.poster, tokens.space.md)
  return (
    `<div data-activity="sort" data-part="root"><style>${css('sort', ctx, FOOTER_H)}${extra}</style>` +
    questionHtml(ctx, props.prompt) + cells + chips + footerHtml(top, { check: true, show: true }) + explHtml(ctx, props.explanation, top + FOOTER_H) + `</div>`
  )
}
