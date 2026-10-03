/**
 * The chart slot shared by `tls.c.dashboard` and `tls.c.chart-insight`: `{ kind, categories, series }`
 * mapped to the props of the matching `tls.d.<kind>` block. Pure.
 */

import type { BlockSchema, BlockSpec } from '../../types'
import { asArr } from '../data/_chart/kit'

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
