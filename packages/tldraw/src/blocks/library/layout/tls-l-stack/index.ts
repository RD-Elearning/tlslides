/**
 * tls.l.stack — vertical stack with gap.
 *
 * Distributes child blocks vertically, each spanning the full width,
 * separated by a configurable gap token.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLStack: BlockDefinition = {
  type: 'tls.l.stack',
  name: 'Stack',
  family: 'layout',
  tier: 'A',
  summary: 'Vertical stack with gap.',
  keywords: ['stack', 'vertical', 'column', 'gap'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Vertical stack of child blocks with a gap',
  related: ['tls.l.row', 'tls.l.grid'],
  describe: {
    when: 'Use to arrange child blocks vertically, one above the other.',
    avoid: 'Do not use for horizontal arrangement (use tls.l.row) or for a grid of equal cells (use tls.l.grid).',
    example: {
      id: 'b_stack',
      type: 'tls.l.stack',
      props: { gap: 'md' },
      children: [],
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
