/**
 * tls.l.section — titled section.
 *
 * Renders a section title with a divider line, then lays out children
 * in the remaining space.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLSection: BlockDefinition = {
  type: 'tls.l.section',
  name: 'Section',
  family: 'layout',
  tier: 'A',
  summary: 'Titled section with divider and content area.',
  keywords: ['section', 'title', 'heading', 'divider'],
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
