/**
 * tls.l.overlay — layered children (z-stacked).
 *
 * All children fill the full box, layered in document order.
 * Useful for backgrounds, watermarks, and layered compositions.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLOverlay: BlockDefinition = {
  type: 'tls.l.overlay',
  name: 'Overlay',
  family: 'layout',
  tier: 'A',
  summary: 'Layered children z-stacked in the same box.',
  keywords: ['overlay', 'layer', 'stack', 'z-index'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Children layered on top of each other in one box',
  related: ['tls.l.field'],
  describe: {
    when: 'Use to layer children on top of each other (backgrounds, watermarks).',
    avoid: 'Do not use for sequential layout (use tls.l.stack or tls.l.row) or for a plain background fill (use tls.l.field).',
    example: {
      id: 'b_overlay',
      type: 'tls.l.overlay',
      props: {},
      children: [],
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
