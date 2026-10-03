/**
 * HTML template for tls.c.stat-spotlight. Parts: ring, value, label, context, stat[i].
 * The ring is an inline SVG (track + arc); the arc's dash offset is what the timeline draws.
 * The template always shows the settled frame (full value, arc at its progress).
 */

import type { HtmlTemplateContext } from '../../../types'
import { roleVar, str } from '../_showcase'
import type { StatSpotlightProps } from './schema'
import { geometry, progressOf, statsOf } from './schema'

export function template(props: StatSpotlightProps, ctx: HtmlTemplateContext): string {
  const W = ctx.box?.width ?? 1728
  const H = ctx.box?.height ?? 752
  const g = geometry(W, H, props)
  const accent = ctx.cssVar('accent')
  const accent2 = roleVar(ctx, 'accent2', 'accent2')
  const line = roleVar(ctx, 'surfaceAlt', 'surface-alt')
  const r = Math.max(0, g.d / 2 - g.sw / 2)
  const c = 2 * Math.PI * r
  const p = progressOf(props)
  const t = ctx.tokens?.type
  const out: string[] = []

  out.push(
    `<div data-part="ring" style="position:absolute;left:${g.ringX}px;top:${g.ringY}px;width:${g.d}px;height:${g.d}px;">` +
      `<svg width="${g.d}" height="${g.d}" viewBox="0 0 ${g.d} ${g.d}" style="display:block;overflow:visible">` +
      `<defs><linearGradient id="tls-spot-grad" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${accent2}"/></linearGradient></defs>` +
      `<circle cx="${g.d / 2}" cy="${g.d / 2}" r="${r}" fill="none" stroke="${line}" stroke-width="${g.sw}"/>` +
      `<circle data-arc data-circumference="${c}" data-progress="${p}" cx="${g.d / 2}" cy="${g.d / 2}" r="${r}" fill="none" ` +
      `stroke="url(#tls-spot-grad)" stroke-width="${g.sw}" stroke-linecap="round" ` +
      `stroke-dasharray="${c}" style="stroke-dashoffset:${c * (1 - p)}" transform="rotate(-90 ${g.d / 2} ${g.d / 2})"/>` +
      `</svg></div>`
  )
  out.push(
    `<div data-part="value" data-count="${ctx.esc(str(props.value, 12))}" style="position:absolute;left:${g.ringX}px;top:${g.ringY}px;` +
      `width:${g.d}px;height:${g.d}px;display:flex;align-items:center;justify-content:center;font-size:${g.valueSize}px;` +
      `line-height:1;font-weight:800;letter-spacing:-0.04em;color:${ctx.cssVar('on')};font-variant-numeric:tabular-nums;">` +
      `${ctx.esc(str(props.value, 12))}</div>`
  )

  const col: string[] = []
  col.push(
    `<div data-part="label" style="font-size:${t?.heading?.size ?? 64}px;line-height:1.15;font-weight:700;color:${ctx.cssVar('on')};">` +
      `${ctx.esc(str(props.label, 40))}</div>`
  )
  const context = str(props.context, 100)
  if (context) {
    col.push(
      `<div data-part="context" style="margin-top:20px;font-size:${t?.lead?.size ?? 36}px;line-height:1.35;color:${ctx.cssVar('text-muted')};">` +
        `${ctx.esc(context)}</div>`
    )
  }
  out.push(
    `<div style="position:absolute;left:${g.colX}px;top:0;width:${g.colW}px;height:${g.mainH}px;display:flex;flex-direction:column;justify-content:center;">` +
      `${col.join('')}</div>`
  )

  const stats = statsOf(props)
  if (stats.length) {
    const gap = 32
    const w = (W - gap * (stats.length - 1)) / stats.length
    stats.forEach((s, i) => {
      out.push(
        `<div data-part="stat[${i}]" style="position:absolute;left:${i * (w + gap)}px;top:${g.statsY}px;width:${w}px;height:${g.statsH}px;` +
          `box-sizing:border-box;padding:18px 0 0 28px;border-left:6px solid ${i % 2 ? accent2 : accent};">` +
          `<div data-stat-value style="font-size:${t?.heading?.size ?? 64}px;line-height:1.05;font-weight:800;color:${ctx.cssVar('on')};">${ctx.esc(s.value)}</div>` +
          `<div style="margin-top:8px;font-size:${t?.caption?.size ?? 22}px;line-height:1.4;color:${ctx.cssVar('text-muted')};">${ctx.esc(s.label)}</div>` +
          `</div>`
      )
    })
  }

  return `<div data-stat-spotlight style="position:relative;width:100%;height:100%;font-family:var(--tls-font-family);">${out.join('')}</div>`
}
