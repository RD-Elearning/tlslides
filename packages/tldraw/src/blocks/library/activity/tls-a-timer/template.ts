import type { HtmlTemplateContext } from '../../../types'
import { partBox } from '../../../activity/poster-parts'
import { css, footerTop, at, px, questionHtml } from '../../../activity/live-kit'
import { FOOTER_H, clock } from './index'
import type { TimerProps } from './index'

export function template(props: TimerProps, ctx: HtmlTemplateContext): string {
  const { tokens } = ctx
  const b = partBox(ctx.poster, 'cell[0]')
  const extra =
    `[data-activity="timer"] .tlsa-clock{position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border-radius:${px(tokens.radius.lg)};background:${tokens.color.surfaceAlt};font-family:var(--tls-font-heading,var(--tls-font-family));font-weight:700;font-size:${px(tokens.type.title.size)};font-variant-numeric:tabular-nums}` +
    `[data-activity="timer"] .tlsa-clock[data-state="up"]{color:${tokens.color.negative};border:3px solid ${tokens.color.negative}}`
  const top = footerTop(ctx.poster, tokens.space.md)
  return (
    `<div data-activity="timer" data-part="root"><style>${css('timer', ctx, FOOTER_H)}${extra}</style>` +
    questionHtml(ctx, props.label) +
    (b ? `<div class="tlsa-clock" data-part="clock" role="timer" style="${at(b)}">${clock(props.seconds)}</div>` : '') +
    `<div class="tlsa-foot" style="top:${px(top)}"><div class="tlsa-fb" data-part="feedback" role="status" aria-live="polite"></div>` +
    `<button type="button" class="tlsa-btn primary" data-act="start"></button><button type="button" class="tlsa-btn" data-act="stop" hidden></button><button type="button" class="tlsa-btn" data-act="retry" hidden></button></div></div>`
  )
}
