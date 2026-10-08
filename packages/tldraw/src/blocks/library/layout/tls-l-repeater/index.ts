/**
 * tls.l.repeater — repeats template for each item.
 *
 * Lays out a template child `count` times in a given direction,
 * with configurable gap. Falls back to placeholder rects when no
 * template is provided.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'
import { tile } from '../_example'

export const tlsLRepeater: BlockDefinition = {
  type: 'tls.l.repeater',
  name: 'Repeater',
  family: 'layout',
  tier: 'A',
  summary: 'Repeats a template child for each item in a given direction.',
  keywords: ['repeater', 'repeat', 'loop', 'list'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Repeats one template child once per data item',
  related: ['tls.l.grid'],
  describe: {
    when:
      "Container: repeat ONE template child (props.children[0]) count times in a column (direction 'y') or row ('x'). Use for N identical tiles; without a template it draws placeholder panels.",
    avoid: 'Do not use when the children differ from each other (use tls.l.stack or tls.l.grid).',
    example: {
      id: 'b_rep',
      type: 'tls.l.repeater',
      props: { count: 3, direction: 'y', gap: 'sm', children: [tile('b_rep_1', 'Repeated item')] },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 420], min: [360, 310] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
