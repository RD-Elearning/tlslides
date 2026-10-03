/**
 * Schema and defaults for tls.d.stacked-bar — segments that add up to a category total.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, categoriesSlot, enumSlot, formatSlot, gridlinesSlot, highlightSlot, legendSlot, seriesSlot, valueLabelsSlot } from '../_chart/schema-kit'
import type { BarFamilyProps } from '../_chart/bar-family'

export const schema: BlockSchema = {
  categories: categoriesSlot(2, 12),
  series: seriesSlot(2, 6),
  orientation: enumSlot(['vertical', 'horizontal'], 'Orientation'),
  normalize: boolSlot('100% stacked'),
  totals: boolSlot('Show totals'),
  valueLabels: valueLabelsSlot(['none', 'inside']),
  gridlines: gridlinesSlot(),
  format: formatSlot(),
  legend: legendSlot(),
  highlightIndex: highlightSlot('Category'),
}

export interface StackedBarProps extends BarFamilyProps {
  categories: string[]
  series: Array<{ name: string; values: Array<number | null> }>
}

export const defaults: StackedBarProps = {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: 'Product', values: [30, 34, 38, 45] },
    { name: 'Services', values: [18, 20, 26, 28] },
    { name: 'Support', values: [8, 9, 10, 12] },
  ],
  orientation: 'vertical',
  normalize: false,
  totals: true,
  valueLabels: 'none',
  gridlines: 'major',
  legend: 'top',
}
