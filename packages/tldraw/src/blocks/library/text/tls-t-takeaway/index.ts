/**
 * tls.t.takeaway — highlighted insight text / callout box.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTTakeaway: BlockDefinition = {
  type: 'tls.t.takeaway',
  name: 'Takeaway',
  family: 'text',
  tier: 'A',
  summary: 'Highlighted insight text with accent bar and optional label.',
  keywords: ['takeaway', 'insight', 'callout', 'highlight', 'key-point'],
  schema,
  defaults,
  size: { preferred: [800, 200], min: [300, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
