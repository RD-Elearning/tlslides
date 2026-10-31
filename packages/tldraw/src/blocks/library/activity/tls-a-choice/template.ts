/**
 * HTML template of tls.a.choice. One absolutely positioned `<button>` per option, over the poster's
 * option boxes (`optionbg[i]`), so the live block has the poster's geometry. Every control is a real
 * button (keyboard and screen readers work); `interact.ts` wires them. User text goes through
 * `ctx.esc()`. Colours are the resolved tokens (positive / negative roles), never hex in props.
 */

import type { HtmlTemplateContext } from '../../../types'
import { contrastRatio } from '../../../color-math'
import { lumOf } from '../../text/_engine/color'
import { partBox } from '../../../activity/poster-parts'
import { FOOTER_H } from './index'
import type { ChoiceBlockProps } from './index'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function plain(v: unknown): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && Array.isArray((v as { runs?: unknown }).runs)) return (v as { runs: Array<{ text: string }> }).runs.map((r) => r.text).join('')
  return ''
}

const px = (n: number) => `${Math.round(n * 100) / 100}px`
const at = (b: { x: number; y: number; width: number; height: number }) => `left:${px(b.x)};top:${px(b.y)};width:${px(b.width)};height:${px(b.height)};`

export function template(props: ChoiceBlockProps, ctx: HtmlTemplateContext): string {
  const { esc, tokens, box } = ctx
  const c = tokens.color
  const options = (Array.isArray(props.options) ? props.options : []).slice(0, 5)
  const q = partBox(ctx.poster, 'question')
  const body = tokens.type.body
  const sub = tokens.type.subheading
  const gap = tokens.space.md
  const last = options.reduce((m, _, i) => Math.max(m, (partBox(ctx.poster, `optionbg[${i}]`)?.y ?? 0) + (partBox(ctx.poster, `optionbg[${i}]`)?.height ?? 0)), 0)
  const footTop = last + gap * 1.5
  const badge = 52
  // text on the accent: the lighter or darker of surface / text, whichever reads better
  const onAccent = contrastRatio(lumOf(c.surface), lumOf(c.accent)) >= contrastRatio(lumOf(c.text), lumOf(c.accent)) ? c.surface : c.text
  const buttons = options
    .map((text, i) => {
      const b = partBox(ctx.poster, `optionbg[${i}]`)
      if (!b) return ''
      return (
        `<button type="button" class="tlsa-opt" data-act="option" data-i="${i}" data-state="idle" aria-pressed="false" style="${at(b)}">` +
        `<span class="tlsa-badge" aria-hidden="true">${LETTERS[i]}</span>` +
        `<span class="tlsa-text">${esc(String(text))}</span>` +
        `<span class="tlsa-mark" aria-hidden="true"></span></button>`
      )
    })
    .join('')
  const css =
    `[data-activity="choice"]{position:relative;width:${px(box.width)};height:${px(box.height)};font-family:var(--tls-font-body,var(--tls-font-family));color:var(--tls-on)}` +
    `[data-activity="choice"] button{font:inherit;color:inherit;cursor:pointer;text-align:left}` +
    `[data-activity="choice"] .tlsa-q{position:absolute;font-family:var(--tls-font-heading,var(--tls-font-family));font-weight:700;font-size:${px(sub.size)};line-height:${sub.lineHeight}}` +
    `[data-activity="choice"] .tlsa-opt{position:absolute;box-sizing:border-box;display:flex;align-items:center;gap:${px(gap)};padding:0 ${px(tokens.space.lg)};border:3px solid transparent;border-radius:${px(tokens.radius.lg)};background:${c.surfaceAlt};font-size:${px(body.size)};line-height:${body.lineHeight}}` +
    `[data-activity="choice"] .tlsa-opt:focus-visible{outline:4px solid ${c.accent};outline-offset:2px}` +
    `[data-activity="choice"] .tlsa-opt[aria-pressed="true"]{border-color:${c.accent}}` +
    `[data-activity="choice"] .tlsa-badge{flex:none;width:${badge}px;height:${badge}px;border-radius:50%;background:${c.accent};color:${onAccent};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${px(sub.size)}}` +
    `[data-activity="choice"] .tlsa-text{flex:1;min-width:0}` +
    `[data-activity="choice"] .tlsa-mark{flex:none;width:40px;text-align:center;font-weight:700;font-size:${px(sub.size)}}` +
    `[data-activity="choice"] .tlsa-opt[data-state="correct"],[data-activity="choice"] .tlsa-opt[data-state="missed"]{border-color:${c.positive};background:color-mix(in srgb,${c.positive} 16%,${c.surface})}` +
    `[data-activity="choice"] .tlsa-opt[data-state="correct"] .tlsa-mark::before,[data-activity="choice"] .tlsa-opt[data-state="missed"] .tlsa-mark::before{content:"✓";color:${c.positive}}` +
    `[data-activity="choice"] .tlsa-opt[data-state="wrong"]{border-color:${c.negative};background:color-mix(in srgb,${c.negative} 14%,${c.surface})}` +
    `[data-activity="choice"] .tlsa-opt[data-state="wrong"] .tlsa-mark::before{content:"✗";color:${c.negative}}` +
    `[data-activity="choice"] .tlsa-foot{position:absolute;left:0;width:100%;height:${px(FOOTER_H)};display:flex;align-items:center;gap:${px(gap)};font-size:${px(body.size * 0.9)}}` +
    `[data-activity="choice"] .tlsa-fb{flex:1;min-width:0;font-weight:700}` +
    `[data-activity="choice"] .tlsa-fb[data-ok="true"]{color:${c.positive}}[data-activity="choice"] .tlsa-fb[data-ok="false"]{color:${c.negative}}` +
    `[data-activity="choice"] .tlsa-btn{border:2px solid ${c.accent};border-radius:${px(tokens.radius.md)};background:transparent;padding:8px 20px;font-weight:700}` +
    `[data-activity="choice"] .tlsa-btn.primary{background:${c.accent};color:${onAccent}}` +
    `[data-activity="choice"] .tlsa-btn:disabled{opacity:.45;cursor:default}[data-activity="choice"] [hidden]{display:none!important}` +
    `[data-activity="choice"] .tlsa-expl{position:absolute;left:0;width:100%;font-size:${px(body.size * 0.9)};line-height:${body.lineHeight};color:var(--tls-text-muted)}`
  const expl = props.explanation ? `<div class="tlsa-expl" data-part="explanation" style="top:${px(footTop + FOOTER_H)}" hidden>${esc(String(props.explanation))}</div>` : ''
  return (
    `<div data-activity="choice" data-part="root"><style>${css}</style>` +
    `<div class="tlsa-q" data-part="question" style="${q ? at(q) : 'left:0;top:0;width:100%;'}">${esc(plain(props.prompt))}</div>` +
    buttons +
    `<div class="tlsa-foot" style="top:${px(footTop)}"><div class="tlsa-fb" data-part="feedback" role="status" aria-live="polite"></div>` +
    `<button type="button" class="tlsa-btn primary" data-act="check" hidden disabled></button>` +
    `<button type="button" class="tlsa-btn" data-act="show" hidden></button>` +
    `<button type="button" class="tlsa-btn" data-act="retry" hidden></button></div>` +
    expl +
    `</div>`
  )
}
