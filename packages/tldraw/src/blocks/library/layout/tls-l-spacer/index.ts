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
  category: 'structure',
  scope: 'element',
  shortDescription: 'Empty gap between neighbouring blocks',
  describe: {
    when:
      'Invisible structural gap (no children, draws nothing): reserve empty space of a chosen size between neighbouring blocks. It looks empty in the gallery by design.',
    avoid: 'Do not use when the gap of a stack or row already provides the spacing.',
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
