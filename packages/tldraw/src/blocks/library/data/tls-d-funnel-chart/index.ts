/**
 * tls.d.funnel-chart — tapering stages sized by value, with drop-off between stages (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDFunnelChart: BlockDefinition = {
  type: 'tls.d.funnel-chart',
  name: 'Funnel Chart',
  family: 'data',
  tier: 'A',
  summary: 'Funnel or bar stages sized by value, with the percentage lost between stages.',
  keywords: ['funnel', 'conversion', 'pipeline', 'stages', 'drop-off', 'sales'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Tapering stages sized by value, with drop-off between stages',
  related: ['tls.d.bar', 'tls.d.waterfall', 'tls.g.funnel'],
  describe: {
    when: 'Conversion pipelines with real numbers.',
    avoid: 'A qualitative funnel without values (use tls.g.funnel).',
    example: {
      id: 'b_funnel',
      type: 'tls.d.funnel-chart',
      props: {
        stages: [
          { label: 'Visits', value: 5000 },
          { label: 'Leads', value: 900 },
          { label: 'Deals', value: 120 },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [760, 440], min: [240, 160] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
