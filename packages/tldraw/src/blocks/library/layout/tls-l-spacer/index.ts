/**
 * tls.l.spacer — empty space.
 *
 * A structural filler that occupies its box without rendering anything.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLSpacer: BlockDefinition = {
  type: 'tls.l.spacer',
  name: 'Spacer',
  family: 'layout',
  tier: 'A',
  summary: 'Empty space for structural separation.',
  keywords: ['spacer', 'empty', 'gap', 'fill'],
  describe: {
    when: 'Use to push other blocks apart with intentional empty space.',
    avoid: 'Do not use when the gap property on a stack/row already provides spacing.',
    example: {
      id: 'b_spacer',
      type: 'tls.l.spacer',
      props: {},
    },
  },
  schema,
  defaults,
  size: { preferred: [200, 200], min: [10, 10] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
