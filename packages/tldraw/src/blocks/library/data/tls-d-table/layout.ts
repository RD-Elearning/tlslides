/**
 * Pure layout for tls.d.table — built on the P0.7 table engine through `_table/kit`.
 *
 * Number columns are right-aligned and formatted; a value that does not parse as a number stays
 * text; status, rating and check columns draw dots, ringed dots and scaled icons. Column widths
 * come from `solveColumns` (text wraps, numbers keep their width). Parts: `head`, `row[i]`,
 * `row[i].c<j>`, `footer`.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import type { TableProps } from './schema'
import { TABLE_MAX_COLS } from './schema'
import { asArr, emptyState, enumOf, isNum, numOrNull, str } from '../_chart/kit'
import { buildTable, tableCapacity, COL_KINDS, TABLE_MAX_ROWS, type ColKind, type TableInput } from '../_table/kit'

function read(props: TableProps, width: number): { input: TableInput; rows: number; cols: number } | null {
  const colsRaw = asArr<Record<string, unknown>>(props.columns)
  const cols = colsRaw.slice(0, TABLE_MAX_COLS)
  if (cols.length === 0) return null
  const rowsRaw = asArr<unknown>(props.rows).map((r) => asArr<unknown>(r))
  const footer = isShown(props, 'showFooter') ? asArr<unknown>(props.footer) : []
  const rules = enumOf(props.rules, ['horizontal', 'head', 'none'] as const, 'none')
  const input: TableInput = {
    head: cols.map((c) => str(c?.label)),
    rows: rowsRaw.slice(0, TABLE_MAX_ROWS),
    footer: footer.length > 0 ? footer : undefined,
    kinds: cols.map((c) => enumOf(c?.kind, COL_KINDS, 'text') as ColKind),
    aligns: cols.map((c) => c?.align),
    weights: cols.map((c) => (isNum(c?.width) && (c.width as number) > 0 ? (c.width as number) : undefined)),
    width,
    density: props.density === 'compact' ? 'compact' : 'default',
    zebra: props.zebra === true,
    rules: rules === 'horizontal' ? 'rows' : rules === 'head' ? 'head' : 'none',
    header: enumOf(props.header, ['filled', 'bold', 'none'] as const, 'filled'),
    emphasisRow: numOrNull(props.emphasisRow) ?? -1,
    emphasisCol: numOrNull(props.emphasisCol) ?? -1,
    format: typeof props.format === 'string' ? props.format : undefined,
  }
  return { input, rows: rowsRaw.length, cols: colsRaw.length }
}

export function layout(props: TableProps, ctx: LayoutContext): LayoutNode {
  const r = read(props, Math.max(1, ctx.box.width))
  if (!r || r.rows === 0) return emptyState(ctx)
  // AC3 pre-item: one type step larger when the table fits its box that way.
  return buildTable(ctx, { ...r.input, fitHeight: ctx.box.height }).tree
}

export function capacity(props: TableProps, box: Size, ctx: LayoutContext): CapacityReport {
  const r = read(props, Math.max(1, box.width))
  if (!r) return tableCapacity({ measure: { headHeight: 0, rowHeights: [], height: 0 }, rowGap: 0 }, box, { rows: 0, maxRows: TABLE_MAX_ROWS, cols: 0, maxCols: TABLE_MAX_COLS, compact: false })
  const built = buildTable(ctx, r.input)
  return tableCapacity(built, box, {
    rows: r.rows,
    maxRows: TABLE_MAX_ROWS,
    cols: r.cols,
    maxCols: TABLE_MAX_COLS,
    compact: r.input.density === 'compact',
    hasFooter: !!r.input.footer,
  })
}
