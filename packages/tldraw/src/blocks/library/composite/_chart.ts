/**
 * The chart slot shared by `tls.c.dashboard` and `tls.c.chart-insight`: `{ kind, categories, series }`
 * mapped to the props of the matching `tls.d.<kind>` block. Pure.
 */

import type { BlockSchema, BlockSpec, LayoutContext, LayoutNode, MotionRecipe } from '../../types'
import { asArr } from '../data/_chart/kit'
import { composeFlat, flattenNode, type Piece } from './_kit'
import { LABEL_AFTER, MARK_STAGGER } from '../data/_chart/motion'

export const CHART_KINDS = ['bar', 'line', 'area', 'donut', 'stacked-bar', 'grouped-bar', 'pie'] as const
export type ChartKind = (typeof CHART_KINDS)[number]

export interface ChartSeries {
  name?: string
  values: Array<number | null>
}

export interface ChartSlot {
  kind: ChartKind
  categories: string[]
  series: ChartSeries[]
}

export const chartSlot = (kinds: readonly ChartKind[] = CHART_KINDS): BlockSchema[string] =>
  ({
    type: {
      kind: 'object',
      fields: {
        kind: { type: { kind: 'enum', values: [...kinds] }, role: 'content', label: 'Chart kind', required: true },
        categories: { type: { kind: 'list', of: { kind: 'text', maxChars: 24 }, min: 2, max: 12 }, role: 'content', label: 'Categories', required: true },
        series: {
          type: {
            kind: 'list',
            of: {
              kind: 'object',
              fields: {
                name: { type: { kind: 'text', maxChars: 24 }, role: 'content', label: 'Name' },
                values: { type: { kind: 'list', of: { kind: 'number' } }, role: 'content', label: 'Values', required: true },
              },
            },
            min: 1,
            max: 4,
          },
          role: 'content',
          label: 'Series',
          required: true,
        },
      },
    },
    role: 'content',
    label: 'Chart',
    required: true,
    guidance: 'Fields: kind, categories, series[{name, values}]. bar/pie/donut use series[0] only.',
  }) as BlockSchema[string]

const ROLES = ['accent', 'accent2', 'positive', 'warning', 'negative', 'neutral']

/** Normalise any plausible input (numbers or `{name, values}` entries) to series objects. */
export function seriesOf(raw: unknown): ChartSeries[] {
  const list = asArr<unknown>(raw)
  if (list.length > 0 && list.every((x) => typeof x === 'number' || x === null)) return [{ values: list as Array<number | null> }]
  return list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({ name: typeof x.name === 'string' ? x.name : undefined, values: asArr<number | null>(x.values) }))
}

/** The `tls.d.<kind>` spec for a chart slot. Unknown kinds fall back to `bar`. */
export function chartSpec(chart: unknown, id: string): BlockSpec {
  const c = (chart && typeof chart === 'object' ? chart : {}) as Record<string, unknown>
  const kind = (CHART_KINDS as readonly string[]).includes(c.kind as string) ? (c.kind as ChartKind) : 'bar'
  const categories = asArr<unknown>(c.categories).map((x) => String(x ?? ''))
  const series = seriesOf(c.series)
  const first = series[0]?.values ?? []
  const named = series.map((s, i) => ({ name: s.name ?? `Series ${i + 1}`, values: s.values }))
  switch (kind) {
    case 'bar':
      return { id, type: 'tls.d.bar', props: { categories, series: first } }
    case 'pie':
      return { id, type: 'tls.d.pie', props: { categories, values: first.map((v) => Number(v) || 0) } }
    case 'donut':
      return { id, type: 'tls.d.donut', props: { slices: first.map((v, i) => ({ value: Number(v) || 0, color: ROLES[i % ROLES.length], label: categories[i] })), total: first.reduce<number>((a, v) => a + (Number(v) || 0), 0) || 100 } }
    default:
      return { id, type: `tls.d.${kind}`, props: { categories, series: named } }
  }
}

/* ── motion (RVM3) ────────────────────────────────────────────────────────────────────── */

/**
 * What a leaf of the embedded chart is, for motion: a mark that grows, draws or sweeps, a label that
 * waits for its mark, or the frame (gridlines, ticks, categories, legend) that rides the block fade.
 * The names are the `tls.d.*` layouts' own part names.
 */
export function chartRole(part: string): 'bar' | 'seg' | 'line' | 'area' | 'slice' | 'dot' | 'label' | 'frame' {
  if (/^bar\[\d+\](\[\d+\])?$/.test(part)) return 'bar'
  if (/^seg\[\d+\]\[\d+\]$/.test(part)) return 'seg'
  if (/^(series\[\d+\](\.seg\[\d+\])?|area\[\d+\]\.edge)$/.test(part)) return 'line'
  if (/^area\[\d+\]$/.test(part)) return 'area'
  if (/^slice\[\d+\]$/.test(part)) return 'slice'
  if (/\.dot\[\d+\]$/.test(part)) return 'dot'
  if (/(\.value|\.pct|\.leader)$|^(total|label)\[\d+\]$|^centre/.test(part)) return 'label'
  return 'frame'
}

/**
 * `composeFlat`, except that the `chart` piece keeps what each of its leaves is: frame leaves are
 * `chart[i]` as before, marks and labels `chart[<role>][i]` (`chart[bar][0]`, `chart[line][0]`,
 * `chart[label][2]`…), so the composite's recipe can grow, draw or sweep the marks and hold the
 * labels back (`chartMotion`). Every name still starts with `chart[`.
 */
export function composeWithChart(ctx: LayoutContext, pieces: Piece[], height: number): LayoutNode {
  const at = pieces.findIndex((p) => p.id === 'chart' && p.spec !== undefined)
  if (at < 0) return composeFlat(ctx, pieces, height)
  const rootNode = composeFlat(ctx, pieces.filter((_, i) => i !== at), height)
  if (rootNode.k !== 'group') return rootNode
  const piece = pieces[at]
  const box = { ...piece.box, width: Math.max(0, piece.box.width || 0), height: Math.max(0, piece.box.height || 0) }
  const counts = new Map<string, number>()
  const leaves = flattenNode(ctx.layoutChild(piece.spec as BlockSpec, box), 0, 0, rootNode.box).map((n) => {
    const role = chartRole(n.part ?? '')
    const i = counts.get(role) ?? 0
    counts.set(role, i + 1)
    return { ...n, part: role === 'frame' ? `chart[${i}]` : `chart[${role}][${i}]` } as LayoutNode
  })
  // paint order: the chart's leaves go where its piece was
  const before = new Set(pieces.slice(0, at).map((p) => p.group ?? p.id))
  const base = (part?: string) => (part ?? '').replace(/\[.*$/, '')
  let k = 0
  while (k < rootNode.children.length && before.has(base(rootNode.children[k].part))) k++
  return { ...rootNode, children: [...rootNode.children.slice(0, k), ...leaves, ...rootNode.children.slice(k)] }
}

/** The recipe parts and part motion for a chart composed by `composeWithChart`, its marks starting
 *  at `at` ms: bars grow from the zero line, lines draw on, slices sweep from 12 o'clock, then dots
 *  and labels. */
export function chartMotion(at: number): { parts: string[]; partMotion: NonNullable<MotionRecipe['partMotion']> } {
  return {
    parts: ['chart[bar][*]', 'chart[seg][*]', 'chart[line][*]', 'chart[area][*]', 'chart[slice][*]', 'chart[dot][*]', 'chart[label][*]'],
    partMotion: {
      'chart[bar][*]': { preset: 'grow-bars-y', delay: at, stagger: MARK_STAGGER },
      'chart[seg][*]': { preset: 'grow-segments', delay: at, stagger: 80 },
      'chart[line][*]': { preset: 'draw-path', delay: at, stagger: MARK_STAGGER },
      'chart[area][*]': { preset: 'wipe-x', delay: at, stagger: MARK_STAGGER },
      'chart[slice][*]': { preset: 'sweep', delay: at, stagger: 0 },
      'chart[dot][*]': { preset: 'field-in', delay: at + LABEL_AFTER + 40, stagger: 30 },
      'chart[label][*]': { preset: 'sweep-nodes', delay: at + LABEL_AFTER + 60, stagger: MARK_STAGGER },
    },
  }
}
