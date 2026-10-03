/**
 * Schema and defaults for tls.d.grouped-bar — side-by-side bars per category.
 */

import type { BlockSchema } from '../../../types'
import { categoriesSlot, enumSlot, formatSlot, gridlinesSlot, highlightSlot, legendSlot, seriesSlot, valueLabelsSlot } from '../_chart/schema-kit'
import type { BarFamilyProps } from '../_chart/bar-family'

export const schema: BlockSchema = {
  categories: categoriesSlot(2, 12),
  series: seriesSlot(2, 4),
  orientation: enumSlot(['vertical', 'horizontal'], 'Orientation'),
  groupGap: enumSlot(['md', 'sm', 'lg'], 'Group gap'),
  valueLabels: valueLabelsSlot(['none', 'end', 'inside']),
  gridlines: gridlinesSlot(),
  format: formatSlot(),
  legend: legendSlot(),
  highlightIndex: highlightSlot('Category'),
}

export interface GroupedBarProps extends BarFamilyProps {
  categories: string[]
  series: Array<{ name: string; values: Array<number | null> }>
}

export const defaults: GroupedBarProps = {
  categories: ['North', 'South', 'East', 'West'],
  series: [
    { name: '2024', values: [42, 38, 55, 31] },
    { name: '2025', values: [51, 40, 62, 45] },
  ],
  orientation: 'vertical',
  groupGap: 'md',
  valueLabels: 'none',
  gridlines: 'major',
  legend: 'top',
}
