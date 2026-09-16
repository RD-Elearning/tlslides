/**
 * tls.l.footer — content + footer.
 *
 * Splits the box vertically into a main content area and a footer,
 * with configurable footer height and gutter.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLFooter: BlockDefinition = {
  type: 'tls.l.footer',
  name: 'Footer',
  family: 'layout',
  tier: 'A',
  summary: 'Content + footer layout with configurable footer height.',
  keywords: ['footer', 'bottom', 'content', 'page'],
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
