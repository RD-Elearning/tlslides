/**
 * Table engine (P0.7): a column solver plus a cell-measuring table layout, shared by d.table,
 * d.compare-table, d.scorecard, d.ranking, d.pricing and t.kv-list.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`. Never throws.
 * Text is measured with `ctx.measureText`, the only measurement primitive, so the DOM and SVG
 * renderers agree.
 */

import type { Box, ColorRole, LayoutContext, LayoutNode, ResolvedTextStyle } from '../types'
import { getIcon } from '../icons'
import { formatValue, type ValueFormat } from '../library/data/_engine/format-value'

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Column solver                                                                    */
/* ─────────────────────────────────────────────────────────────────────────────── */

export type CellAlign = 'start' | 'center' | 'end'

export interface ColumnSpec {
  /** Minimum width (the narrowest the column may wrap down to). Default 0. */
  min?: number
  /** Share of leftover space. Default 0 (a column keeps its content width). */
  weight?: number
  align?: CellAlign
}

/**
 * Solve column widths so they sum to `width`.
 *
 * 1. Every column starts at its `min`. If even the minimums overflow, they shrink proportionally.
 * 2. Each column wants `max(min, measuredMaxContent)` (its widest unwrapped cell).
 * 3. Content fits: leftover space is shared by `weight` (equally across all columns when no
 *    column has a weight), so the widths always fill `width`.
 * 4. Content overflows: only the part above each column's `min` shrinks, proportionally, so
 *    long text wraps while short columns stay intact.
 */
export function solveColumns(cols: ReadonlyArray<ColumnSpec>, width: number, measuredMaxContent: ReadonlyArray<number>): number[] {
  const n = cols.length
  if (n === 0) return []
  const total = Math.max(0, width)
  const mins = cols.map((c) => Math.max(0, c.min ?? 0))
  const minSum = mins.reduce((a, b) => a + b, 0)
  if (minSum >= total) {
    // Nothing left to distribute. Scale the minimums down to fit.
    return minSum === 0 ? mins.map(() => total / n) : mins.map((m) => (m * total) / minSum)
  }
  const wants = cols.map((_, i) => Math.max(mins[i], measuredMaxContent[i] ?? 0))
  const wantSum = wants.reduce((a, b) => a + b, 0)
  if (wantSum <= total) {
    const left = total - wantSum
    const weights = cols.map((c) => Math.max(0, c.weight ?? 0))
    const wSum = weights.reduce((a, b) => a + b, 0)
    return wants.map((w, i) => w + (wSum > 0 ? (left * weights[i]) / wSum : left / n))
  }
  const need = wantSum - total
  const extras = wants.map((w, i) => w - mins[i])
  const extraSum = extras.reduce((a, b) => a + b, 0)
  return wants.map((w, i) => w - (need * extras[i]) / extraSum)
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Cells                                                                            */
/* ─────────────────────────────────────────────────────────────────────────────── */

export type CheckValue = 'yes' | 'no' | 'partial' | boolean
export type StatusKind = 'positive' | 'warning' | 'negative'

export type TableCell =
  | string
  | number
  | { kind: 'text'; text: string }
  | { kind: 'number'; value: number; format?: ValueFormat }
  | { kind: 'check'; value: CheckValue }
  | { kind: 'rating'; value: number; max?: number }
  | { kind: 'status'; status: StatusKind; label: string }
  /** Injected child node: `build` receives the cell's inner box and returns a node inside it. */
  | { kind: 'node'; width: number; height: number; build: (box: Box) => LayoutNode }

export interface TableSpec {
  head?: ReadonlyArray<TableCell>
  rows: ReadonlyArray<ReadonlyArray<TableCell>>
  /** One width per column (usually from `solveColumns`). */
  widths: ReadonlyArray<number>
  /** Per-column alignment. `number` cells default to `end`, everything else to `start`. */
  align?: ReadonlyArray<CellAlign | undefined>
  /** Horizontal cell padding; vertical padding is half of it. */
  cellPad: number
  /** Extra space between rows. */
  rowGap: number
  /** Tint every second body row. */
  zebra?: boolean
  /** Hairlines: under the header only, between every row, or none. */
  rules?: 'none' | 'head' | 'rows'
}

const CHECK_ICON: Record<'yes' | 'no' | 'partial', { icon: string; role: ColorRole }> = {
  yes: { icon: 'check-circle', role: 'positive' },
  no: { icon: 'x-circle', role: 'negative' },
  partial: { icon: 'minus', role: 'neutral' },
}

function normalizeCheck(v: CheckValue): 'yes' | 'no' | 'partial' {
  return v === true ? 'yes' : v === false ? 'no' : v
}

interface Prepared {
  /** Natural content width (unwrapped). */
  maxContent: number
  /** Build the cell's nodes inside `inner` (the padded cell box). */
  build(inner: Box, align: CellAlign): { nodes: LayoutNode[]; height: number }
}

function alignX(inner: Box, w: number, align: CellAlign): number {
  const free = Math.max(0, inner.width - w)
  return align === 'end' ? inner.x + free : align === 'center' ? inner.x + free / 2 : inner.x
}

function textCell(text: string, style: ResolvedTextStyle, ctx: LayoutContext, part: string): Prepared {
  return {
    maxContent: ctx.measureText(text, style).width,
    build(inner, align) {
      const m = ctx.measureText(text, style, Math.max(1, inner.width))
      const w = Math.min(m.width, inner.width)
      return {
        height: m.height,
        nodes: [{ k: 'text', box: { x: alignX(inner, w, align), y: inner.y, width: w, height: m.height }, part, lines: m.lines, style }],
      }
    },
  }
}

function prepareCell(cell: TableCell, style: ResolvedTextStyle, ctx: LayoutContext, part: string): { prep: Prepared; defaultAlign: CellAlign } {
  const c = typeof cell === 'string' ? ({ kind: 'text', text: cell } as const) : typeof cell === 'number' ? ({ kind: 'number', value: cell } as const) : cell
  const dot = Math.max(4, Math.round(style.size * 0.6))
  switch (c.kind) {
    case 'text':
      return { prep: textCell(c.text, style, ctx, part), defaultAlign: 'start' }
    case 'number':
      return { prep: textCell(formatValue(c.value, c.format), style, ctx, part), defaultAlign: 'end' }
    case 'check': {
      const def = CHECK_ICON[normalizeCheck(c.value)]
      const size = Math.round(style.size * 1.1)
      const icon = getIcon(def.icon)
      return {
        defaultAlign: 'center',
        prep: {
          maxContent: size,
          build(inner, align) {
            const color = ctx.resolveColor(def.role).color
            const node: LayoutNode = icon
              ? { k: 'icon', box: { x: alignX(inner, size, align), y: inner.y, width: size, height: size }, part, icon: icon.path, fill: color, strokeWidth: 1.5 }
              : { k: 'rect', box: { x: alignX(inner, dot, align), y: inner.y, width: dot, height: dot }, part, fill: { type: 'solid', color }, radius: dot / 2 }
            return { nodes: [node], height: size }
          },
        },
      }
    }
    case 'rating': {
      const max = Math.max(1, Math.round(c.max ?? 5))
      const value = Math.min(max, Math.max(0, Math.round(Number.isFinite(c.value) ? c.value : 0)))
      const gap = Math.max(2, Math.round(dot * 0.5))
      const w = max * dot + (max - 1) * gap
      return {
        defaultAlign: 'start',
        prep: {
          maxContent: w,
          build(inner, align) {
            const x0 = alignX(inner, w, align)
            const filled = ctx.resolveColor('accent').color
            const empty = ctx.resolveColor('line').color
            const nodes: LayoutNode[] = []
            for (let i = 0; i < max; i++) {
              const box = { x: x0 + i * (dot + gap), y: inner.y, width: dot, height: dot }
              nodes.push(
                i < value
                  ? { k: 'rect', box, part: `${part}/dot-${i}`, fill: { type: 'solid', color: filled }, radius: dot / 2 }
                  : { k: 'rect', box, part: `${part}/dot-${i}`, stroke: { color: empty, width: 1 }, radius: dot / 2 }
              )
            }
            return { nodes, height: dot }
          },
        },
      }
    }
    case 'status': {
      const gap = Math.round(dot * 0.7)
      return {
        defaultAlign: 'start',
        prep: {
          maxContent: dot + gap + ctx.measureText(c.label, style).width,
          build(inner, align) {
            const m = ctx.measureText(c.label, style, Math.max(1, inner.width - dot - gap))
            const w = dot + gap + Math.min(m.width, Math.max(0, inner.width - dot - gap))
            const x0 = alignX(inner, w, align)
            const lineH = style.size * style.lineHeight
            return {
              height: m.height,
              nodes: [
                { k: 'rect', box: { x: x0, y: inner.y + (lineH - dot) / 2, width: dot, height: dot }, part: `${part}/dot`, fill: { type: 'solid', color: ctx.resolveColor(c.status).color }, radius: dot / 2 },
                { k: 'text', box: { x: x0 + dot + gap, y: inner.y, width: w - dot - gap, height: m.height }, part: `${part}/label`, lines: m.lines, style },
              ],
            }
          },
        },
      }
    }
    case 'node':
      return {
        defaultAlign: 'start',
        prep: {
          maxContent: c.width,
          build(inner) {
            return { nodes: [c.build({ x: inner.x, y: inner.y, width: Math.min(c.width, inner.width), height: c.height })], height: c.height }
          },
        },
      }
    default:
      return { prep: textCell('', style, ctx, part), defaultAlign: 'start' }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────── */
/* Measuring and layout                                                             */
/* ─────────────────────────────────────────────────────────────────────────────── */

/** Widest unwrapped content per column (header and body), including horizontal padding. */
export function measureColumns(
  spec: Pick<TableSpec, 'head' | 'rows' | 'cellPad'>,
  ctx: LayoutContext
): number[] {
  const bodyStyle = ctx.resolveText('body')
  const headStyle = ctx.resolveText('caption')
  const cols = Math.max(spec.head?.length ?? 0, ...spec.rows.map((r) => r.length))
  const out = new Array<number>(cols).fill(0)
  const take = (cells: ReadonlyArray<TableCell>, style: ResolvedTextStyle) =>
    cells.forEach((cell, c) => {
      out[c] = Math.max(out[c], prepareCell(cell, style, ctx, '').prep.maxContent + spec.cellPad * 2)
    })
  if (spec.head) take(spec.head, headStyle)
  for (const r of spec.rows) take(r, bodyStyle)
  return out
}

export interface TableMeasure {
  headHeight: number
  /** Height of each body row (without `rowGap`). */
  rowHeights: number[]
  /** Total table height including header, row gaps. */
  height: number
}

interface Built {
  measure: TableMeasure
  /** Per row (head first when present): cell node lists and the row's top / height. */
  rows: Array<{ top: number; height: number; cells: LayoutNode[] }>
  rowsTopLevel: number
}

function build(spec: TableSpec, ctx: LayoutContext): Built {
  const padX = spec.cellPad
  const padY = Math.round(spec.cellPad / 2)
  const bodyStyle = { ...ctx.resolveText('body'), color: ctx.resolveColor('text').color }
  const headStyle = { ...ctx.resolveText('caption'), color: ctx.resolveColor('textMuted').color }

  const colX: number[] = []
  let x = 0
  for (const w of spec.widths) {
    colX.push(x)
    x += w
  }

  const out: Built['rows'] = []
  let y = 0
  const doRow = (cells: ReadonlyArray<TableCell>, style: ResolvedTextStyle, partOf: (c: number) => string): number => {
    const top = y
    const built: Array<{ nodes: LayoutNode[]; height: number }> = []
    cells.forEach((cell, c) => {
      const w = spec.widths[c] ?? 0
      const { prep, defaultAlign } = prepareCell(cell, style, ctx, partOf(c))
      const inner: Box = { x: colX[c] + padX, y: top + padY, width: Math.max(0, w - padX * 2), height: 0 }
      built.push(prep.build(inner, spec.align?.[c] ?? defaultAlign))
    })
    const contentH = Math.max(style.size * style.lineHeight, ...built.map((b) => b.height))
    const height = Math.ceil(contentH + padY * 2)
    out.push({ top, height, cells: built.flatMap((b) => b.nodes) })
    y += height
    return height
  }

  let headHeight = 0
  if (spec.head && spec.head.length > 0) {
    headHeight = doRow(spec.head, headStyle, (c) => `head-${c}`)
    y += spec.rowGap
  }
  const rowHeights: number[] = []
  spec.rows.forEach((row, r) => {
    rowHeights.push(doRow(row, bodyStyle, (c) => `cell-${r}-${c}`))
    if (r < spec.rows.length - 1) y += spec.rowGap
  })
  return { measure: { headHeight, rowHeights, height: y }, rows: out, rowsTopLevel: headHeight > 0 ? 1 : 0 }
}

/** Heights only (no nodes handed back), for capacity checks and intrinsic sizing. */
export function measureTable(spec: TableSpec, ctx: LayoutContext): TableMeasure {
  return build(spec, ctx).measure
}

/**
 * Lay out a table at the origin of its block box. Returns a `group` with parts `head`,
 * `row-<i>` (one group per body row) and `cell-<r>-<c>` (header cells: `head-<c>`), plus
 * `rule-<i>` hairlines and `zebra-<i>` tints.
 */
export function layoutTable(spec: TableSpec, ctx: LayoutContext): LayoutNode {
  const { measure, rows, rowsTopLevel } = build(spec, ctx)
  const width = spec.widths.reduce((a, b) => a + b, 0)
  const lineColor = ctx.resolveColor('line').color
  const children: LayoutNode[] = []

  const group = (part: string, top: number, height: number, cells: LayoutNode[]): LayoutNode => ({
    k: 'group',
    box: { x: 0, y: top, width, height },
    part,
    children: cells,
  })
  const hairline = (part: string, yPos: number): LayoutNode => ({
    k: 'line',
    box: { x: 0, y: yPos, width, height: 0 },
    part,
    from: { x: 0, y: yPos },
    to: { x: width, y: yPos },
    stroke: { color: lineColor, width: 1 },
  })

  if (rowsTopLevel === 1) {
    children.push(group('head', rows[0].top, rows[0].height, rows[0].cells))
    if (spec.rules === 'head' || spec.rules === 'rows') {
      children.push(hairline('rule-head', rows[0].top + rows[0].height + spec.rowGap / 2))
    }
  }
  for (let r = 0; r < measure.rowHeights.length; r++) {
    const row = rows[r + rowsTopLevel]
    if (spec.zebra && r % 2 === 1) {
      children.push({
        k: 'rect',
        box: { x: 0, y: row.top - spec.rowGap / 2, width, height: row.height + spec.rowGap },
        part: `zebra-${r}`,
        fill: { type: 'solid', color: ctx.resolveColor('surfaceAlt').color },
      })
    }
    children.push(group(`row-${r}`, row.top, row.height, row.cells))
    if (spec.rules === 'rows' && r < measure.rowHeights.length - 1) {
      children.push(hairline(`rule-${r}`, row.top + row.height + spec.rowGap / 2))
    }
  }
  return { k: 'group', box: { x: 0, y: 0, width, height: measure.height }, part: 'table', children }
}

/**
 * How many body rows fit. `rowHeights` come from `measureTable`; `box.height` is the space for
 * the whole table. `fits` is true when every row fits.
 */
export function capacityForTable(
  rowHeights: ReadonlyArray<number>,
  box: { height: number },
  opts: { headHeight?: number; rowGap?: number } = {}
): { fits: boolean; maxRows: number } {
  const gap = opts.rowGap ?? 0
  let used = opts.headHeight && opts.headHeight > 0 ? opts.headHeight + gap : 0
  let maxRows = 0
  for (let i = 0; i < rowHeights.length; i++) {
    const next = used + rowHeights[i]
    if (next > box.height + 1e-9) break
    used = next + gap
    maxRows++
  }
  return { fits: maxRows === rowHeights.length, maxRows }
}
