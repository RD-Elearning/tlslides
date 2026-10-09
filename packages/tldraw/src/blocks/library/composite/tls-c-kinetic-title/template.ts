/**
 * HTML template for tls.c.kinetic-title. Parts: decor, kicker, title, rule, subtitle.
 * Every title word sits in its own overflow-hidden mask (`data-word`) so the expressive timeline
 * can raise it through the mask; the words are not parts (the title is one part).
 */

import type { HtmlTemplateContext } from '../../../types'
import { str, roleVar } from '../_showcase'
import type { KineticTitleProps } from './schema'
import { orbsFor, PANEL_PAD, titleSize, titleWords } from './schema'
import { posterText } from '../../../html-block'
import { readableOn } from '../../text/_engine/color'

/** The template's text metrics and gaps - the poster lays out with the same numbers (LO7). */
export const KT = {
  kickerLH: 1.4,
  kickerTracking: 0.16,
  kickerGap: 28,
  titleLH: 1.08,
  titleTracking: -0.03,
  ruleGap: 36,
  ruleW: 180,
  ruleH: 10,
  subtitleGap: 32,
  subtitleLH: 1.35,
  /** Title column and subtitle widths, as a fraction of the box width. */
  titleCol: 0.84,
  subtitleCol: 0.7,
} as const

export function template(props: KineticTitleProps, ctx: HtmlTemplateContext): string {
  const center = props.align !== 'start'
  const width = ctx.box?.width ?? 1728
  const height = ctx.box?.height ?? 888
  const out: string[] = []
  // LO7: with a poster (the live host) every text part paints its lines and metrics.
  const pt = posterText(ctx)
  // AC2 `tone: accent`: an accent panel; the poster chose the on-accent ink (its title colour),
  // which the kicker, rule and orbs take here; the highlight words take accent2 nudged until it reads
  // on the accent (or the ink without tokens).
  const panel = props.tone === 'accent'
  const ink = pt.leaves('title')[0]?.style.color ?? ctx.cssVar('surface-color')
  const tok = ctx.tokens?.color
  const accent = panel ? ink : ctx.cssVar('accent')
  const accent2 = panel ? ink : roleVar(ctx, 'accent2', 'accent2')
  const hiColor = panel ? (tok ? readableOn(tok.accent2, tok.accent, 3) : ink) : accent

  if (props.decoration !== 'none') {
    const shapes = orbsFor(props, width, height)
      .map((o, i) => {
        const base = `position:absolute;left:${o.cx - o.r}px;top:${o.cy - o.r}px;width:${o.r * 2}px;height:${o.r * 2}px;border-radius:50%;box-sizing:border-box;`
        if (o.kind === 'ring') {
          return `<div data-orb="${i}" style="${base}border:${Math.max(2, o.r * 0.06)}px solid color-mix(in srgb, ${accent} 26%, transparent);"></div>`
        }
        if (o.kind === 'disc') {
          return `<div data-orb="${i}" style="${base}background:radial-gradient(circle at 30% 30%, color-mix(in srgb, ${accent2} 34%, transparent), color-mix(in srgb, ${accent2} 6%, transparent));"></div>`
        }
        return `<div data-orb="${i}" style="${base}background:${accent};"></div>`
      })
      .join('')
    out.push(`<div data-part="decor" style="position:absolute;inset:0px;pointer-events:none;">${shapes}</div>`)
  }

  const kicker = str(props.kicker, 40)
  if (kicker) {
    out.push(
      `<div data-part="kicker" style="position:relative;` +
        pt.css('kicker', `font-size:${ctx.tokens?.type?.caption?.size ?? 22}px;line-height:${KT.kickerLH};letter-spacing:${KT.kickerTracking}em;`) +
        `text-transform:uppercase;font-weight:700;color:${accent};margin-bottom:${KT.kickerGap}px;">` +
        `${pt.html('kicker', ctx.esc(kicker), false)}</div>`
    )
  }

  const words = titleWords(props)
  const size = titleSize(str(props.title, 80), ctx.tokens)
  const wordSpan = (text: string, accentWord: boolean): string =>
    `<span data-word style="display:inline-block;overflow:hidden;vertical-align:top;` +
    `padding:0.16em 0.06em 0.14em;margin:-0.16em -0.06em -0.14em;">` +
    `<span data-word-inner style="display:inline-block;transform-origin:0% 100%;` +
    `${accentWord ? `color:${hiColor};` : ''}">${ctx.esc(text)}</span></span>`
  const titleLines = pt.lines('title')
  let wordHtml: string
  if (titleLines) {
    // The poster's lines, word by word (a word the poster broke mid-word keeps its accent on
    // both pieces); one <br> between lines.
    let wi = 0
    let used = 0
    wordHtml = titleLines
      .map((line) =>
        line.text
          .split(/\s+/)
          .filter(Boolean)
          .map((tok) => {
            const w = words[Math.min(wi, words.length - 1)]
            const html = wordSpan(tok, !!w?.accent)
            used += tok.length
            if (w && used >= w.text.length) {
              wi++
              used = 0
            }
            return html
          })
          .join(' ')
      )
      .join('<br>')
  } else {
    wordHtml = words.map((w) => wordSpan(w.text, w.accent)).join(' ')
  }
  out.push(
    // With the poster's lines no max-width: a line the browser paints a little wider than the
    // table measured must stay centred, not overflow a capped box to the right.
    `<div data-part="title" style="position:relative;${titleLines ? '' : `max-width:${Math.round(width * KT.titleCol)}px;`}` +
      pt.css('title', `font-size:${size}px;line-height:${KT.titleLH};letter-spacing:${KT.titleTracking}em;`) +
      `font-weight:800;color:${panel ? ink : ctx.cssVar('on')};">${wordHtml}</div>`
  )

  out.push(
    `<div data-part="rule" style="position:relative;width:${KT.ruleW}px;height:${KT.ruleH}px;border-radius:5px;margin-top:${KT.ruleGap}px;flex:none;` +
      `background:linear-gradient(90deg, ${accent}, ${accent2});"></div>`
  )

  const subtitle = str(props.subtitle, 120)
  if (subtitle) {
    out.push(
      `<div data-part="subtitle" style="position:relative;${pt.active ? '' : `max-width:${Math.round(width * KT.subtitleCol)}px;`}margin-top:${KT.subtitleGap}px;` +
        pt.css('subtitle', `font-size:${ctx.tokens?.type?.lead?.size ?? 36}px;line-height:${KT.subtitleLH};`) +
        `color:${panel ? ink : ctx.cssVar('text-muted')};${panel ? 'opacity:0.88;' : ''}">` +
        `${pt.html('subtitle', ctx.esc(subtitle))}</div>`
    )
  }

  return (
    `<div data-kinetic-title style="position:relative;width:100%;height:100%;overflow:hidden;box-sizing:border-box;` +
    (panel ? `background:${ctx.cssVar('accent')};border-radius:${ctx.tokens?.radius?.lg ?? 24}px;padding:0px ${Math.min(PANEL_PAD, width * 0.08)}px;` : '') +
    `display:flex;flex-direction:column;justify-content:center;` +
    `align-items:${center ? 'center' : 'flex-start'};text-align:${center ? 'center' : 'left'};` +
    `font-family:var(--tls-font-family);">${out.join('')}</div>`
  )
}
