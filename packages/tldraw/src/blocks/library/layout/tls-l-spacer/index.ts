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
  schema,
  defaults,
  size: { preferred: [200, 200], min: [10, 10] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
