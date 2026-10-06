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
import { tile } from '../_example'

export const tlsLRow: BlockDefinition = {
  type: 'tls.l.row',
  name: 'Row',
  family: 'layout',
  tier: 'A',
  summary: 'Horizontal row with gap.',
  keywords: ['row', 'horizontal', 'inline', 'gap'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Horizontal row of child blocks with a gap',
  related: ['tls.l.stack', 'tls.l.grid'],
  describe: {
    when:
      "Container: 2-4 child blocks (props.children) side by side; sizing 'equal' or 'content'.",
    avoid: 'Do not use for vertical arrangement (use tls.l.stack) or for more than a few equal cells (use tls.l.grid).',
    example: {
      id: 'b_row',
      type: 'tls.l.row',
      props: { gap: 'md', children: [tile('c1', 'Problem'), tile('c2', 'Approach'), tile('c3', 'Result')] },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 300], min: [480, 140] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
