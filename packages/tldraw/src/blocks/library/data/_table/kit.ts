/**
 * P2 part B table kit: the shared plumbing of `tls.d.table`, `compare-table` and `scorecard` on
 * top of the P0.7 table engine (`blocks/layout/table.ts`).
 *
 * What it adds over the engine:
 * - cell parsing: a string cell becomes a number / status / rating / check cell by column kind,
 *   and anything that does not parse stays plain text (never NaN, never a blank);
 * - the check icon is drawn through `iconLeaf` (scaled path), because the `icon` node draws its
 *   path unscaled in a viewBox equal to its box;
 * - a FLAT tree: the engine groups every row at its own y, but its children are already absolute,
 *   so the DOM renderer (children relative to the group) would double the offset. Row and head
 *   groups are re-boxed to the table origin, and `line` hairlines (unreliable in the DOM) become
 *   1px rects;
 * - header styles (filled / bold / none), a tinted emphasis row or column, a footer row, a compact
 *   density that steps the text down one token, bracket part names (`row[i].c<j>`).
 *
 * Pure and DOM-free. Never throws.
 */

import type { Box, CapacityReport, LayoutContext, LayoutNode } from '../../../types'
import {
  capacityForTable,
  layoutTable,
  measureColumns,
  measureTable,
  solveColumns,
  type CellAlign,
  type TableCell,
  type TableMeasure,
  type TableSpec,
} from '../../../layout/table'
import { iconLeaf } from '../../text/_engine/icon'
import { fmtNum, isNum, longestWord, onColor, tintOf, TEXT_SLACK } from '../_chart/kit'

export type ColKind = 'text' | 'number' | 'status' | 'rating' | 'check' | 'checkOrRating' | 'ratingOrCheck'
/** The kinds an author may name (the two `...Or...` kinds are internal: compare-table cells). */
export const COL_KINDS: ColKind[] = ['text', 'number', 'status', 'rating', 'check']

/* ───────────────────────────── cell parsing ───────────────────────────── */

const GOOD = /^(good|ok|okay|green|on.?track|done|pass(ed)?|met|healthy|positive|achieved|complete[d]?)$/i
const WATCH = /^(watch|warn(ing)?|amber|yellow|at.?risk|risk|behind|caution|partial|slipping)$/i
const BAD = /^(bad|red|off.?track|fail(ed)?|missed|critical|negative|blocked|late)$/i

export type StatusRole = 'positive' | 'warning' | 'negative'

/** good/watch/bad words (and common synonyms) to a status role; null when unrecognised. */
export function parseStatus(raw: string): StatusRole | null {
  const s = raw.trim()
  if (GOOD.test(s)) return 'positive'
  if (WATCH.test(s)) return 'warning'
  if (BAD.test(s)) return 'negative'
  return null
}

/** yes / no / partial (and ticks, crosses, true / false) to a check value; null when unrecognised. */
export function parseCheck(raw: string): 'yes' | 'no' | 'partial' | null {
  const s = raw.trim().toLowerCase()
  if (['yes', 'y', 'true', 'ok', '✓', '✔', 'included', 'check'].includes(s)) return 'yes'
  if (['no', 'n', 'false', '✗', '✘', 'x', '×', 'none', 'cross', 'not included'].includes(s)) return 'no'
  if (['partial', 'some', '~', 'limited', 'maybe', 'part'].includes(s)) return 'partial'
  return null
}

/** A number from "1,234", "$9", "12%", 4 ... with the format it implies; null for anything else. */
export function parseNumber(raw: unknown): { value: number; format?: 'percent' | 'currency' } | null {
  if (isNum(raw)) return { value: raw }
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  const m = /^([-+]?)\s*(\$?)\s*(\d[\d,]*(?:\.\d+)?|\.\d+)\s*(%?)$/.exec(s)
  if (!m) return null
  const value = Number(m[3].replace(/,/g, '')) * (m[1] === '-' ? -1 : 1)
  if (!Number.isFinite(value)) return null
  return { value, ...(m[4] ? { format: 'percent' as const } : m[2] ? { format: 'currency' as const } : {}) }
}

export function cellText(v: unknown): string {
  if (typeof v === 'string') return v
  if (isNum(v)) return String(v)
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  return ''
}

/**
 * One body cell. `part` is the engine part (`cell-<r>-<c>`; it is renamed to a bracket name later).
 * A cell that does not fit its column kind falls back to plain text.
 */
export function parseCell(raw: unknown, kind: ColKind, part: string, ctx: LayoutContext, format?: string, place?: IconPlace): TableCell {
  const text = cellText(raw)
  switch (kind) {
    case 'number': {
      const n = parseNumber(raw)
      if (!n) return { kind: 'text', text }
      const f = n.format ?? (format && format !== 'plain' ? format : undefined)
      return { kind: 'text', text: fmtNum(n.value, f) }
    }
    case 'status': {
      const role = parseStatus(text)
      return role ? { kind: 'status', status: role, label: text } : { kind: 'text', text }
    }
    case 'rating': {
      const n = parseNumber(raw)
      return n && n.value >= 0 && n.value <= 10 ? { kind: 'rating', value: n.value } : { kind: 'text', text }
    }
    case 'checkOrRating':
    case 'ratingOrCheck': {
      const first = kind === 'checkOrRating' ? 'check' : 'rating'
      const second = first === 'check' ? 'rating' : 'check'
      const a = parseCell(raw, first, part, ctx, format, place)
      if (typeof a === 'object' && a.kind !== 'text') return a
      return parseCell(raw, second, part, ctx, format, place)
    }
    case 'check': {
      const v = parseCheck(text)
      return v ? checkCell(v, part, ctx, place) : { kind: 'text', text }
    }
    default:
      return { kind: 'text', text }
  }
}

const CHECK_ICON = { yes: ['check-circle', 'positive'], no: ['x-circle', 'negative'], partial: ['minus', 'neutral'] } as const

/**
 * Where an injected icon sits in its column. The engine hands a `node` cell only a left-anchored
 * box, so alignment is done here from the solved column width (`widths` is filled after solving).
 */
export interface IconPlace {
  col: number
  align: CellAlign
  pad: number
  widths: number[]
}

/** A tick / cross / dash drawn as a scaled icon (a `node` cell, so the engine only reserves room). */
export function checkCell(v: 'yes' | 'no' | 'partial', part: string, ctx: LayoutContext, place?: IconPlace): TableCell {
  const size = Math.round(ctx.resolveText('body').size * 1.1)
  const [icon, role] = CHECK_ICON[v]
  return {
    kind: 'node',
    width: size,
    height: size,
    build: (box: Box) => {
      const inner = place ? Math.max(0, (place.widths[place.col] ?? 0) - place.pad * 2) : size
      const free = Math.max(0, inner - size)
      const dx = place?.align === 'center' ? free / 2 : place?.align === 'end' ? free : 0
      return iconLeaf(icon, { x: box.x + dx, y: box.y, width: size, height: size }, ctx.resolveColor(role).color, part)
    },
  }
}

export function defaultAlign(kind: ColKind): CellAlign {
  return kind === 'number' ? 'end' : kind === 'check' || kind === 'checkOrRating' || kind === 'ratingOrCheck' ? 'center' : 'start'
}

export function alignOf(v: unknown, kind: ColKind): CellAlign {
  return v === 'start' || v === 'center' || v === 'end' ? v : defaultAlign(kind)
}

/* ───────────────────────────── density ───────────────────────────── */

/** A context whose `body` and `caption` text resolve one token smaller (compact tables). */
export function compactCtx(ctx: LayoutContext): LayoutContext {
  const step = { body: 'caption', caption: 'footnote' } as const
  return { ...ctx, resolveText: (token, over) => ctx.resolveText((step as Record<string, any>)[token] ?? token, over) }
}

/* ───────────────────────────── build ───────────────────────────── */

export interface TableInput {
  head?: ReadonlyArray<unknown>
  rows: ReadonlyArray<ReadonlyArray<unknown>>
  footer?: ReadonlyArray<unknown>
  kinds: ReadonlyArray<ColKind>
  aligns?: ReadonlyArray<unknown>
  /** Relative width per column (undefined: text columns share the leftover, others hug content). */
  weights?: ReadonlyArray<number | undefined>
  width: number
  density?: 'default' | 'compact'
  zebra?: boolean
  rules?: 'none' | 'head' | 'rows'
  header?: 'filled' | 'bold' | 'none'
  emphasisRow?: number
  emphasisCol?: number
  /** Part name of the emphasised column tint (`emphasis` -> `emphasis.col`; anything else is used as is). */
  emphasisName?: string
  /** Also paint the emphasised column's header cell in the accent (compare-table `winner`). */
  emphasisHead?: boolean
  /** Semantic cell part names per column: `cell-r-c` becomes `<name>[r]` (default `row[r].c<c>`). */
  cellNames?: ReadonlyArray<string>
  /** Restyle a built cell node (bold values, muted notes). Receives its row and column. */
  restyle?: (node: LayoutNode, row: number, col: number) => LayoutNode
  format?: string
}

export interface TableBuilt {
  tree: LayoutNode
  measure: TableMeasure
  widths: number[]
  rowGap: number
}

const renamer = (names?: ReadonlyArray<string>) => (part: string | undefined): string | undefined => {
  if (!part) return part
  let m = /^row-(\d+)$/.exec(part)
  if (m) return `row[${m[1]}]`
  m = /^cell-(\d+)-(\d+)(.*)$/.exec(part)
  if (m) return names?.[Number(m[2])] ? `${names[Number(m[2])]}[${m[1]}]${m[3]}` : `row[${m[1]}].c${m[2]}${m[3]}`
  m = /^head-(\d+)(.*)$/.exec(part)
  if (m) return `head[${m[1]}]${m[2]}`
  m = /^(rule|zebra)-(\d+)$/.exec(part)
  if (m) return `${m[1]}[${m[2]}]`
  return part
}

function boldHeader(node: LayoutNode, color: string): LayoutNode {
  if (node.k === 'text') {
    return { ...node, lines: node.lines.map((l) => ({ ...l, runs: [{ text: l.text, bold: true, color }] })) }
  }
  return node
}

export function buildTable(ctx0: LayoutContext, o: TableInput): TableBuilt {
  const rename = renamer(o.cellNames)
  const compact = o.density === 'compact'
  const ctx = compact ? compactCtx(ctx0) : ctx0
  const sp = ctx.tokens.space
  const cols = Math.max(1, o.kinds.length)
  const cellPad = compact ? sp.xs : sp.sm
  const rowGap = 2
  const header = o.header === 'bold' || o.header === 'none' ? o.header : 'filled'
  const W = Math.max(1, o.width)

  const aligns = Array.from({ length: cols }, (_, c) => alignOf(o.aligns?.[c], o.kinds[c] ?? 'text'))
  const widths: number[] = []
  const placeOf = (c: number): IconPlace => ({ col: c, align: aligns[c], pad: cellPad, widths })
  const bodyRows = o.rows.map((r, ri) => Array.from({ length: cols }, (_, c) => parseCell(r?.[c], o.kinds[c] ?? 'text', `cell-${ri}-${c}`, ctx, o.format, placeOf(c))))
  const nBody = bodyRows.length
  const footRow = o.footer && o.footer.length > 0 ? Array.from({ length: cols }, (_, c) => parseCell(o.footer![c], o.kinds[c] ?? 'text', `cell-${nBody}-${c}`, ctx, o.format, placeOf(c))) : undefined
  const head: TableCell[] | undefined = o.head && header !== 'none' ? Array.from({ length: cols }, (_, c) => ({ kind: 'text' as const, text: cellText(o.head![c]) })) : undefined
  const rows = footRow ? [...bodyRows, footRow] : bodyRows

  const base = { head, rows, cellPad, rowGap, align: aligns, zebra: o.zebra, rules: o.rules ?? 'none' } as const
  const measured = measureColumns({ head, rows, cellPad }, ctx).map((w) => w * 1.06)
  const bodyStyle = ctx.resolveText('body')
  const words = Array.from({ length: cols }, (_, c) => {
    let w = 0
    const take = (cell: TableCell | undefined) => {
      if (cell && typeof cell === 'object' && cell.kind === 'text') w = Math.max(w, longestWord(ctx, cell.text, bodyStyle))
    }
    rows.forEach((r) => take(r[c]))
    return Math.min(W * 0.4, Math.ceil(w * TEXT_SLACK) + cellPad * 2)
  })
  widths.push(...solveColumns(
    Array.from({ length: cols }, (_, c) => ({
      min: o.kinds[c] === 'text' ? words[c] : Math.min(measured[c] ?? 0, W / cols),
      weight: o.weights?.[c] ?? (o.kinds[c] === 'text' || o.kinds[c] === undefined ? 1 : 0),
    })),
    W,
    measured
  ))
  const spec: TableSpec = { ...base, widths }
  const raw = layoutTable(spec, ctx)
  const measure = measureTable(spec, ctx)
  const H = Math.max(1, measure.height)

  const c = {
    text: ctx.resolveColor('text').color,
    surface: ctx.resolveColor('surface').color,
    line: ctx.resolveColor('line').color,
    accent: ctx.resolveColor('accent').color,
  }
  const lineRect = (n: LayoutNode): LayoutNode => ({
    k: 'rect',
    part: n.part,
    box: { x: 0, y: n.box.y - 0.5, width: W, height: 1 },
    fill: { type: 'solid', color: c.line },
  })
  const groupBox = { x: 0, y: 0, width: W, height: H }

  const backs: LayoutNode[] = []
  const content: LayoutNode[] = []
  const headFill = header === 'filled' ? c.accent : undefined
  const headInk = headFill ? onColor(ctx, headFill) : c.text
  const nRows = rows.length
  const isFooter = (part?: string) => footRow !== undefined && part === `row-${nRows - 1}`
  const emphRow = isNum(o.emphasisRow) && o.emphasisRow >= 0 && o.emphasisRow < nBody ? Math.floor(o.emphasisRow) : -1
  const emphCol = isNum(o.emphasisCol) && o.emphasisCol >= 0 && o.emphasisCol < cols ? Math.floor(o.emphasisCol) : -1
  const tint = tintOf(c.surface, c.accent, 0.16)

  const rowBox = new Map<string, Box>()
  if (raw.k === 'group') {
    for (const ch of raw.children) {
      if (ch.k === 'group' && ch.part) rowBox.set(ch.part, ch.box)
    }
    for (const ch of raw.children) {
      if (ch.k === 'rect' && ch.part?.startsWith('zebra-')) backs.push({ ...ch, part: rename(ch.part) })
      else if (ch.k === 'line') content.push({ ...lineRect(ch), part: rename(ch.part) })
      else if (ch.k === 'group') {
        const isHead = ch.part === 'head'
        const cells = ch.children.map((n) => {
          const winnerHead = isHead && o.emphasisHead === true && emphCol >= 0 && n.part === `head-${emphCol}`
          const styled = winnerHead ? boldHeader(n, onColor(ctx, c.accent)) : isHead && header === 'bold' ? boldHeader(n, c.text) : isHead && headFill ? boldHeader(n, headInk) : footRow && isFooter(ch.part) ? boldHeader(n, c.text) : n
          const cm = /^cell-(\d+)-(\d+)/.exec(n.part ?? '')
          const out = cm && o.restyle ? o.restyle(styled, Number(cm[1]), Number(cm[2])) : styled
          return { ...out, part: rename(n.part) } as LayoutNode
        })
        if (isFooter(ch.part)) {
          content.push({ k: 'rect', part: 'footer.rule', box: { x: 0, y: ch.box.y - rowGap / 2 - 0.5, width: W, height: 1 }, fill: { type: 'solid', color: c.line } })
        }
        content.push({ k: 'group', part: isFooter(ch.part) ? 'footer' : rename(ch.part), box: groupBox, children: cells })
      } else content.push({ ...ch, part: rename(ch.part) })
    }
  }
  if (headFill && measure.headHeight > 0) {
    backs.unshift({ k: 'rect', part: 'head.bg', box: { x: 0, y: 0, width: W, height: measure.headHeight + rowGap / 2 }, fill: { type: 'solid', color: headFill } })
  }
  const bodyTop = measure.headHeight > 0 ? measure.headHeight + rowGap : 0
  if (emphRow >= 0) {
    const b = rowBox.get(`row-${emphRow}`)
    if (b) backs.push({ k: 'rect', part: 'emphasis.row', box: { x: 0, y: b.y - rowGap / 2, width: W, height: b.height + rowGap }, fill: { type: 'solid', color: tint } })
  }
  if (emphCol >= 0) {
    const x = widths.slice(0, emphCol).reduce((a, b) => a + b, 0)
    const name = o.emphasisName ?? 'emphasis'
    const top = bodyTop > 0 ? bodyTop - rowGap / 2 : 0
    backs.push({ k: 'rect', part: name === 'emphasis' ? 'emphasis.col' : name, box: { x, y: top, width: widths[emphCol] ?? 0, height: Math.max(0, H - top) }, fill: { type: 'solid', color: tint } })
    if (o.emphasisHead && measure.headHeight > 0) {
      backs.push({ k: 'rect', part: `${name === 'emphasis' ? 'emphasis' : name}.head`, box: { x, y: 0, width: widths[emphCol] ?? 0, height: top }, fill: { type: 'solid', color: c.accent } })
    }
  }
  const tree: LayoutNode = { k: 'group', part: 'root', box: { x: 0, y: 0, width: W, height: H }, children: [...backs, ...content] }
  return { tree, measure, widths, rowGap }
}

/* ───────────────────────────── capacity ───────────────────────────── */

export const TABLE_MAX_ROWS = 14

/** Row and column budgets; `fits` also needs the measured height to fit `box`. */
export function tableCapacity(built: Pick<TableBuilt, 'measure' | 'rowGap'>, box: { height: number }, o: { rows: number; maxRows: number; cols: number; maxCols: number; compact: boolean; hasFooter?: boolean }): CapacityReport {
  const cap = capacityForTable(built.measure.rowHeights, box, { headHeight: built.measure.headHeight, rowGap: built.rowGap })
  const fits = cap.fits && o.rows <= o.maxRows && o.cols <= o.maxCols
  const budget: CapacityReport['budget'] = {
    rows: { max: Math.min(o.maxRows, Math.max(1, cap.maxRows - (o.hasFooter ? 1 : 0))), used: o.rows, unit: 'items' },
    columns: { max: o.maxCols, used: o.cols, unit: 'items' },
  }
  return {
    fits,
    budget,
    remedy: fits ? [] : [...(o.compact ? [] : [{ kind: 'reflow' as const, to: 'density: compact' }]), { kind: 'paginate' as const }],
  }
}


/* ───────────────────────────── child layouts ───────────────────────────── */

/**
 * The leaves of a `ctx.layoutChild` result in the PARENT's coordinates. `layoutChild` wraps the
 * child in a group at its box and the child's own tree is relative to that group: the DOM renderer
 * honours the offset, the SVG renderer ignores it. Flattening to absolute leaves is correct in both.
 * Meant for rect / text / icon leaves (a `path`'s `d` is not shifted).
 */
export function flattenChild(node: LayoutNode, dx = 0, dy = 0): LayoutNode[] {
  const x = dx + node.box.x
  const y = dy + node.box.y
  if (node.k === 'group') return node.children.flatMap((c) => flattenChild(c, x, y))
  return [{ ...node, box: { ...node.box, x, y } } as LayoutNode]
}
