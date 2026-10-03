/**
 * Pure layout for tls.t.kv-list — key and value pairs in two aligned columns.
 *
 * Column widths come from the table engine's `solveColumns` (key keeps its content width up to a
 * share, the value column takes the rest and wraps). `Stroke` has no dash, so the `dots` leader is
 * a run of middle-dot glyphs set as text between the key and the value; `rule` is a hairline rect
 * under each row. One or two balanced groups of rows.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, ResolvedTextStyle, Size } from '../../../types'
import type { KvListProps } from './schema'
import { KV_MAX_ITEMS } from './schema'
import { solveColumns } from '../../../layout/table'
import { placeText } from '../_engine/text-place'
import { splitCounts, markerCapacity } from '../_engine/marker-rows'
import { asArray, spacingGap, str } from '../_engine/rich'

const LEADER_GLYPH = '·'

function pair(item: unknown): { key: string; value: string } {
  const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
  return { key: str(o.key), value: str(o.value) }
}

function compute(props: KvListProps, ctx: LayoutContext, width: number) {
  const items = asArray<unknown>(props.items).map(pair)
  const columns: 1 | 2 = String(props.columns) === '2' && items.length > 1 ? 2 : 1
  const leader = props.leader === 'dots' || props.leader === 'rule' ? props.leader : 'none'
  const valueAlign = props.valueAlign === 'start' ? 'start' : 'end'
  const sp = ctx.tokens.space
  const body = ctx.resolveText('body')
  const keyStyle: ResolvedTextStyle = { ...body, color: ctx.resolveColor(props.keyTone === 'text' ? 'text' : 'textMuted').color }
  const valStyle: ResolvedTextStyle = { ...body, color: ctx.resolveColor('text').color }
  const lineColor = ctx.resolveColor('line').color
  const lineH = body.size * body.lineHeight
  const rowGap = leader === 'rule' ? sp.xs : sp.sm
  const colGap = sp.lg
  const gw = columns === 2 ? Math.max(1, (width - colGap) / 2) : Math.max(1, width)
  const inner = sp.md

  const keyMax = Math.max(0, ...items.map((p) => ctx.measureText(p.key, keyStyle).width))
  const valMax = Math.max(0, ...items.map((p) => ctx.measureText(p.value, valStyle).width))
  const [kw] = solveColumns(
    [{ min: gw * 0.2, weight: 0 }, { min: gw * 0.25, weight: 1 }],
    Math.max(1, gw - inner),
    [keyMax, valMax]
  )
  const keyW = Math.max(1, Math.round(kw))
  const valX = keyW + inner
  const valW = Math.max(1, gw - valX)

  const nodes: LayoutNode[] = []
  const counts = splitCounts(items.length, columns)
  let index = 0
  let lines = 0
  const heights: number[] = []
  for (let c = 0; c < counts.length; c++) {
    const x0 = c * (gw + colGap)
    let y = 0
    for (let k = 0; k < counts[c]; k++, index++) {
      const i = index
      const p = items[i]
      const km = placeText(ctx, p.key, keyStyle, { x: x0, y, width: keyW }, 'start', { part: `key[${i}]`, propPath: `items.${i}.key` })
      const vm = placeText(ctx, p.value, valStyle, { x: x0 + valX, y, width: valW }, valueAlign, {
        part: `value[${i}]`,
        linePart: (j) => (j === 0 ? `value[${i}]` : `value[${i}].l${j}`),
        propPath: `items.${i}.value`,
      })
      lines += km.lineCount + vm.lineCount
      // A one-line key's box hugs its text so the leader can start right after it.
      const keyNode = km.nodes[0]
      if (km.lineCount === 1 && keyNode.k === 'text') keyNode.box = { ...keyNode.box, width: Math.min(keyW, km.lines[0].width + 1) }
      const rowH = Math.max(km.height, vm.height)

      if (leader === 'dots') {
        const keyEnd = x0 + Math.min(keyW, km.lines[km.lines.length - 1]?.width ?? 0)
        const firstValX = vm.lines[0] ? vm.lines[0].x : x0 + valX
        const start = km.lineCount > 1 ? x0 + keyW : keyEnd
        const dotW = Math.max(1, ctx.measureText(LEADER_GLYPH, keyStyle).width)
        const room = firstValX - start - sp.xs * 2
        const count = Math.floor(room / (dotW * 1.6))
        if (count >= 3 && vm.lineCount === 1) {
          const text = Array.from({ length: count }, () => LEADER_GLYPH).join(' ')
          const lm = ctx.measureText(text, { ...keyStyle, color: lineColor }, undefined)
          const w = Math.min(room, lm.width)
          nodes.push({
            k: 'text',
            part: `leader[${i}]`,
            box: { x: start + sp.xs, y, width: w + 1, height: lm.height },
            lines: lm.lines,
            style: { ...keyStyle, color: lineColor },
          })
        }
      }
      nodes.push(...km.nodes, ...vm.nodes)
      if (leader === 'rule') {
        nodes.push({
          k: 'rect',
          part: `rule[${i}]`,
          box: { x: x0, y: y + rowH + rowGap / 2 - 0.5, width: gw, height: 1 },
          fill: { type: 'solid', color: lineColor },
        })
      }
      y += rowH + rowGap
    }
    heights.push(Math.max(0, y - rowGap))
  }
  const height = Math.max(0, ...heights)
  return { nodes, height, lines, items, columns, lineH }
}

export function layout(props: KvListProps, ctx: LayoutContext): LayoutNode {
  const width = Math.max(1, ctx.box.width)
  const r = compute(props, ctx, width)
  return { k: 'group', part: 'root', box: { x: 0, y: 0, width, height: r.height }, children: r.nodes }
}

export function capacity(props: KvListProps, box: Size, ctx: LayoutContext): CapacityReport {
  const r = compute(props, ctx, Math.max(1, box.width))
  return markerCapacity({
    rows: { nodes: [], height: r.height, lineCount: r.lines, columnHeights: [r.height] },
    itemCount: r.items.length,
    maxItems: KV_MAX_ITEMS,
    columns: r.columns,
    box,
    gap: spacingGap(ctx, 'default'),
    lineHeight: r.lineH,
  })
}
