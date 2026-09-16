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

export const tlsLSidebar: BlockDefinition = {
  type: 'tls.l.sidebar',
  name: 'Sidebar',
  family: 'layout',
  tier: 'A',
  summary: 'Sidebar + main content layout with configurable width and side.',
  keywords: ['sidebar', 'panel', 'navigation', 'two-column'],
  schema,
  defaults,
  size: { preferred: [800, 600], min: [200, 200] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
