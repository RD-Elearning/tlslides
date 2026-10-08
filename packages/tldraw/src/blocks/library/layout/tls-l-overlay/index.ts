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
import { tile } from '../_example'

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
    when:
      'Container: layer child blocks (props.children) in the same box, last on top, over a filled surface. Use for text on a panel, a badge on a photo or a background plus content.',
    avoid: 'Do not use for sequential layout (use tls.l.stack or tls.l.row) or for a plain background fill (use tls.l.field).',
    example: {
      id: 'b_overlay',
      type: 'tls.l.overlay',
      props: { children: [{ id: 'o1', type: 'tls.l.card', props: {} }, tile('o2', 'Drawn on top of the panel')] },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 360], min: [360, 200] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
