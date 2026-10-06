/**
 * tls.d.radar — spider chart comparing series across radial axes (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDRadar: BlockDefinition = {
  type: 'tls.d.radar',
  name: 'Radar Chart',
  family: 'data',
  tier: 'A',
  summary: 'Spider chart: up to three shapes over three to eight axes, with grid rings and values.',
  keywords: ['radar', 'spider', 'profile', 'skills', 'scores', 'criteria'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Spider chart comparing series across radial axes',
  related: ['tls.d.grouped-bar', 'tls.d.bar', 'tls.d.compare-table'],
  describe: {
    when: 'Profiles on several criteria (skills, product scores).',
    avoid: 'More than 3 series or 8 axes (use tls.d.compare-table); exact values (use tls.d.grouped-bar).',
    example: {
      id: 'b_radar',
      type: 'tls.d.radar',
      props: {
        axes: ['Speed', 'Cost', 'Quality', 'Support'],
        series: [{ name: 'Ours', values: [8, 6, 9, 7] }],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [680, 500], min: [350, 270] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
