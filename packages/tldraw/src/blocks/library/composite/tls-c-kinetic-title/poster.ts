/**
 * Poster for tls.c.kinetic-title: the settled frame (every word in place, rule drawn), used for
 * SVG export, thumbnails and the compiler's height measurement. Same parts as the template.
 */

import type { LayoutContext, LayoutNode, RichText } from '../../../types'
import { alignText } from '../_kit'
import { backdrop, centerLines, color, safe, str } from '../_showcase'
import { tryHexToRgb } from '../../../color-math'
import type { KineticTitleProps } from './schema'
import { orbs, titleSize, titleWords } from './schema'

function alpha(hex: string, a: number): string {
  const rgb = tryHexToRgb(hex)
  return rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${a})` : hex
}

export function poster(props: KineticTitleProps, ctx: LayoutContext): LayoutNode {
  const W = safe(ctx.box.width)
  const H = safe(ctx.box.height)
  const align = props.align === 'start' ? 'start' : 'center'
  const accent = color(ctx, 'accent')
  const accent2 = color(ctx, 'accent2')

  const decor: LayoutNode[] = []
  if (props.decoration !== 'none' && W > 0 && H > 0) {
    for (const o of orbs(W, H)) {
      const box = { x: o.cx - o.r, y: o.cy - o.r, width: o.r * 2, height: o.r * 2 }
      if (o.kind === 'ring') {
        decor.push({ k: 'rect', box, radius: o.r, fill: { type: 'solid', color: 'rgba(0,0,0,0)' }, stroke: { color: alpha(accent, 0.26), width: Math.max(2, o.r * 0.06) } })
      } else if (o.kind === 'disc') {
        decor.push({ k: 'rect', box, radius: o.r, fill: { type: 'solid', color: alpha(accent2, 0.2) } })
      } else {
        decor.push({ k: 'rect', box, radius: o.r, fill: { type: 'solid', color: accent } })
      }
    }
  }

  // Text column: 84% of the width (70% for the subtitle), centred or left.
  const colW = Math.max(1, W * 0.84)
  const subW = Math.max(1, W * 0.7)
  const colX = align === 'center' ? (W - colW) / 2 : 0
  const subX = align === 'center' ? (W - subW) / 2 : 0

  const pieces: Array<{ nodes: LayoutNode[]; height: number; gapAfter: number }> = []

  const kicker = str(props.kicker, 40)
  if (kicker) {
    const style = { ...ctx.resolveText('caption', { letterSpacing: 0.16 }), color: accent }
    const m = ctx.measureText({ runs: [{ text: kicker.toUpperCase(), bold: true }] }, style, colW)
    pieces.push({ nodes: [{ k: 'text', part: 'kicker', box: { x: colX, y: 0, width: colW, height: m.height }, lines: m.lines, style }], height: m.height, gapAfter: 28 })
  }

  const title = str(props.title, 80)
  const size = titleSize(title, ctx.tokens)
  const tStyle = { ...ctx.resolveText('display', { letterSpacing: -0.03 }), size, lineHeight: 1.08, color: color(ctx, 'text') }
  const rich: RichText = { runs: titleWords(props).map((w, i, arr) => ({ text: w.text + (i < arr.length - 1 ? ' ' : ''), bold: true })) }
  const mt = ctx.measureText(rich, tStyle, colW)
  pieces.push({ nodes: [{ k: 'text', part: 'title', box: { x: colX, y: 0, width: colW, height: mt.height }, lines: mt.lines, style: tStyle }], height: mt.height, gapAfter: 36 })

  const ruleW = Math.min(180, W)
  pieces.push({
    nodes: [{
      k: 'rect',
      part: 'rule',
      box: { x: align === 'center' ? (W - ruleW) / 2 : 0, y: 0, width: ruleW, height: 10 },
      radius: 5,
      fill: { type: 'linearGradient', angle: 90, stops: [{ color: accent, at: 0 }, { color: accent2, at: 1 }] },
    }],
    height: 10,
    gapAfter: 32,
  })

  const subtitle = str(props.subtitle, 120)
  if (subtitle) {
    const style = { ...ctx.resolveText('lead'), color: color(ctx, 'textMuted') }
    const m = ctx.measureText(subtitle, style, subW)
    pieces.push({ nodes: [{ k: 'text', part: 'subtitle', box: { x: subX, y: 0, width: subW, height: m.height }, lines: m.lines, style }], height: m.height, gapAfter: 0 })
  }

  const content = pieces.reduce((s, p, i) => s + p.height + (i < pieces.length - 1 ? p.gapAfter : 0), 0)
  const height = Math.max(H, content)
  let y = Math.max(0, (height - content) / 2)
  const textNodes: LayoutNode[] = []
  pieces.forEach((p, i) => {
    for (const n of p.nodes) textNodes.push({ ...n, box: { ...n.box, y: n.box.y + y } } as LayoutNode)
    y += p.height + (i < pieces.length - 1 ? p.gapAfter : 0)
  })

  return {
    k: 'group',
    part: 'root',
    box: { x: 0, y: 0, width: W, height },
    children: [
      backdrop(W, height),
      ...(decor.length ? [{ k: 'group', part: 'decor', box: { x: 0, y: 0, width: W, height }, children: decor } as LayoutNode] : []),
      ...textNodes.flatMap((n) => (n.k === 'text' && n.part === 'title' ? (align === 'center' ? centerLines(n, true) : [n]) : alignText([n], align))),
    ],
  }
}
