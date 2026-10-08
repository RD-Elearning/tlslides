/**
 * Pure layout for tls.d.scorecard — metric rows with a value, a target and a red / amber / green
 * status, on the P0.7 table engine.
 *
 * Columns: metric, value (bold, right-aligned), target, status, note; `showTarget` and `showNote`
 * drop their column. `statusStyle`: `dot` = dot + word, `pill` = the same on a tinted pill, `bar` =
 * a colour strip at the start of each row and no status column. Parts: `head`, `row[i]`,
 * `label[i]`, `value[i]`, `target[i]`, `status[i]/dot|label`, `note[i]`, `pill[i]`, `strip[i]`.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import { isShown } from '../../../schema-helpers'
import type { ScorecardProps } from './schema'
import { SCORECARD_MAX_ITEMS } from './schema'
import { asArr, emptyState, enumOf, str, tintOf } from '../_chart/kit'
import { buildTable, tableCapacity, type ColKind, type TableInput } from '../_table/kit'

const WORD = { good: 'On track', watch: 'Watch', bad: 'Off track', none: '' } as const
const ROLE = { good: 'positive', watch: 'warning', bad: 'negative' } as const
type St = keyof typeof WORD

interface Row {
  label: string
  value: string
  target: string
  status: St
  note: string
}

function read(props: ScorecardProps, width: number) {
  const items: Row[] = asArr<Record<string, unknown>>(props.items)
    .slice(0, SCORECARD_MAX_ITEMS)
    .map((it) => ({ label: str(it?.label), value: str(it?.value), target: str(it?.target), status: enumOf(it?.status, ['good', 'watch', 'bad', 'none'] as const, 'none'), note: str(it?.note) }))
  if (items.length === 0) return null
  const style = enumOf(props.statusStyle, ['dot', 'pill', 'bar'] as const, 'dot')
  const showTarget = isShown(props, 'showTarget')
  const showNote = isShown(props, 'showNote') && items.some((i) => i.note)
  const cols = ['label', 'value', ...(showTarget ? ['target'] : []), ...(style === 'bar' ? [] : ['status']), ...(showNote ? ['note'] : [])]
  const pick = (r: Row, c: string) => (c === 'status' ? WORD[r.status] : (r as unknown as Record<string, string>)[c])
  const labels: Record<string, string> = { label: 'Metric', value: 'Actual', target: 'Target', status: 'Status', note: 'Note' }
  const input: TableInput = {
    head: cols.map((c) => labels[c]),
    rows: items.map((r) => cols.map((c) => pick(r, c))),
    kinds: cols.map((c) => (c === 'status' ? 'status' : 'text') as ColKind),
    aligns: cols.map((c) => (c === 'value' || c === 'target' ? 'end' : 'start')),
    weights: cols.map((c) => ({ label: 3, value: 1, target: 1, status: 1.3, note: 3 })[c] as number),
    width: Math.max(1, width),
    rules: 'rows',
    header: 'bold',
    cellNames: cols,
  }
  return { items, style, input, cols }
}

export function layout(props: ScorecardProps, ctx: LayoutContext): LayoutNode {
  const r = read(props, ctx.box.width)
  if (!r) return emptyState(ctx)
  const text = ctx.resolveColor('text').color
  const muted = ctx.resolveColor('textMuted').color
  const input: TableInput = {
    ...r.input,
    restyle: (n, _row, col) => {
      const name = r.cols[col]
      if (n.k !== 'text') return n
      if (name === 'value') return { ...n, lines: n.lines.map((l) => ({ ...l, runs: [{ text: l.text, bold: true, color: text }] })) }
      if (name === 'note' || name === 'target') return { ...n, style: { ...n.style, color: muted } }
      return n
    },
  }
  const built = buildTable(ctx, input)
  const tree = built.tree
  if (tree.k !== 'group') return tree
  const surface = ctx.resolveColor('surface').color
  const extra: LayoutNode[] = []
  const leaf = (part: string) => tree.children.flatMap((g) => (g.k === 'group' ? g.children : [g])).find((n) => n.part === part)
  const rowTop = (i: number) => (built.measure.headHeight > 0 ? built.measure.headHeight + built.rowGap : 0) + built.measure.rowHeights.slice(0, i).reduce((a, b) => a + b + built.rowGap, 0)
  r.items.forEach((it, i) => {
    if (it.status === 'none') return
    const role = ctx.resolveColor(ROLE[it.status]).color
    if (r.style === 'bar') {
      extra.push({ k: 'rect', part: `strip[${i}]`, box: { x: 0, y: rowTop(i), width: 6, height: built.measure.rowHeights[i] ?? 0 }, fill: { type: 'solid', color: role }, radius: 3 })
      return
    }
    if (r.style !== 'pill') return
    const d = leaf(`status[${i}]/dot`)
    const label = leaf(`status[${i}]/label`)
    if (!d || !label) return
    const padX = 10
    const x = d.box.x - padX
    const right = label.box.x + label.box.width * 1.12 + padX
    extra.push({ k: 'rect', part: `pill[${i}]`, box: { x, y: label.box.y - 2, width: right - x, height: label.box.height + 4 }, fill: { type: 'solid', color: tintOf(surface, role, 0.2) }, radius: (label.box.height + 4) / 2 })
  })
  return { ...tree, children: [...extra, ...tree.children] }
}

export function capacity(props: ScorecardProps, box: Size, ctx: LayoutContext): CapacityReport {
  const r = read(props, box.width)
  const built = r ? buildTable(ctx, r.input) : { measure: { headHeight: 0, rowHeights: [], height: 0 }, rowGap: 0 }
  return tableCapacity(built, box, { rows: asArr(props.items).length, maxRows: SCORECARD_MAX_ITEMS, cols: r?.cols.length ?? 0, maxCols: 5, compact: false })
}
