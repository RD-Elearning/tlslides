/**
 * tls.l.row — horizontal row with gap.
 *
 * Distributes child blocks horizontally, each spanning the full height,
 * separated by a configurable gap token.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLRow: BlockDefinition = {
  type: 'tls.l.row',
  name: 'Row',
  family: 'layout',
  tier: 'A',
  summary: 'Horizontal row with gap.',
  keywords: ['row', 'horizontal', 'inline', 'gap'],
  describe: {
    when: 'Use to arrange child blocks horizontally, side by side.',
    avoid: 'Do not use for vertical arrangement — use tls.l.stack instead.',
    example: {
      id: 'b_row',
      type: 'tls.l.row',
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
