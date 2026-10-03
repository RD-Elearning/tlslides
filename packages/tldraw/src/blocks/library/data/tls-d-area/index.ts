/**
 * tls.d.area — filled areas under lines over time, overlapping or stacked (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDArea: BlockDefinition = {
  type: 'tls.d.area',
  name: 'Area Chart',
  family: 'data',
  tier: 'A',
  summary: 'Area chart: overlapping, stacked or 100% stacked fills over ordered categories on a zero baseline.',
  keywords: ['area', 'stacked', 'volume', 'composition', 'time', 'chart'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Filled areas under lines over time, overlapping or stacked',
  related: ['tls.d.line', 'tls.d.stacked-bar'],
  describe: {
    when: 'Volume over time, composition over time (stacked).',
    avoid: 'Precise comparison of series (use tls.d.line).',
    example: {
      id: 'b_area',
      type: 'tls.d.area',
      props: {
        categories: ['2022', '2023', '2024', '2025'],
        series: [
          { name: 'Web', values: [30, 38, 46, 58] },
          { name: 'Mobile', values: [12, 20, 31, 44] },
        ],
        mode: 'stacked',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [900, 520], min: [260, 180] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
