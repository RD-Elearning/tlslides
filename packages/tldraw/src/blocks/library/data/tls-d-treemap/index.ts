/**
 * tls.d.treemap — shares of a whole as nested rectangles (spro creative CR13). One level: the
 * items sorted by value and packed into the box with the squarified algorithm (Bruls et al.), area
 * proportional to value; the largest cell takes the accent, the others a tint of it. A cell that is
 * too small for its label keeps its colour and drops the text (the value is still in the title or
 * the notes — never an ellipsis). Parts: `cell[i]`, `cell[i].label`, `cell[i].value`.
 */
import type { BlockDefinition, BlockSchema, CapacityReport, LayoutContext, LayoutNode, MotionRecipe, Size } from '../../../types'
import { asArr, capacityOf, chartColors, clipLines, emptyState, fmtNum, lineH, numOrNull, onColor, root, solidRect, str, style, tintOf } from '../_chart/kit'
import { withNumberMetrics } from '../_table/kit'
import { enumSlot, formatSlot } from '../_chart/schema-kit'
import { ROW_STAGGER } from '../_chart/motion'

export const TREEMAP_MAX_ITEMS = 12

interface Cell {
  label: string
  value: number
}
interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface TreemapProps extends Record<string, unknown> {
  items: Array<{ label: string; value: number }>
  values?: 'share' | 'raw' | 'none'
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

const schema: BlockSchema = {
  items: {
    type: { kind: 'list', of: { kind: 'object', fields: {
      label: { type: { kind: 'text', maxChars: 32 }, required: true, role: 'content', label: 'Name' },
      value: { type: { kind: 'number' }, required: true, role: 'content', label: 'Value' },
    } }, min: 3, max: TREEMAP_MAX_ITEMS },
    role: 'content',
    label: 'Parts',
    required: true,
    guidance: 'The parts of one whole, from the source; positive values only.',
  },
  values: enumSlot(['share', 'raw', 'none'], 'Value labels', 'share: percent of the whole; raw: the value; none.'),
  format: formatSlot(),
}

const defaults: TreemapProps = {
  items: [
    { label: 'Marketing', value: 42 },
    { label: 'Product', value: 27 },
    { label: 'Operations', value: 16 },
    { label: 'Support', value: 9 },
    { label: 'Other', value: 6 },
  ],
  values: 'share',
}

/** Squarified layout of `cells` (sorted desc) in `box`: rects in the same order. */
export function squarify(values: number[], box: Rect): Rect[] {
  const total = values.reduce((a, b) => a + b, 0)
  const out: Rect[] = []
  if (!(total > 0) || box.w <= 0 || box.h <= 0) return values.map(() => ({ x: box.x, y: box.y, w: 0, h: 0 }))
  const scale = (box.w * box.h) / total
  let free = { ...box }
  let row: number[] = []
  const worst = (r: number[], side: number) => {
    const s = r.reduce((a, b) => a + b, 0) * scale
    const max = Math.max(...r) * scale
    const min = Math.min(...r) * scale
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min))
  }
  const place = (r: number[]) => {
    const s = r.reduce((a, b) => a + b, 0) * scale
    if (free.w >= free.h) {
      const w = s / free.h
      let y = free.y
      for (const v of r) {
        const h = (v * scale) / w
        out.push({ x: free.x, y, w, h })
        y += h
      }
      free = { x: free.x + w, y: free.y, w: free.w - w, h: free.h }
    } else {
      const h = s / free.w
      let x = free.x
      for (const v of r) {
        const w = (v * scale) / h
        out.push({ x, y: free.y, w, h })
        x += w
      }
      free = { x: free.x, y: free.y + h, w: free.w, h: free.h - h }
    }
  }
  for (const v of values) {
    const side = Math.min(free.w, free.h)
    if (row.length === 0 || worst([...row, v], side) <= worst(row, side)) row.push(v)
    else {
      place(row)
      row = [v]
    }
  }
  if (row.length) place(row)
  return out
}

function read(props: TreemapProps): Cell[] {
  return asArr<Record<string, unknown>>(props.items)
    .slice(0, TREEMAP_MAX_ITEMS)
    .map((it) => ({ label: str(it?.label), value: numOrNull(it?.value) }))
    .filter((it): it is Cell => it.value !== null && it.value > 0)
    .sort((a, b) => b.value - a.value)
}

function layout(props: TreemapProps, ctx0: LayoutContext): LayoutNode {
  const ctx = withNumberMetrics(ctx0)
  const W = Math.max(1, ctx.box.width)
  const H = Math.max(1, ctx.box.height)
  const cells = read(props)
  if (cells.length === 0) return emptyState(ctx)
  const c = chartColors(ctx)
  const gap = Math.max(3, Math.round(ctx.tokens.space.xs))
  const rects = squarify(cells.map((x) => x.value), { x: 0, y: 0, w: W, h: H })
  const total = cells.reduce((a, x) => a + x.value, 0)
  const mode = props.values === 'raw' || props.values === 'none' ? props.values : 'share'
  const ls = style(ctx, 'body', c.text)
  const vs = style(ctx, 'footnote', c.text)
  const nodes: LayoutNode[] = []
  cells.forEach((cell, i) => {
    const r = rects[i]
    const box = { x: r.x + gap / 2, y: r.y + gap / 2, width: Math.max(0, r.w - gap), height: Math.max(0, r.h - gap) }
    if (box.width < 4 || box.height < 4) return
    const fill = i === 0 ? c.accent : tintOf(c.surface, c.accent, Math.max(0.3, 0.7 - i * 0.08))
    nodes.push(solidRect(box, fill, `cell[${i}]`, Math.min(10, ctx.tokens.radius?.sm ?? 8)))
    const ink = { ...ls, color: onColor(ctx, fill) }
    const pad = ctx.tokens.space.sm
    const tw = box.width - 2 * pad
    if (tw < 40 || box.height < lineH(ls) + 2 * pad) return
    const lm = ctx.measureText(cell.label, ink, tw)
    const lines = clipLines(lm.lines, Math.max(1, Math.min(2, Math.floor((box.height - 2 * pad) / lineH(ls)))))
    if (lm.lines.length > lines.length) return // would be cut with an ellipsis: leave the colour
    nodes.push({ k: 'text', part: `cell[${i}].label`, box: { x: box.x + pad, y: box.y + pad, width: tw, height: lines.length * lineH(ls) }, lines, style: ink })
    if (mode !== 'none') {
      const text = mode === 'raw' ? fmtNum(cell.value, props.format, ctx.tokens.locale) : `${Math.round((cell.value / total) * 100)}%`
      const vh = lineH(vs)
      const vy = box.y + pad + lines.length * lineH(ls)
      if (vy + vh <= box.y + box.height - pad / 2) nodes.push({ k: 'text', part: `cell[${i}].value`, box: { x: box.x + pad, y: vy, width: tw, height: vh }, lines: clipLines(ctx.measureText(text, { ...vs, color: ink.color }, tw).lines, 1), style: { ...vs, color: ink.color } })
    }
  })
  return root(ctx, nodes)
}

function capacity(props: TreemapProps, _box: Size): CapacityReport {
  const used = asArr(props.items).length
  return capacityOf({ items: { max: TREEMAP_MAX_ITEMS, used } }, used <= TREEMAP_MAX_ITEMS, [{ kind: 'truncate', slot: 'items' }])
}

const motion: MotionRecipe = {
  parts: ['cell[*]', 'cell[*].label', 'cell[*].value'],
  preset: 'stagger-lines',
  partMotion: {
    'cell[*]': { preset: 'grow-segments', delay: 0, stagger: ROW_STAGGER / 2 },
    'cell[*].label': { preset: 'sweep-nodes', delay: 120, stagger: ROW_STAGGER / 2 },
    'cell[*].value': { preset: 'count-up', delay: 160, stagger: ROW_STAGGER / 2 },
  },
}

export const tlsDTreemap: BlockDefinition = {
  type: 'tls.d.treemap',
  name: 'Treemap',
  family: 'data',
  tier: 'A',
  summary: 'The parts of one whole as rectangles whose areas are the values.',
  keywords: ['treemap', 'share', 'parts of a whole', 'budget', 'composition', 'proportion'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Parts of a whole as rectangles sized by value',
  related: ['tls.d.donut', 'tls.d.pie', 'tls.d.stacked-bar'],
  describe: {
    when: 'Many parts of one whole (budget lines, market segments) where size is the message.',
    avoid: 'Two or three parts: tls.d.donut. Change over time: tls.d.line.',
    example: { id: 'b_treemap', type: 'tls.d.treemap', props: { items: [{ label: 'Marketing', value: 42 }, { label: 'Product', value: 27 }, { label: 'Support', value: 9 }] } },
  },
  schema,
  defaults,
  size: { preferred: [900, 480], min: [350, 220] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
