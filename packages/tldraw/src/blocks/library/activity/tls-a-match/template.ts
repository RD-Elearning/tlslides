import type { HtmlTemplateContext } from '../../../types'
import { partBox } from '../../../activity/poster-parts'
import { css, explHtml, footerHtml, footerTop, at, px, questionHtml } from '../../../activity/live-kit'
import { FOOTER_H, rightOrder } from './index'
import type { MatchProps } from './index'

/** Cells follow the poster: `cell[2r]` is left r, `cell[2r+1]` the r-th displayed right (data-r = its pair index). */
export function template(props: MatchProps, ctx: HtmlTemplateContext): string {
  const { esc, tokens } = ctx
  const pairs = (Array.isArray(props.pairs) ? props.pairs : []).slice(0, 6)
  const ord = rightOrder({ ...props, pairs })
  const extra =
    `[data-activity="match"] .tlsa-cell[data-side]{justify-content:space-between}` +
    `[data-activity="match"] .tlsa-cell[data-linked]{border-color:${tokens.color.accent}}` +
    `[data-activity="match"] .tlsa-badge{flex:none;min-width:32px;height:32px;border-radius:16px;background:${tokens.color.accent};color:${tokens.color.surface};font-weight:700;text-align:center;line-height:32px}`
  const cells = pairs
    .flatMap((pr, r) => [
      { side: 'l', i: r, text: String(pr.left) },
      { side: 'r', i: ord[r], text: String(pairs[ord[r]].right) },
    ])
    .map((c, k) => {
      const b = partBox(ctx.poster, `cell[${k}]`)
      return b ? `<button type="button" class="tlsa-cell" data-act="${c.side === 'l' ? 'left' : 'right'}" data-side="${c.side}" data-i="${c.i}" data-state="idle" aria-pressed="false" style="${at(b)}"><span class="tlsa-t">${esc(c.text)}</span><span class="tlsa-badge" hidden></span><span class="tlsa-mark" aria-hidden="true"></span></button>` : ''
    })
    .join('')
  const top = footerTop(ctx.poster, tokens.space.md)
  return (
    `<div data-activity="match" data-part="root"><style>${css('match', ctx, FOOTER_H)}${extra}</style>` +
    questionHtml(ctx, props.prompt) + cells + footerHtml(top, { check: true, show: true }) + explHtml(ctx, props.explanation, top + FOOTER_H) + `</div>`
  )
}
