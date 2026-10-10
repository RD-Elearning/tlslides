/**
 * AC8 — the designed quote variants of tls.t.quote (`reviews/blocks/ai-curation/README.md` §8):
 * the lead's review found every quote slide "a single line pair in the middle of an empty page".
 *
 * - `big`: the quote in display-size type (the `title` step, autofit down) under a large accent
 *   mark (glyph, or a short bar for `markStyle: rule`), the name in bold and the role muted below.
 * - `card`: the quote on a card (the deck surface's look through `cardPaint`), the mark in the
 *   card's top-left, a hairline, then a name row with an initials disc.
 * - `side`: a heavy accent bar down the left edge of the whole quote (the mark), the quote one step
 *   below `big`, the attribution in small caps-like tracking under it.
 * - `image`: a photo panel on the left (40 % of the width), the quote and name beside it, centred.
 *   Narrower than 720 units, or with no photo, the panel is a tinted block (never an unsafe src).
 *
 * Every variant sizes its text by measuring (largest step that fits the box, then a 5 % autofit
 * like `classic`), so the size cards and the oracle see the real height. Pure: no DOM.
 */

import type { LayoutContext, LayoutNode, Paint, ResolvedTextStyle, RichText } from '../../../types'
import { cardNodes, cardPaint } from '../../composite/_kit'
import { hasImage, imageBacking } from '../../media/_kit'
import { readableOn, tintOf } from '../_engine/color'
import type { QuoteProps } from './schema'
import { scaledGlyphPath } from './layout'

type Variant = 'big' | 'card' | 'side' | 'image'
type Metrics = ReturnType<LayoutContext['measureText']>

/** Type steps per variant, largest first, with the most lines a step may take (a short quote gets
 *  display type, a long one steps down instead of running to eight lines). */
type Step = readonly [token: 'display' | 'title' | 'heading' | 'subheading' | 'lead', maxLines: number]
const STEPS: Record<Variant, readonly Step[]> = {
  big: [['display', 3], ['title', 4], ['heading', 7], ['subheading', 99]],
  card: [['title', 3], ['heading', 5], ['subheading', 99], ['lead', 99]],
  side: [['title', 4], ['heading', 6], ['subheading', 99], ['lead', 99]],
  image: [['title', 3], ['heading', 5], ['subheading', 99], ['lead', 99]],
}
const FLOOR = 0.6

const solidHex = (p: Paint | undefined): string | undefined => (p && p.type === 'solid' && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : undefined)

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

/** The attribution as one rich line: name in bold, role after a thin separator. */
function attributionText(props: QuoteProps): RichText | undefined {
  const name = (props.attribution ?? '').trim()
  const role = (props.role ?? '').trim()
  if (!name && !role) return undefined
  const runs = [] as RichText['runs']
  if (name) runs.push({ text: name, bold: true })
  if (role) runs.push({ text: name ? `  ·  ${role}` : role })
  return { runs }
}

interface Fit {
  style: ResolvedTextStyle
  text: Metrics
}

/** The largest step of `steps` (then 5 % autofit, floor 0.6) whose quote fits `maxH` at width `w`. */
function fitQuote(ctx: LayoutContext, props: QuoteProps, steps: readonly Step[], w: number, maxH: (textH: number, size: number) => boolean, color: string): Fit {
  let last: Fit | undefined
  for (const [step, maxLines] of steps) {
    const base = ctx.resolveText(step, { lineHeight: step === 'display' ? 1.05 : step === 'title' ? 1.12 : 1.25 })
    const style = { ...base, color }
    const text = ctx.measureText(props.text, style, Math.max(1, w))
    last = { style, text }
    if (text.lines.length <= maxLines && maxH(text.height, style.size)) return balance(ctx, props, last, w)
  }
  // below the last step: shrink in 5 % steps, then report what we have so the region can grow
  for (let s = 0.95; s >= FLOOR - 1e-9; s -= 0.05) {
    const style = { ...last!.style, size: last!.style.size * s }
    const text = ctx.measureText(props.text, style, Math.max(1, w))
    last = { style, text }
    if (maxH(text.height, style.size)) return balance(ctx, props, last, w)
  }
  return last!
}

/**
 * Balanced wrap (CSS `text-wrap: balance`): the narrowest width, down to 55 % of `w`, that keeps
 * the line count — so a two-line quote does not end on one orphaned word. The text node keeps the
 * full box width; only the measured lines change, and both renderers draw the lines as given.
 */
function balance(ctx: LayoutContext, props: QuoteProps, fit: Fit, w: number): Fit {
  const n = fit.text.lines.length
  if (n < 2) return fit
  let lo = Math.floor(w * 0.55)
  let hi = Math.floor(w)
  let best = fit.text
  while (hi - lo > 4) {
    const mid = Math.floor((lo + hi) / 2)
    const m = ctx.measureText(props.text, fit.style, mid)
    if (m.lines.length === n) {
      best = m
      hi = mid
    } else lo = mid
  }
  return { style: fit.style, text: best }
}

const rect = (part: string, x: number, y: number, width: number, height: number, color: string, radius?: number): LayoutNode =>
  ({ k: 'rect', part, box: { x, y, width, height }, fill: { type: 'solid', color }, ...(radius ? { radius } : {}) } as LayoutNode)

const textNode = (part: string, x: number, y: number, width: number, m: Metrics, style: ResolvedTextStyle, propPath?: string): LayoutNode => ({
  k: 'text',
  part,
  box: { x, y, width, height: m.height },
  lines: m.lines,
  style,
  ...(propPath ? { propPath } : {}),
})

const group = (W: number, H: number, children: LayoutNode[]): LayoutNode => ({ k: 'group', box: { x: 0, y: 0, width: W, height: H }, part: 'root', children })

export function layoutVariant(variant: Variant, props: QuoteProps, ctx: LayoutContext): LayoutNode {
  if (variant === 'card') return layoutCard(props, ctx)
  if (variant === 'side') return layoutSide(props, ctx)
  if (variant === 'image') return ctx.box.width >= 720 ? layoutImage(props, ctx) : layoutSide(props, ctx)
  return layoutBig(props, ctx)
}

/* ── big ─────────────────────────────────────────────────────────────────────────────── */

function layoutBig(props: QuoteProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width)
  const H = Math.max(0, ctx.box.height)
  const sp = ctx.tokens.space
  const pad = sp.lg
  const cw = Math.max(1, W - 2 * pad)
  const accent = ctx.resolveColor('accent').color
  const textColor = ctx.resolveColor('text').color
  const attrStyle = { ...ctx.resolveText('lead'), color: textColor }
  const attrRich = attributionText(props)
  const attr = attrRich ? ctx.measureText(attrRich, attrStyle, cw) : undefined
  const markH = (size: number) => (props.markStyle === 'glyph' ? Math.min(size * 1.1, 150) * 0.8 : props.markStyle === 'rule' ? 10 : 0)
  const markGap = (size: number) => (props.markStyle === 'none' ? 0 : Math.max(sp.md, Math.round(size * 0.3)))
  const rest = (size: number) => pad * 2 + markH(size) + markGap(size) + (attr ? sp.xl + attr.height : 0)
  const fit = fitQuote(ctx, props, STEPS.big, cw * 0.94, (h, size) => h + rest(size) <= H + 0.5, textColor)
  const size = fit.style.size
  const children: LayoutNode[] = []
  let y = pad
  if (props.markStyle === 'glyph') {
    const g = Math.min(size * 1.1, 150)
    children.push({ k: 'path', part: 'glyph', box: { x: pad, y, width: g, height: g * 0.8 }, d: scaledGlyphPath(g / 100), fill: { type: 'solid', color: accent } } as LayoutNode)
  } else if (props.markStyle === 'rule') {
    children.push(rect('glyph', pad, y, 120, 10, accent, 5))
  }
  y += markH(size) + markGap(size)
  children.push(textNode('text', pad, y, cw * 0.94, fit.text, fit.style, 'text'))
  y += fit.text.height
  if (attr && attrRich) {
    y += sp.xl
    children.push(textNode('attribution', pad, y, cw, attr, attrStyle, 'attribution'))
    y += attr.height
  }
  return group(W, y + pad, children)
}

/* ── card ────────────────────────────────────────────────────────────────────────────── */

function layoutCard(props: QuoteProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width)
  const H = Math.max(0, ctx.box.height)
  const sp = ctx.tokens.space
  const pad = W >= 1200 ? sp['2xl'] : W >= 720 ? sp.xl : sp.lg
  const cw = Math.max(1, W - 2 * pad)
  const accent = ctx.resolveColor('accent').color
  const cp = cardPaint(ctx, { fill: { type: 'solid', color: ctx.resolveColor('surfaceAlt').color } })
  const bg = solidHex(cp.surface)
  const ink = bg ? readableOn(ctx.resolveColor('text').color, bg) : ctx.resolveColor('text').color
  const muted = bg ? readableOn(ctx.resolveColor('textMuted').color, bg) : ctx.resolveColor('textMuted').color
  const line = ctx.resolveColor('line').color
  const nameStyle = { ...ctx.resolveText('lead'), color: ink }
  const roleStyle = { ...ctx.resolveText('body'), color: muted }
  const name = (props.attribution ?? '').trim()
  const role = (props.role ?? '').trim()
  const disc = name ? Math.round(nameStyle.size * 2.2) : 0
  const colW = Math.max(1, cw - (disc ? disc + sp.md : 0))
  const nameM = name ? ctx.measureText({ runs: [{ text: name, bold: true }] }, nameStyle, colW) : undefined
  const roleM = role ? ctx.measureText(role, roleStyle, colW) : undefined
  const rowH = Math.max(disc, (nameM?.height ?? 0) + (roleM?.height ?? 0))
  const glyph = props.markStyle === 'glyph' ? Math.min(96, Math.max(48, cw * 0.06)) : 0
  const markH = props.markStyle === 'glyph' ? glyph * 0.8 + sp.md : props.markStyle === 'rule' ? 8 + sp.lg : 0
  const rest = 2 * pad + markH + (rowH ? sp.xl + 2 + sp.lg + rowH : 0)
  const fit = fitQuote(ctx, props, STEPS.card, cw, (h) => h + rest <= H + 0.5, ink)
  const total = Math.ceil(fit.text.height + rest)
  const children: LayoutNode[] = [...cardNodes(cp, { x: 0, y: 0, width: W, height: total }, ctx.tokens.radius.lg, 'card')]
  let y = pad
  if (props.markStyle === 'glyph') {
    children.push({ k: 'path', part: 'glyph', box: { x: pad, y, width: glyph, height: glyph * 0.8 }, d: scaledGlyphPath(glyph / 100), fill: { type: 'solid', color: accent } } as LayoutNode)
  } else if (props.markStyle === 'rule') {
    children.push(rect('glyph', pad, y, 96, 8, accent, 4))
  }
  y += markH
  children.push(textNode('text', pad, y, cw, fit.text, fit.style, 'text'))
  y += fit.text.height
  if (rowH) {
    y += sp.xl
    children.push(rect('rule', pad, y, cw, 2, line))
    y += 2 + sp.lg
    let x = pad
    if (disc) {
      const tint = bg ? tintOf(bg, accent, 0.22) : accent
      children.push({ k: 'rect', part: 'avatar', box: { x, y: y + (rowH - disc) / 2, width: disc, height: disc }, fill: { type: 'solid', color: tint }, radius: disc / 2 } as LayoutNode)
      const ini = initials(name)
      const iniStyle = { ...ctx.resolveText('body'), size: Math.round(disc * 0.38), color: readableOn(accent, tint, 3) }
      const iniM = ctx.measureText({ runs: [{ text: ini, bold: true }] }, iniStyle, disc)
      children.push(textNode('avatar.initials', x + (disc - (iniM.lines[0]?.width ?? 0)) / 2, y + (rowH - iniM.height) / 2, Math.max(1, iniM.lines[0]?.width ?? 1), iniM, iniStyle))
      x += disc + sp.md
    }
    let ty = y + (rowH - ((nameM?.height ?? 0) + (roleM?.height ?? 0))) / 2
    if (nameM) {
      children.push(textNode('attribution', x, ty, colW, nameM, nameStyle, 'attribution'))
      ty += nameM.height
    }
    if (roleM) children.push(textNode('role', x, ty, colW, roleM, roleStyle, 'role'))
  }
  return group(W, total, children)
}

/* ── side ────────────────────────────────────────────────────────────────────────────── */

function layoutSide(props: QuoteProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width)
  const H = Math.max(0, ctx.box.height)
  const sp = ctx.tokens.space
  const pad = sp.lg
  const bar = W >= 960 ? 20 : 12
  const gap = W >= 960 ? sp['2xl'] : sp.lg
  const x0 = pad + bar + gap
  const cw = Math.max(1, W - x0 - pad)
  const accent = ctx.resolveColor('accent').color
  const textColor = ctx.resolveColor('text').color
  const nameStyle = { ...ctx.resolveText('lead'), color: textColor }
  const roleStyle = { ...ctx.resolveText('body'), color: ctx.resolveColor('textMuted').color }
  const name = (props.attribution ?? '').trim()
  const role = (props.role ?? '').trim()
  const nameM = name ? ctx.measureText({ runs: [{ text: `— ${name}`, bold: true }] }, nameStyle, cw) : undefined
  const roleM = role ? ctx.measureText(role, roleStyle, cw) : undefined
  const attrH = (nameM?.height ?? 0) + (roleM?.height ?? 0)
  const rest = 2 * pad + (attrH ? sp.xl + attrH : 0)
  const fit = fitQuote(ctx, props, STEPS.side, cw, (h) => h + rest <= H + 0.5, textColor)
  const children: LayoutNode[] = []
  let y = pad
  const top = y
  children.push(textNode('text', x0, y, cw, fit.text, fit.style, 'text'))
  y += fit.text.height
  if (attrH) {
    y += sp.xl
    if (nameM) {
      children.push(textNode('attribution', x0, y, cw, nameM, nameStyle, 'attribution'))
      y += nameM.height
    }
    if (roleM) {
      children.push(textNode('role', x0 + (nameM ? Math.round(nameStyle.size * 0.9) : 0), y, Math.max(1, cw - (nameM ? Math.round(nameStyle.size * 0.9) : 0)), roleM, roleStyle, 'role'))
      y += roleM.height
    }
  }
  // the bar spans the whole quote, mark first in the motion order
  children.unshift(rect('glyph', pad, top, bar, Math.max(bar, y - top), accent, bar / 2))
  return group(W, y + pad, children)
}

/* ── image ───────────────────────────────────────────────────────────────────────────── */

function layoutImage(props: QuoteProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(0, ctx.box.width)
  const H = Math.max(0, ctx.box.height)
  const sp = ctx.tokens.space
  const gap = W >= 1200 ? sp['3xl'] : sp.xl
  const iw = Math.round(W * 0.4)
  const cx = iw + gap
  const cw = Math.max(1, W - cx)
  const accent = ctx.resolveColor('accent').color
  const textColor = ctx.resolveColor('text').color
  const nameStyle = { ...ctx.resolveText('lead'), color: textColor }
  const roleStyle = { ...ctx.resolveText('body'), color: ctx.resolveColor('textMuted').color }
  const name = (props.attribution ?? '').trim()
  const role = (props.role ?? '').trim()
  const nameM = name ? ctx.measureText({ runs: [{ text: name, bold: true }] }, nameStyle, cw) : undefined
  const roleM = role ? ctx.measureText(role, roleStyle, cw) : undefined
  const attrH = (nameM?.height ?? 0) + (roleM?.height ?? 0)
  const glyph = props.markStyle === 'glyph' ? Math.min(96, cw * 0.1) : 0
  const markH = props.markStyle === 'glyph' ? glyph * 0.8 + sp.md : props.markStyle === 'rule' ? 8 + sp.lg : 0
  const rest = markH + (attrH ? sp.xl + attrH : 0)
  // the photo is a portrait-ish panel: as tall as 1.1 × its width, within the box
  const ih = Math.max(1, Math.min(H, Math.round(iw * 1.1)))
  const fit = fitQuote(ctx, props, STEPS.image, cw, (h) => h + rest <= ih + 0.5, textColor)
  const stackH = fit.text.height + rest
  const total = Math.ceil(Math.max(ih, stackH))
  const children: LayoutNode[] = []
  const radius = ctx.tokens.radius.lg
  const imgBox = { x: 0, y: 0, width: iw, height: total }
  const src = props.image ?? ''
  const url = hasImage(ctx, src) ? ctx.resolveAsset?.(src) : undefined
  if (url) {
    children.push(...imageBacking(ctx, src, imgBox, 'image.fallback', radius))
    children.push({ k: 'image', part: 'image', box: imgBox, assetId: src, alt: (props.alt ?? '').trim() || (props.attribution ?? ''), fit: 'cover', focal: [0.5, 0.5], radius, url } as LayoutNode)
  } else {
    children.push(rect('image', 0, 0, iw, total, tintOf(ctx.resolveColor('surfaceAlt').color, accent, 0.3), radius))
  }
  let y = Math.round((total - stackH) / 2)
  if (props.markStyle === 'glyph') {
    children.push({ k: 'path', part: 'glyph', box: { x: cx, y, width: glyph, height: glyph * 0.8 }, d: scaledGlyphPath(glyph / 100), fill: { type: 'solid', color: accent } } as LayoutNode)
  } else if (props.markStyle === 'rule') {
    children.push(rect('glyph', cx, y, 96, 8, accent, 4))
  }
  y += markH
  children.push(textNode('text', cx, y, cw, fit.text, fit.style, 'text'))
  y += fit.text.height
  if (attrH) {
    y += sp.xl
    if (nameM) {
      children.push(textNode('attribution', cx, y, cw, nameM, nameStyle, 'attribution'))
      y += nameM.height
    }
    if (roleM) children.push(textNode('role', cx, y, cw, roleM, roleStyle, 'role'))
  }
  return group(W, total, children)
}
