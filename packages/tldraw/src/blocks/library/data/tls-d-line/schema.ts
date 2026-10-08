/**
 * Schema and defaults for tls.d.line — lines over ordered categories.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, categoriesSlot, enumSlot, formatSlot, gridlinesSlot, highlightSlot, legendSlot, seriesSlot } from '../_chart/schema-kit'
import type { LineFamilyProps } from '../_chart/line-family'

export const schema: BlockSchema = {
  categories: categoriesSlot(2, 24, 'Ordered x labels.'),
  series: seriesSlot(1, 6, 'One line each; null = gap.'),
  curve: enumSlot(['linear', 'monotone'], 'Curve'),
  markers: enumSlot(['none', 'last', 'all'], 'Markers'),
  endLabels: boolSlot('End labels', 'Replaces the legend.'),
  baseline: enumSlot(['auto', 'zero'], 'Baseline'),
  gridlines: gridlinesSlot(),
  format: formatSlot(),
  legend: legendSlot(),
  highlightIndex: highlightSlot('Series'),
}

export interface LineProps extends LineFamilyProps {
  categories: string[]
  series: Array<{ name: string; values: Array<number | null> }>
}

export const defaults: LineProps = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Revenue', values: [42, 48, 55, 61, 70, 82] },
    { name: 'Costs', values: [38, 41, 45, 47, 52, 55] },
  ],
  curve: 'linear',
  markers: 'last',
  endLabels: true,
  baseline: 'auto',
  gridlines: 'major',
}
