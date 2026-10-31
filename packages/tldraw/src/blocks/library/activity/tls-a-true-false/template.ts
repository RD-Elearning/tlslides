import type { HtmlTemplateContext } from '../../../types'
import { partBox } from '../../../activity/poster-parts'
import { css, explHtml, footerHtml, footerTop, at, questionHtml } from '../../../activity/live-kit'
import { FOOTER_H } from './index'
import type { TrueFalseProps } from './index'

/** Each statement row (the poster's `cell[i]`) gets its text and two buttons, Đúng / Sai, on its right. */
export function template(props: TrueFalseProps, ctx: HtmlTemplateContext): string {
  const { esc, tokens } = ctx
  const st = (Array.isArray(props.statements) ? props.statements : []).slice(0, 6)
  const rows = st
    .map((s, i) => {
      const b = partBox(ctx.poster, `cell[${i}]`)
      if (!b) return ''
      return (
        `<div class="tlsa-cell" data-row="${i}" data-state="idle" style="${at(b)}">` +
        `<span class="tlsa-t">${esc(String(s.text))}</span>` +
        `<button type="button" class="tlsa-btn" data-act="statement" data-i="${i}" data-v="1" aria-pressed="false">✓</button>` +
        `<button type="button" class="tlsa-btn" data-act="statement" data-i="${i}" data-v="0" aria-pressed="false">✗</button>` +
        `<span class="tlsa-mark" aria-hidden="true"></span></div>`
      )
    })
    .join('')
  const top = footerTop(ctx.poster, tokens.space.md)
  return (
    `<div data-activity="true-false" data-part="root"><style>${css('true-false', ctx, FOOTER_H)}</style>` +
    questionHtml(ctx, props.prompt) + rows + footerHtml(top, { check: true, show: true }) + explHtml(ctx, props.explanation, top + FOOTER_H) + `</div>`
  )
}
