/**
 * tls.t.kicker — kicker / eyebrow label.
 *
 * Small label above the title (e.g. "OVERVIEW", "Q3 RESULTS"). Supports text
 * case transformation, letter spacing, and an optional leading accent marker.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTKicker: BlockDefinition = {
  type: 'tls.t.kicker',
  name: 'Kicker',
  family: 'text',
  tier: 'A',
  summary: 'Small label above the title with case and tracking options.',
  keywords: ['kicker', 'eyebrow', 'label', 'category', 'tag', 'section'],
  schema,
  defaults,
  size: { preferred: [400, 30], min: [100, 16] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
