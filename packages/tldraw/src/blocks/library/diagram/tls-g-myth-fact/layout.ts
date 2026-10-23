/**
 * Pure layout for tls.g.myth-fact — 1-4 rows "misconception → fact": the myth in a muted panel
 * with a ✗ stamp, an arrow, the fact in a tinted panel with a ✓ stamp, under two column headings.
 *
 * Rows are as tall as their longer text (myth up to 2 lines, fact up to 3), the spare height shared
 * as gaps; when the rows do not fit, the texts get fewer lines (cut, reported) rather than spill.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { MythFactProps } from './schema'
import { MYTH_MAX } from './schema'
import { arrowHead, asArr, capacityOf, chartColors, emptyState, lineH, linesHeight, objs, placeLines, readableOn, root, solidRect, str, style, tintOf } from '../_kit'
import { iconLeaf } from '../../text/_engine/icon'
import { slotsByIndex } from '../_motion'

export function layout(props: MythFactProps, ctx: LayoutContext): LayoutNode {
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const rows = objs(props.rows)
    .slice(0, MYTH_MAX)
    .map((r) => ({ myth: str(r.myth), fact: str(r.fact) }))
    .filter((r) => r.myth || r.fact)
  const N = rows.length
  if (N < 1) return emptyState(ctx, 'No rows')
  const c = chartColors(ctx)
  const sp = ctx.tokens.space
  const neg = ctx.resolveColor('negative').color
  const pos = ctx.resolveColor('positive').color
  const headS = style(ctx, 'caption', c.muted)
  const mythS = style(ctx, 'body', c.muted)
  const factS = style(ctx, 'body', c.text)

  const arrowW = Math.max(28, Math.min(72, W * 0.06))
  const mythW = (W - arrowW) * 0.44
  const factX = mythW + arrowW
  const factW = W - factX
  const pad = Math.max(8, Math.min(sp.sm, W * 0.016))
  const stamp = Math.max(16, Math.min(40, lineH(factS) * 1.1))
  const textW = (w: number) => Math.max(10, w - 3 * pad - stamp)

  const headH = lineH(headS)
  const mythLabel = str(props.mythLabel) || 'Myth'
  const factLabel = str(props.factLabel) || 'Fact'
  const top = headH + sp['2xs']
  const room = Math.max(0, H - top)

  // row heights: try (2, 3) lines, then (2, 2), then (1, 2), then (1, 1)
  const heights = (ml: number, fl: number) =>
    rows.map((r) => Math.max(stamp, linesHeight(ctx, r.myth, mythS, textW(mythW), ml), linesHeight(ctx, r.fact, factS, textW(factW), fl)) + 2 * pad)
  let lines: [number, number] = [2, 3]
  let need = heights(...lines)
  const minGap = sp['2xs']
  for (const l of [[2, 2], [1, 2], [1, 1]] as Array<[number, number]>) {
    if (need.reduce((a, b) => a + b, 0) + (N - 1) * minGap <= room) break
    lines = l
    need = heights(...l)
  }
  // the rows grow into the room (a panel up to 1.8× its text), the rest is shared as gaps
  const gap0 = N > 1 ? Math.max(minGap, Math.min(sp.sm, room * 0.04)) : 0
  const spare = Math.max(0, room - need.reduce((a, b) => a + b, 0) - (N - 1) * gap0)
  const hs = need.map((h) => Math.min(h * 1.8, h + spare / N))
  const used = hs.reduce((a, b) => a + b, 0)
  const gap = N > 1 ? Math.max(minGap, Math.min(sp.md, (room - used) / (N - 1))) : 0
  const blockH = top + used + (N - 1) * gap
  let y = Math.max(0, (H - blockH) / 2)

  // headings, right above the rows
  const nodes: LayoutNode[] = []
  nodes.push(...placeLines(ctx, mythLabel.toUpperCase(), { ...headS, color: readableOn(neg, c.surface, 4.5) }, { x: pad, y, width: mythW - pad }, 'start', 1, 'head.myth').nodes)
  nodes.push(...placeLines(ctx, factLabel.toUpperCase(), { ...headS, color: readableOn(pos, c.surface, 4.5) }, { x: factX + pad, y, width: factW - pad }, 'start', 1, 'head.fact').nodes)
  y += top
  const r = Math.min(12, pad)

  rows.forEach((row, i) => {
    const h = Math.min(hs[i], Math.max(0, H - y))
    const inner = (contentH: number) => y + Math.max(pad, (h - contentH) / 2)
    const mh = Math.max(stamp, linesHeight(ctx, row.myth, mythS, textW(mythW), lines[0]))
    const fh = Math.max(stamp, linesHeight(ctx, row.fact, factS, textW(factW), lines[1]))
    // myth panel: muted, ✗ stamp
    nodes.push(solidRect({ x: 0, y, width: mythW, height: h }, tintOf(c.surface, c.line, 0.35), `mpanel[${i}]`, r))
    nodes.push({ k: 'rect', part: `mstamp[${i}]`, box: { x: pad, y: inner(mh), width: stamp, height: stamp }, radius: stamp / 2, fill: { type: 'solid', color: tintOf(c.surface, neg, 0.18) } })
    nodes.push(iconLeaf('x', { x: pad + stamp * 0.2, y: inner(mh) + stamp * 0.2, width: stamp * 0.6, height: stamp * 0.6 }, readableOn(neg, tintOf(c.surface, neg, 0.18), 3), `mmark[${i}]`))
    const mt = placeLines(ctx, row.myth, mythS, { x: 2 * pad + stamp, y: inner(mh), width: textW(mythW) }, 'start', lines[0], `mtext[${i}]`)
    nodes.push(...mt.nodes)
    // a line through each line of the myth, as a correction
    const lh = lineH(mythS)
    const tl = mt.nodes[0]
    const mLines = tl && tl.k === 'text' ? tl.lines : []
    mLines.forEach((ln, k) => {
      const lw = Math.min(ln.width, textW(mythW))
      if (lw > 0) nodes.push(solidRect({ x: 2 * pad + stamp, y: inner(mh) + k * lh + lh * 0.55, width: lw, height: Math.max(1.5, lh * 0.05) }, tintOf(c.surface, neg, 0.6), `mstrike[${i}]${k ? `.${k}` : ''}`))
    })
    // arrow
    const ay = y + h / 2
    const ax0 = mythW + arrowW * 0.18
    const ax1 = mythW + arrowW * 0.82
    nodes.push(solidRect({ x: ax0, y: ay - 1.5, width: Math.max(1, ax1 - ax0 - 8), height: 3 }, c.muted, `arrow[${i}]`))
    nodes.push(arrowHead(ctx, { x: ax1, y: ay }, 1, 0, 12, c.muted, `arrowhead[${i}]`))
    // fact panel: tinted, ✓ stamp
    const factFill = tintOf(c.surface, pos, 0.12)
    nodes.push(solidRect({ x: factX, y, width: factW, height: h }, factFill, `fpanel[${i}]`, r))
    nodes.push({ k: 'rect', part: `fstamp[${i}]`, box: { x: factX + pad, y: inner(fh), width: stamp, height: stamp }, radius: stamp / 2, fill: { type: 'solid', color: pos } })
    nodes.push(iconLeaf('check', { x: factX + pad + stamp * 0.2, y: inner(fh) + stamp * 0.2, width: stamp * 0.6, height: stamp * 0.6 }, readableOn('#ffffff', pos, 3), `fmark[${i}]`))
    nodes.push(...placeLines(ctx, row.fact, { ...factS, color: readableOn(c.text, factFill, 4.5) }, { x: factX + 2 * pad + stamp, y: inner(fh), width: textW(factW) }, 'start', lines[1], `ftext[${i}]`).nodes)
    y += h + gap
  })

  return root(
    ctx,
    slotsByIndex(nodes, N, { width: W, height: H }, [
      { name: 'myth', match: /^m(?:panel|stamp|mark|text|strike)\[(\d+)\](?:\.\d+)?$/ },
      { name: 'link', match: /^arrow(?:head)?\[(\d+)\]$/ },
      { name: 'fact', match: /^f(?:panel|text)\[(\d+)\](?:\.\d+)?$/ },
      { name: 'stamp', match: /^f(?:stamp|mark)\[(\d+)\]$/, tight: true },
    ])
  )
}

export function capacity(props: MythFactProps, box: Size, ctx: LayoutContext): CapacityReport {
  void box
  void ctx
  return capacityOf({ rows: { max: MYTH_MAX, used: asArr(props.rows).length } }, true, [
    { kind: 'truncate', slot: 'rows' },
    { kind: 'paginate' },
  ])
}
