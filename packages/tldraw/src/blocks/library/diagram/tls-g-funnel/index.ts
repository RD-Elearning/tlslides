/**
 * tls.g.funnel — narrowing stages from broad to focused, a note per stage (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGFunnel: BlockDefinition = {
  type: 'tls.g.funnel',
  name: 'Funnel',
  family: 'diagram',
  tier: 'A',
  summary: 'Narrowing stages from broad to focused, with a note per stage and no numbers.',
  keywords: ['funnel', 'stages', 'narrowing', 'selection', 'pipeline'],
  category: 'process',
  scope: 'group',
  shortDescription: 'Narrowing stages from broad to focused, with a note per stage',
  related: ['tls.d.funnel-chart', 'tls.g.chevrons', 'tls.g.pyramid'],
  describe: {
    when: 'Order with narrowing: marketing funnel, selection process (no numbers).',
    avoid: 'Funnels with real values (use tls.d.funnel-chart).',
    example: {
      id: 'b_funnel_g',
      type: 'tls.g.funnel',
      props: {
        stages: [
          { label: 'Aware', text: 'People who hear about us' },
          { label: 'Interested', text: 'Visit and read' },
          { label: 'Customer', text: 'Pay and stay' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1000, 520], min: [520, 320] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
