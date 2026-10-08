/**
 * tls.d.stacked-bar — bars split into segments that add up to each category total (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDStackedBar: BlockDefinition = {
  type: 'tls.d.stacked-bar',
  name: 'Stacked Bar Chart',
  family: 'data',
  tier: 'A',
  summary: 'Stacked columns or bars with optional 100% scaling and totals.',
  keywords: ['stacked', 'composition', 'total', 'share', 'bar'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Bars split into segments that add up to each category total',
  related: ['tls.d.grouped-bar', 'tls.d.area', 'tls.d.bar'],
  describe: {
    when: 'Composition of a total across categories; with normalize, compare the mix.',
    avoid: 'Comparing individual series values (use tls.d.grouped-bar).',
    example: {
      id: 'b_stacked',
      type: 'tls.d.stacked-bar',
      props: {
        categories: ['2024', '2025'],
        series: [
          { name: 'Product', values: [30, 38] },
          { name: 'Services', values: [18, 26] },
        ],
        totals: true,
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
