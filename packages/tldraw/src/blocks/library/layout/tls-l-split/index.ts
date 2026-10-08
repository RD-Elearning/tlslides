/**
 * tls.l.split — two-panel split with ratio/gutter.
 *
 * Divides the box into two panels along an axis, with configurable
 * ratio and gutter spacing.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'
import { tile } from '../_example'

export const tlsLSplit: BlockDefinition = {
  type: 'tls.l.split',
  name: 'Split',
  family: 'layout',
  tier: 'A',
  summary: 'Two-panel split with configurable ratio and gutter.',
  keywords: ['split', 'columns', 'two-panel', 'sidebar'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Two panes side by side or stacked, with an adjustable ratio',
  related: ['tls.l.sidebar'],
  describe: {
    when:
      "Container: two child blocks (props.children, exactly two) side by side (axis 'x') or stacked (axis 'y'), divided by ratio (0.5 = halves) with a gutter.",
    avoid: 'Do not use for three or more panels (use tls.l.grid) or for a narrow fixed-width side column (use tls.l.sidebar).',
    example: {
      id: 'b_split',
      type: 'tls.l.split',
      props: { ratio: 0.5, gutter: 'md', axis: 'x', children: [tile('b_split_1', 'Question'), tile('b_split_2', 'Answer')] },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 360], min: [400, 200] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
