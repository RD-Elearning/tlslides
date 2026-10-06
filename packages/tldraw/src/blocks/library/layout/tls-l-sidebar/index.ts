/**
 * tls.l.sidebar — sidebar + main content.
 *
 * Splits the box into a sidebar of fixed width and a main content area.
 * The sidebar can be placed on the start (left) or end (right) side.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'
import { tile } from '../_example'

export const tlsLSidebar: BlockDefinition = {
  type: 'tls.l.sidebar',
  name: 'Sidebar',
  family: 'layout',
  tier: 'A',
  summary: 'Sidebar + main content layout with configurable width and side.',
  keywords: ['sidebar', 'panel', 'navigation', 'two-column'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Narrow side column next to a main content area',
  related: ['tls.l.split'],
  describe: {
    when:
      'Container: children [side, main]: a fixed-width column (sidebarWidth) beside the main area.',
    avoid: 'Do not use for equal-width columns (use tls.l.split or tls.l.grid).',
    example: {
      id: 'b_sidebar',
      type: 'tls.l.sidebar',
      props: { sidebarWidth: 320, gutter: 'md', sidebarSide: 'start', children: [tile('c1', 'Sidebar'), tile('c2', 'Main content')] },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 360], min: [480, 200] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
