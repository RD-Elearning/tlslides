/**
 * tls.d.line — lines over ordered categories, one per series, labelled at the line ends (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDLine: BlockDefinition = {
  type: 'tls.d.line',
  name: 'Line Chart',
  family: 'data',
  tier: 'A',
  summary: 'Line chart with one line per series, labelled at the line ends.',
  keywords: ['line', 'trend', 'time', 'series', 'chart', 'over time'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Lines over ordered categories, one per series, labelled at the line ends',
  related: ['tls.d.bar', 'tls.d.area', 'tls.d.slope'],
  describe: {
    when: 'Change over time, trends, comparing trajectories.',
    avoid: 'Unordered categories (use tls.d.bar); only two time points (use tls.d.slope).',
    example: {
      id: 'b_line',
      type: 'tls.d.line',
      props: {
        categories: ['Q1', 'Q2', 'Q3', 'Q4'],
        series: [
          { name: 'Users', values: [12, 18, 27, 40] },
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
