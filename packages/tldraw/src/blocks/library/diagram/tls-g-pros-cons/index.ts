/**
 * tls.g.pros-cons — advantages and disadvantages in two columns with an optional verdict (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGProsCons: BlockDefinition = {
  type: 'tls.g.pros-cons',
  name: 'Pros and Cons',
  family: 'diagram',
  tier: 'A',
  summary: 'Two columns of advantages and disadvantages with check and cross marks and an optional verdict.',
  keywords: ['pros', 'cons', 'advantages', 'disadvantages', 'trade-offs', 'verdict'],
  category: 'comparison',
  scope: 'group',
  shortDescription: 'Two columns of advantages and disadvantages with check and cross icons',
  related: ['tls.c.comparison', 'tls.g.matrix-2x2', 'tls.g.before-after'],
  describe: {
    when: 'Contrast of one option upsides and downsides, with an optional conclusion.',
    avoid: 'Comparing several options (use tls.c.comparison or tls.d.compare-table).',
    example: {
      id: 'b_pros_cons',
      type: 'tls.g.pros-cons',
      props: {
        pros: ['Faster launch', 'Lower cost'],
        cons: ['Less control'],
        verdict: 'Worth it if speed matters most.',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1100, 560], min: [560, 340] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
