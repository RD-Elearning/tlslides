/**
 * Schema and defaults for tls.d.bar — vertical column chart (Tier A).
 *
 * Baseline is always zero (04 §4.8). NaN/null values are omitted with a note,
 * never silently coerced to zero.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  categories: {
    type: { kind: 'list', of: { kind: 'text' }, min: 1, max: 20 },
    role: 'content',
    label: 'Categories',
    help: 'Category labels along the X axis.',
    required: true,
  },
  series: {
    type: { kind: 'series', value: 'number', label: 'text', max: 6 },
    role: 'content',
    label: 'Data series',
    help: 'Numeric values for each bar. Use null/NaN for missing data.',
    required: true,
  },
  highlightIndex: {
    type: { kind: 'number', min: -1 },
    role: 'option',
    label: 'Highlight index',
    help: 'Index of the bar to highlight with accent color. -1 = none.',
  },
  title: {
    type: { kind: 'text', maxChars: 120 },
    role: 'content',
    label: 'Title',
    help: 'Chart title, shown above the chart area.',
  },
}

/**
 * Props interface for tls.d.bar.
 */
export interface BarChartProps extends Record<string, unknown> {
  /** Category labels along the X axis. */
  categories: string[]
  /** Numeric values for each bar. One value per category. */
  series: Array<number | null | undefined>
  /** Index of the bar to highlight. -1 = none (default). */
  highlightIndex?: number
  /** Optional chart title. */
  title?: string
}

/**
 * Default bar chart props — a good-looking 4-bar chart with no highlight.
 */
export const defaults: BarChartProps = {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [42, 78, 55, 91],
  highlightIndex: -1,
  title: '',
}
