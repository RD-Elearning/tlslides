/**
 * HTML template for tls.c.kinetic-title. Parts: decor, kicker, title, rule, subtitle.
 * Every title word sits in its own overflow-hidden mask (`data-word`) so the expressive timeline
 * can raise it through the mask; the words are not parts (the title is one part).
 */

import type { HtmlTemplateContext } from '../../../types'
import { str, roleVar } from '../_showcase'
import type { KineticTitleProps } from './schema'
import { orbs, titleSize, titleWords } from './schema'

export function template(props: KineticTitleProps, ctx: HtmlTemplateContext): string {
  const center = props.align !== 'start'
  const accent = ctx.cssVar('accent')
  const accent2 = roleVar(ctx, 'accent2', 'accent2')
  const width = ctx.box?.width ?? 1728
  const height = ctx.box?.height ?? 888
  const out: string[] = []

  if (props.decoration !== 'none') {
    const shapes = orbs(width, height)
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
    out.push(`<div data-part="decor" style="position:absolute;inset:0;pointer-events:none;">${shapes}</div>`)
  }

  const kicker = str(props.kicker, 40)
  if (kicker) {
    out.push(
      `<div data-part="kicker" style="position:relative;font-size:${ctx.tokens?.type?.caption?.size ?? 22}px;` +
        `line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;color:${accent};margin-bottom:28px;">` +
        `${ctx.esc(kicker)}</div>`
    )
  }

  const words = titleWords(props)
  const size = titleSize(str(props.title, 80), ctx.tokens)
  const wordHtml = words
    .map(
      (w) =>
        `<span data-word style="display:inline-block;overflow:hidden;vertical-align:top;` +
        `padding:0.16em 0.06em 0.14em;margin:-0.16em -0.06em -0.14em;">` +
        `<span data-word-inner style="display:inline-block;transform-origin:0% 100%;` +
        `${w.accent ? `color:${accent};` : ''}">${ctx.esc(w.text)}</span></span>`
    )
    .join(' ')
  out.push(
    `<div data-part="title" style="position:relative;max-width:${Math.round(width * 0.84)}px;font-size:${size}px;` +
      `line-height:1.08;letter-spacing:-0.03em;font-weight:800;color:${ctx.cssVar('on')};">${wordHtml}</div>`
  )

  out.push(
    `<div data-part="rule" style="position:relative;width:180px;height:10px;border-radius:5px;margin-top:36px;` +
      `background:linear-gradient(90deg, ${accent}, ${accent2});"></div>`
  )

  const subtitle = str(props.subtitle, 120)
  if (subtitle) {
    out.push(
      `<div data-part="subtitle" style="position:relative;max-width:${Math.round(width * 0.7)}px;margin-top:32px;` +
        `font-size:${ctx.tokens?.type?.lead?.size ?? 36}px;line-height:1.35;color:${ctx.cssVar('text-muted')};">` +
        `${ctx.esc(subtitle)}</div>`
    )
  }

  return (
    `<div data-kinetic-title style="position:relative;width:100%;height:100%;overflow:hidden;box-sizing:border-box;` +
    `display:flex;flex-direction:column;justify-content:center;` +
    `align-items:${center ? 'center' : 'flex-start'};text-align:${center ? 'center' : 'left'};` +
    `font-family:var(--tls-font-family);">${out.join('')}</div>`
  )
}
