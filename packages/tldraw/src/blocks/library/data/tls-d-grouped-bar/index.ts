/**
 * tls.d.grouped-bar — side-by-side bars per category, one colour per series (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDGroupedBar: BlockDefinition = {
  type: 'tls.d.grouped-bar',
  name: 'Grouped Bar Chart',
  family: 'data',
  tier: 'A',
  summary: 'Side-by-side columns or bars per category, one colour per series, zero baseline.',
  keywords: ['grouped', 'clustered', 'bar', 'column', 'compare', 'series', 'chart'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Side-by-side bars per category, one colour per series',
  related: ['tls.d.bar', 'tls.d.stacked-bar', 'tls.d.line'],
  describe: {
    when: 'Comparing 2-4 series across categories (region by year).',
    avoid: 'One series (use tls.d.bar); parts of a total (use tls.d.stacked-bar).',
    example: {
      id: 'b_grouped',
      type: 'tls.d.grouped-bar',
      props: {
        categories: ['EMEA', 'APAC', 'AMER'],
        series: [
          { name: '2024', values: [42, 38, 55] },
          { name: '2025', values: [51, 47, 62] },
        ],
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
