/**
 * tls.d.pie — pie of slices with labels and percentages outside the slices (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity, lint } from './layout'
import { motion } from './motion'

export const tlsDPie: BlockDefinition = {
  type: 'tls.d.pie',
  name: 'Pie Chart',
  family: 'data',
  tier: 'A',
  summary: 'Pie of up to six slices with outside, inside or legend labels and percentages.',
  keywords: ['pie', 'share', 'proportion', 'whole', 'percent', 'chart'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Pie of slices with labels and percentages outside the slices',
  related: ['tls.d.donut', 'tls.d.bar', 'tls.d.stacked-bar'],
  describe: {
    when: 'Share of a whole with up to 6 parts.',
    avoid: 'Similar-sized shares (use tls.d.bar); a ring with a centre number (use tls.d.donut).',
    example: {
      id: 'b_pie',
      type: 'tls.d.pie',
      props: { categories: ['Direct', 'Partners', 'Online'], values: [50, 30, 20] },
    },
  },
  schema,
  defaults,
  size: { preferred: [760, 460], min: [260, 200] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
  lint: lint as BlockDefinition['lint'],
}
