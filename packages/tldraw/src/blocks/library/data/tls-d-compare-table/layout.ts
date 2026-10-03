/**
 * Pure layout for tls.d.compare-table — a feature matrix on the P0.7 table engine.
 *
 * First column holds the criteria, one column per option. Cells are ticks / crosses / dashes
 * (`check`), dot ratings (`rating`) or plain text; a cell that does not parse as the chosen kind
 * falls back to the other icon kind, then to text. `winner` tints that option's whole column and
 * paints its header in the accent. Parts: `head`, `row[i]`, `winner`, `winner.head`.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { CompareTableProps } from './schema'
import { COMPARE_MAX_CRITERIA, COMPARE_MAX_OPTIONS } from './schema'
import { asArr, emptyState, numOrNull, str } from '../_chart/kit'
import { buildTable, tableCapacity, type ColKind, type TableInput } from '../_table/kit'

function read(props: CompareTableProps, width: number): { input: TableInput; rows: number; cols: number } | null {
  const options = asArr<unknown>(props.options).map(str).slice(0, COMPARE_MAX_OPTIONS)
  const criteria = asArr<unknown>(props.criteria).slice(0, COMPARE_MAX_CRITERIA).map(str)
  if (options.length === 0 || criteria.length === 0) return null
  const cells = asArr<unknown>(props.cells).map((r) => asArr<unknown>(r))
  const kind: ColKind = props.cellKind === 'text' ? 'text' : props.cellKind === 'rating' ? 'ratingOrCheck' : 'checkOrRating'
  const w = numOrNull(props.winner)
  const input: TableInput = {
    head: ['', ...options],
    rows: criteria.map((c, i) => [c, ...options.map((_, j) => cells[i]?.[j])]),
    kinds: ['text', ...options.map(() => kind)],
    aligns: ['start', ...options.map(() => 'center')],
    weights: [1.5, ...options.map(() => 1)],
    width,
    density: props.density === 'compact' ? 'compact' : 'default',
    zebra: props.zebra !== false,
    rules: 'none',
    header: 'bold',
    emphasisCol: w !== null && w >= 0 && w < options.length ? Math.floor(w) + 1 : -1,
    emphasisName: 'winner',
    emphasisHead: true,
  }
  return { input, rows: asArr(props.criteria).length, cols: asArr(props.options).length }
}

export function layout(props: CompareTableProps, ctx: LayoutContext): LayoutNode {
  const r = read(props, Math.max(1, ctx.box.width))
  return r ? buildTable(ctx, r.input).tree : emptyState(ctx)
}

export function capacity(props: CompareTableProps, box: Size, ctx: LayoutContext): CapacityReport {
  const r = read(props, Math.max(1, box.width))
  const built = r ? buildTable(ctx, r.input) : { measure: { headHeight: 0, rowHeights: [], height: 0 }, rowGap: 0 }
  return tableCapacity(built, box, {
    rows: r?.rows ?? 0,
    maxRows: COMPARE_MAX_CRITERIA,
    cols: r?.cols ?? 0,
    maxCols: COMPARE_MAX_OPTIONS,
    compact: props.density === 'compact',
  })
}
