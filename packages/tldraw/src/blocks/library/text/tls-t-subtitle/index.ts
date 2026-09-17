/**
 * tls.t.subtitle — subtitle / secondary heading.
 *
 * Renders a secondary heading text, smaller than the title. Supports rich text
 * (inline bold/italic runs), alignment, and optional color override.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTSubtitle: BlockDefinition = {
  type: 'tls.t.subtitle',
  name: 'Subtitle',
  family: 'text',
  tier: 'A',
  summary: 'Secondary heading below the title, with inline styling.',
  keywords: ['subtitle', 'secondary', 'subheading', 'supporting'],
  schema,
  defaults,
  size: { preferred: [800, 60], min: [200, 30] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
