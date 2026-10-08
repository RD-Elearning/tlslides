/**
 * Pure layout for tls.t.qa — question and answer pairs.
 *
 * Each pair is a question row (bold) over an answer row, both with a badge column when `marker` is
 * `qa` ("Q"/"A" circles) or `numbered` (number on the question only). All answers are laid out
 * together; per-answer reveal steps are not available (see schema.ts).
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, ResolvedTextStyle, Size } from '../../../types'
import type { QaProps } from './schema'
import { QA_MAX_ITEMS } from './schema'
import { asArray, str, toMeasurable } from '../_engine/rich'
import { onColor, readableOn } from '../_engine/color'

function compute(props: QaProps, ctx: LayoutContext, width: number) {
  const items = asArray<unknown>(props.items).map((it) => {
    const o = it && typeof it === 'object' ? (it as Record<string, unknown>) : {}
    return { q: str(o.q), a: o.a }
  })
  const marker = props.marker === 'numbered' || props.marker === 'none' ? props.marker : 'qa'
  const sp = ctx.tokens.space
  const body = ctx.resolveText('body')
  const text = ctx.resolveColor('text').color
  const accent = ctx.resolveColor('accent').color
  const alt = ctx.resolveColor('surfaceAlt').color
  const qStyle: ResolvedTextStyle = { ...body, color: text }
  const aStyle: ResolvedTextStyle = { ...body, color: text }
  const badge = Math.round(body.size * 1.5)
  const badgeStyle: ResolvedTextStyle = { ...body, size: Math.round(body.size * 0.8), lineHeight: 1.2 }
  const col = marker === 'none' ? 0 : badge + sp.sm
  const textW = Math.max(1, width - col)
  const firstLine = body.size * body.lineHeight
  const off = Math.max(0, (badge - firstLine) / 2)

  const nodes: LayoutNode[] = []
  const badgeAt = (part: string, label: string, y: number, fill: string, ink: string) => {
    const bm = ctx.measureText({ runs: [{ text: label, bold: true }] }, { ...badgeStyle, color: ink })
    const w = Math.min(badge, bm.width)
    nodes.push({ k: 'rect', part: `${part}.badge`, box: { x: 0, y, width: badge, height: badge }, fill: { type: 'solid', color: fill }, radius: badge / 2 })
    nodes.push({
      k: 'text',
      part,
      box: { x: (badge - w) / 2, y: y + (badge - bm.height) / 2, width: w + 1, height: bm.height },
      lines: bm.lines,
      style: { ...badgeStyle, color: ink },
    })
  }

  let y = 0
  let lines = 0
  items.forEach((it, i) => {
    const qm = ctx.measureText({ runs: [{ text: it.q, bold: true }] }, qStyle, textW)
    if (marker !== 'none') {
      badgeAt(`qmark[${i}]`, marker === 'numbered' ? String(i + 1) : 'Q', y, accent, onColor(ctx, accent))
    }
    nodes.push({ k: 'text', part: `q[${i}]`, box: { x: col, y: y + (marker === 'none' ? 0 : off), width: textW, height: qm.height }, lines: qm.lines, style: qStyle, propPath: `items.${i}.q` })
    const qH = Math.max(marker === 'none' ? 0 : badge, qm.height + (marker === 'none' ? 0 : off))
    y += qH + sp['2xs']

    const am = ctx.measureText(toMeasurable(it.a), aStyle, textW)
    if (marker === 'qa') badgeAt(`amark[${i}]`, 'A', y, alt, readableOn(accent, alt))
    nodes.push({ k: 'text', part: `a[${i}]`, box: { x: col, y: y + (marker === 'qa' ? off : 0), width: textW, height: am.height }, lines: am.lines, style: aStyle, propPath: `items.${i}.a` })
    const aH = Math.max(marker === 'qa' ? badge : 0, am.height + (marker === 'qa' ? off : 0))
    y += aH + sp.md
    lines += qm.lines.length + am.lines.length
  })
  return { nodes, height: Math.max(0, y - sp.md), count: items.length, lines, lineH: firstLine }
}

export function layout(props: QaProps, ctx: LayoutContext): LayoutNode {
  const width = Math.max(1, ctx.box.width)
  const r = compute(props, ctx, width)
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width, height: r.height }, children: r.nodes }
}

export function capacity(props: QaProps, box: Size, ctx: LayoutContext): CapacityReport {
  const r = compute(props, ctx, Math.max(1, box.width))
  const fits = r.height <= box.height + 0.5 && r.count <= QA_MAX_ITEMS
  return {
    fits,
    budget: {
      items: { max: QA_MAX_ITEMS, used: r.count, unit: 'items' },
      lines: { max: Math.max(1, Math.floor(box.height / r.lineH)), used: r.lines, unit: 'lines' },
    },
    remedy: fits ? [] : [{ kind: 'truncate', slot: 'items' }],
  }
}
