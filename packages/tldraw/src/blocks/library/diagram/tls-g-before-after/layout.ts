/**
 * Pure layout for tls.g.before-after — two equal panels with an arrow in the gap between them.
 *
 * Each panel stacks (top to bottom) an optional image, a small tag, a title and a text, clipped to
 * what fits. The After panel carries the accent (stroke and tint) when `emphasis: after`. Panels,
 * the arrow and their contents are three groups at the block origin with absolute children, which
 * keeps the DOM and SVG renderers in agreement.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { Box, CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { chevronPath } from '../../../layout/diagram'
import type { BeforeAfterProps } from './schema'
import { chartColors, clamp, emptyState, enumOf, linesHeight, lineH, mutedStyle, objs, pathNode, placeLines, root, str, style, tintOf } from '../_kit'

const PAD = 24

export function layout(props: BeforeAfterProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const b = objs([props.before])[0]
  const a = objs([props.after])[0]
  if (!b && !a) return emptyState(ctx, 'Add a before and an after')
  const c = chartColors(ctx)
  const arrow = enumOf(props.arrow, ['arrow', 'chevron', 'none'] as const, 'arrow')
  const emphasis = enumOf(props.emphasis, ['after', 'none'] as const, 'after') === 'after'
  const tagS = mutedStyle(ctx, 'footnote')
  const titleS = style(ctx, 'subheading', c.text)
  const textS = style(ctx, 'caption', c.text)

  const gap = arrow === 'none' ? 32 : clamp(W * 0.1, 64, 130)
  const pw = Math.max(20, (W - gap) / 2)
  const panelBox = (i: 0 | 1): Box => ({ x: i * (pw + gap), y: 0, width: pw, height: H })

  const nodes: LayoutNode[] = []
  const group = (part: string, children: LayoutNode[]): LayoutNode => ({ k: 'group', part, box: { x: 0, y: 0, width: W, height: H }, children })

  const drawPanel = (i: 0 | 1, p: Record<string, unknown> | undefined, name: 'before' | 'after') => {
    const box = panelBox(i)
    const accent = name === 'after' && emphasis
    const out: LayoutNode[] = []
    out.push({
      k: 'rect',
      part: `${name}[card]`,
      box,
      fill: { type: 'solid', color: accent ? tintOf(c.surface, c.accent, 0.14) : tintOf(c.surface, c.line, 0.35) },
      stroke: { color: accent ? c.accent : c.line, width: accent ? 3 : 2 },
      radius: 18,
    })
    const pad = clamp(Math.min(pw, H) * 0.06, 12, PAD)
    const iw = Math.max(10, pw - 2 * pad)
    let y = box.y + pad
    const bottom = box.y + H - pad
    const src = str(p?.image)
    if (src) {
      const ih = clamp(H * 0.42, 40, 340)
      const url = ctx.resolveAsset?.(src)
      out.push({
        k: 'image',
        part: `${name}[image]`,
        box: { x: box.x + pad, y, width: iw, height: Math.min(ih, Math.max(20, bottom - y)) },
        assetId: src,
        alt: str(p?.title),
        fit: 'cover',
        radius: 12,
        ...(url ? { url } : {}),
      })
      y += Math.min(ih, Math.max(20, bottom - y)) + 12
    }
    const tag = str(p?.label).trim()
    if (tag && bottom - y >= lineH(tagS)) {
      const t = placeLines(ctx, tag.toUpperCase(), { ...tagS, color: accent ? c.accent : c.muted }, { x: box.x + pad, y, width: iw }, 'start', 1, `${name}[tag]`)
      out.push(...t.nodes)
      y += t.height + 6
    }
    const title = str(p?.title)
    if (title && bottom - y >= lineH(titleS)) {
      const tl = clamp(Math.floor((bottom - y) / lineH(titleS)), 1, 2)
      const t = placeLines(ctx, title, titleS, { x: box.x + pad, y, width: iw }, 'start', tl, `${name}[title]`)
      out.push(...t.nodes)
      y += t.height + 8
    }
    const text = str(p?.text)
    if (text && bottom - y >= lineH(textS)) {
      const nl = Math.floor((bottom - y) / lineH(textS))
      out.push(...placeLines(ctx, text, { ...textS, color: c.text }, { x: box.x + pad, y, width: iw }, 'start', nl, `${name}[text]`).nodes)
    }
    nodes.push(group(name, out))
  }
  drawPanel(0, b, 'before')
  drawPanel(1, a, 'after')

  if (arrow !== 'none') {
    const aw = Math.min(gap - 24, 90)
    const ah = Math.min(aw * 0.8, 70)
    const x0 = pw + (gap - aw) / 2
    const y0 = H / 2 - ah / 2
    const f = (v: number) => String(Math.round(v * 100) / 100)
    let d: string
    if (arrow === 'chevron') {
      d = chevronPath({ x: x0, y: y0, width: aw, height: ah }, ah * 0.4, true, false)
    } else {
      const sh = ah * 0.34
      const hx = x0 + aw * 0.55
      d = `M${f(x0)} ${f(H / 2 - sh / 2)}L${f(hx)} ${f(H / 2 - sh / 2)}L${f(hx)} ${f(y0)}L${f(x0 + aw)} ${f(H / 2)}L${f(hx)} ${f(y0 + ah)}L${f(hx)} ${f(H / 2 + sh / 2)}L${f(x0)} ${f(H / 2 + sh / 2)}Z`
    }
    nodes.push(group('arrow', [pathNode(ctx, d, 'arrow[shape]', { fill: c.accent })]))
  }
  return root(ctx, nodes)
}

export function capacity(props: BeforeAfterProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  const len = (o: unknown, k: string) => str((o as Record<string, unknown> | undefined)?.[k]).length
  const used = Math.max(len(props.before, 'text'), len(props.after, 'text'))
  const fits = used <= 200
  return {
    fits,
    budget: { text: { max: 200, used, unit: 'chars' } },
    remedy: fits ? [] : [{ kind: 'truncate', slot: 'before' }, { kind: 'paginate' }],
  }
}
