import type { HtmlTemplateContext } from '../../../types'
import { partBox } from '../../../activity/poster-parts'
import { css, explHtml, footerHtml, footerTop, at, px, questionHtml } from '../../../activity/live-kit'
import { FOOTER_H, bankOf, parseBlanks } from './index'
import type { FillBlankProps } from './index'

/** The sentence sits in the poster's `cell[0]` with inline blank buttons; the bank chips sit over `chip[i]`. */
export function template(props: FillBlankProps, ctx: HtmlTemplateContext): string {
  const { esc, tokens } = ctx
  const c = tokens.color
  const extra =
    `[data-activity="fill-blank"] .tlsa-sentence{display:block;line-height:${tokens.type.body.lineHeight * 1.5}}` +
    `[data-activity="fill-blank"] .tlsa-blank{display:inline-block;min-width:120px;padding:0 12px;margin:0 4px;border:0;border-bottom:3px solid ${c.accent};border-radius:6px 6px 0 0;background:transparent;text-align:center;vertical-align:baseline}` +
    `[data-activity="fill-blank"] .tlsa-blank[data-sel="true"]{background:color-mix(in srgb,${c.accent} 18%,${c.surface})}` +
    `[data-activity="fill-blank"] .tlsa-blank[data-state="correct"]{border-bottom-color:${c.positive}}` +
    `[data-activity="fill-blank"] .tlsa-blank[data-state="wrong"]{border-bottom-color:${c.negative}}` +
    `[data-activity="fill-blank"] .tlsa-blank[data-state="missed"]{border-bottom-style:dashed;border-bottom-color:${c.positive}}` +
    `[data-activity="fill-blank"] .tlsa-chip{position:absolute;box-sizing:border-box;border:3px solid transparent;border-radius:999px;background:${c.surfaceAlt};font-size:${px(tokens.type.body.size)};text-align:center;padding:0}` +
    `[data-activity="fill-blank"] .tlsa-chip:disabled{opacity:.4;cursor:default}`
  let bi = 0
  const sentence = parseBlanks(String(props.text ?? ''))
    .map((x) => ('blank' in x ? `<button type="button" class="tlsa-blank" data-act="blank" data-i="${bi++}" data-state="idle" aria-label="blank"></button>` : esc(x.t)))
    .join('')
  const cell = partBox(ctx.poster, 'cell[0]')
  const box = cell ? `<div class="tlsa-cell" style="${at(cell)}"><span class="tlsa-t tlsa-sentence">${sentence}</span></div>` : ''
  const chips = bankOf(props)
    .map((w, i) => {
      const b = partBox(ctx.poster, `chip[${i}]`)
      return b ? `<button type="button" class="tlsa-chip" data-act="chip" data-w="${esc(w)}" style="${at(b)}">${esc(w)}</button>` : ''
    })
    .join('')
  const top = footerTop(ctx.poster, tokens.space.md)
  return (
    `<div data-activity="fill-blank" data-part="root"><style>${css('fill-blank', ctx, FOOTER_H)}${extra}</style>` +
    questionHtml(ctx, props.prompt) + box + chips + footerHtml(top, { check: true, show: true }) + explHtml(ctx, props.explanation, top + FOOTER_H) + `</div>`
  )
}
