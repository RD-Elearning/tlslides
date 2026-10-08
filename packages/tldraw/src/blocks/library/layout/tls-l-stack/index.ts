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
import { tile } from '../_example'

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
    when:
      "Container: child blocks (props.children) one above the other, full width; sizing 'equal' or 'content'.",
    avoid: 'Horizontal: tls.l.row. Equal cells: tls.l.grid.',
    example: {
      id: 'b_stack',
      type: 'tls.l.stack',
      props: { gap: 'md', children: [tile('c1', 'Claim'), tile('c2', 'Evidence'), tile('c3', 'Next step')] },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 480], min: [360, 320] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
