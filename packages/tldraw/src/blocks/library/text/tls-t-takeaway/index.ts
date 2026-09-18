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
  describe: {
    when: 'Use to call out a key insight, conclusion, or "so what" from data.',
    avoid: 'Do not use for quotes from named people — use tls.t.quote instead.',
    example: {
      id: 'b_take',
      type: 'tls.t.takeaway',
      props: {
        text: 'Compute spend grew 2.4x while revenue grew 1.2x.',
        tone: 'accent',
        label: 'Key Insight',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 200], min: [300, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
