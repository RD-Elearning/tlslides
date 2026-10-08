/**
 * Schema and defaults for tls.d.area — filled areas over ordered categories.
 */

import type { BlockSchema } from '../../../types'
import { categoriesSlot, enumSlot, formatSlot, gridlinesSlot, legendSlot, seriesSlot } from '../_chart/schema-kit'
import type { LineFamilyProps } from '../_chart/line-family'

export const schema: BlockSchema = {
  categories: categoriesSlot(2, 24, 'Ordered x labels (periods).'),
  series: seriesSlot(1, 6),
  mode: enumSlot(['overlap', 'stacked', 'percent'], 'Mode', 'stacked adds series up; percent shows shares.'),
  curve: enumSlot(['linear', 'monotone'], 'Curve'),
  opacity: enumSlot(['soft', 'solid'], 'Fill'),
  gridlines: gridlinesSlot(),
  format: formatSlot(),
  legend: legendSlot(),
}

export interface AreaProps extends LineFamilyProps {
  categories: string[]
  series: Array<{ name: string; values: Array<number | null> }>
}

export const defaults: AreaProps = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Web', values: [30, 34, 41, 45, 52, 60] },
    { name: 'Mobile', values: [18, 24, 28, 36, 44, 53] },
    { name: 'Partners', values: [8, 9, 12, 14, 15, 19] },
  ],
  mode: 'stacked',
  curve: 'monotone',
  opacity: 'soft',
  gridlines: 'major',
}
