/**
 * tls.d.compare-table — feature matrix of options against criteria.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDCompareTable: BlockDefinition = {
  type: 'tls.d.compare-table',
  name: 'Comparison Table',
  family: 'data',
  tier: 'A',
  summary: 'Options as columns, criteria as rows, with ticks, crosses or dot ratings and a highlighted winner.',
  keywords: ['compare', 'matrix', 'features', 'competitors', 'versus', 'tick', 'rating'],
  category: 'comparison',
  scope: 'group',
  shortDescription: 'Feature matrix of options against criteria, ticks, crosses or ratings',
  related: ['tls.d.table', 'tls.d.pricing', 'tls.d.radar', 'tls.c.comparison', 'tls.g.pros-cons'],
  describe: {
    when: 'Us vs competitors, plan features, tool selection.',
    avoid: 'Free-form pros and cons (tls.c.comparison). Prices: tls.d.pricing.',
    example: {
      id: 'b_compare',
      type: 'tls.d.compare-table',
      props: {
        options: ['Ours', 'Rival'],
        criteria: ['Offline mode', 'Open API', 'SSO'],
        cells: [['yes', 'no'], ['yes', 'partial'], ['yes', 'yes']],
        winner: 0,
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1100, 520], min: [320, 160] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
