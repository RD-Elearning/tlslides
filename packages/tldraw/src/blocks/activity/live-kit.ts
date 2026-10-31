/**
 * L03 — markup and CSS shared by the activity templates (viewer-only DOM over the poster boxes) and
 * a few DOM helpers for `interact()`. All user text goes through `esc`. Colours are resolved tokens.
 */

import type { ActivityLabels, Box, HtmlTemplateContext, LayoutNode } from '../types'
import { contrastRatio } from '../color-math'
import { lumOf } from '../library/text/_engine/color'
import { partBox } from './poster-parts'

export const px = (n: number) => `${Math.round(n * 100) / 100}px`
export const at = (b: Box) => `left:${px(b.x)};top:${px(b.y)};width:${px(b.width)};height:${px(b.height)};`

export function plain(v: unknown): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && Array.isArray((v as { runs?: unknown }).runs)) return (v as { runs: Array<{ text: string }> }).runs.map((r) => r.text).join('')
  return ''
}

/** Bottom edge of the poster's content (cells, chips, area): where the footer starts. */
export function footerTop(poster: LayoutNode | undefined, gap: number): number {
  if (!poster || poster.k !== 'group') return 0
  let b = 0
  for (const n of poster.children) if (n.part !== 'footer') b = Math.max(b, n.box.y + n.box.height)
  return b + gap * 1.5
}

export function css(kind: string, ctx: HtmlTemplateContext, footH: number): string {
  const { tokens, box } = ctx
  const c = tokens.color
  const body = tokens.type.body
  const sub = tokens.type.subheading
  const on = contrastRatio(lumOf(c.surface), lumOf(c.accent)) >= contrastRatio(lumOf(c.text), lumOf(c.accent)) ? c.surface : c.text
  const R = `[data-activity="${kind}"]`
  return (
    `${R}{position:relative;width:${px(box.width)};height:${px(box.height)};font-family:var(--tls-font-body,var(--tls-font-family));color:var(--tls-on)}` +
    `${R} button{font:inherit;color:inherit;cursor:pointer;text-align:left}` +
    `${R} .tlsa-q{position:absolute;font-family:var(--tls-font-heading,var(--tls-font-family));font-weight:700;font-size:${px(sub.size)};line-height:${sub.lineHeight}}` +
    `${R} .tlsa-cell{position:absolute;box-sizing:border-box;display:flex;align-items:center;gap:${px(tokens.space.md)};padding:0 ${px(tokens.space.lg)};border:3px solid transparent;border-radius:${px(tokens.radius.lg)};background:${c.surfaceAlt};font-size:${px(body.size)};line-height:${body.lineHeight}}` +
    `${R} .tlsa-cell:focus-visible,${R} .tlsa-btn:focus-visible{outline:4px solid ${c.accent};outline-offset:2px}` +
    // a chosen answer must LOOK chosen before it is checked: the ✓/✗ buttons already carry an accent border,
    // so the border alone showed nothing (spro deck a51aeac7 s10) — fill the button, tint the option row
    `${R} [aria-pressed="true"]{border-color:${c.accent}}` +
    `${R} .tlsa-cell[aria-pressed="true"]{background:color-mix(in srgb,${c.accent} 18%,${c.surfaceAlt})}` +
    `${R} .tlsa-btn[aria-pressed="true"]{background:${c.accent};color:${on}}` +
    `${R} .tlsa-t{flex:1;min-width:0}` +
    // buttons inside a row (✓/✗) fill the row's height: on a phone the slide is scaled to ~0.2, a 20px-padded glyph is not tappable
    `${R} .tlsa-cell .tlsa-btn{align-self:stretch;margin:${px(tokens.space.sm)} 0;min-width:${px(sub.size * 2)};padding:0;text-align:center;font-size:${px(sub.size)};font-weight:700}` +
    `${R} .tlsa-mark{flex:none;min-width:36px;text-align:center;font-weight:700;font-size:${px(sub.size)}}` +
    `${R} [data-state="correct"]{border-color:${c.positive};background:color-mix(in srgb,${c.positive} 16%,${c.surface})}` +
    `${R} [data-state="correct"] .tlsa-mark::before{content:"✓";color:${c.positive}}` +
    `${R} [data-state="missed"]{border-color:${c.positive};border-style:dashed}` +
    `${R} [data-state="missed"] .tlsa-mark::before{content:"✓";color:${c.positive}}` +
    `${R} [data-state="wrong"]{border-color:${c.negative};background:color-mix(in srgb,${c.negative} 14%,${c.surface})}` +
    `${R} [data-state="wrong"] .tlsa-mark::before{content:"✗";color:${c.negative}}` +
    `${R} .tlsa-foot{position:absolute;left:0;width:100%;height:${px(footH)};display:flex;align-items:center;gap:${px(tokens.space.md)};font-size:${px(body.size * 0.9)}}` +
    `${R} .tlsa-fb{flex:1;min-width:0;font-weight:700}${R} .tlsa-fb[data-ok="true"]{color:${c.positive}}${R} .tlsa-fb[data-ok="false"]{color:${c.negative}}` +
    `${R} .tlsa-btn{border:2px solid ${c.accent};border-radius:${px(tokens.radius.md)};background:transparent;padding:8px 20px;font-weight:700}` +
    `${R} .tlsa-btn.primary{background:${c.accent};color:${on}}${R} .tlsa-btn:disabled{opacity:.45;cursor:default}` +
    `${R} [hidden]{display:none!important}` +
    `${R} .tlsa-expl{position:absolute;left:0;width:100%;font-size:${px(body.size * 0.9)};line-height:${body.lineHeight};color:var(--tls-text-muted)}`
  )
}

export function questionHtml(ctx: HtmlTemplateContext, prompt: unknown): string {
  const q = partBox(ctx.poster, 'question')
  return `<div class="tlsa-q" data-part="question" style="${q ? at(q) : 'left:0;top:0;width:100%;'}">${ctx.esc(plain(prompt))}</div>`
}

export function footerHtml(top: number, opts: { check?: boolean; show?: boolean } = { check: true, show: true }): string {
  return (
    `<div class="tlsa-foot" style="top:${px(top)}"><div class="tlsa-fb" data-part="feedback" role="status" aria-live="polite"></div>` +
    (opts.check === false ? '' : `<button type="button" class="tlsa-btn primary" data-act="check" hidden disabled></button>`) +
    (opts.show === false ? '' : `<button type="button" class="tlsa-btn" data-act="show" hidden></button>`) +
    `<button type="button" class="tlsa-btn" data-act="retry" hidden></button></div>`
  )
}

export function explHtml(ctx: HtmlTemplateContext, text: unknown, top: number): string {
  return text ? `<div class="tlsa-expl" data-part="explanation" style="top:${px(top)}" hidden>${ctx.esc(String(text))}</div>` : ''
}

export interface Parts {
  check: HTMLButtonElement | null
  show: HTMLButtonElement | null
  retry: HTMLButtonElement | null
  fb: HTMLElement | null
  expl: HTMLElement | null
}

export function footerParts(root: HTMLElement, L: ActivityLabels): Parts {
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)
  const p: Parts = { check: q('[data-act="check"]'), show: q('[data-act="show"]'), retry: q('[data-act="retry"]'), fb: q('[data-part="feedback"]'), expl: q('[data-part="explanation"]') }
  if (p.check) p.check.textContent = L.check
  if (p.show) p.show.textContent = L.showAnswer
  if (p.retry) p.retry.textContent = L.retry
  return p
}

/** Unique non-empty strings after trim/case-fold. */
export const distinct = (xs: readonly unknown[]): boolean => new Set(xs.map((x) => String(x).trim().toLowerCase())).size === xs.length
