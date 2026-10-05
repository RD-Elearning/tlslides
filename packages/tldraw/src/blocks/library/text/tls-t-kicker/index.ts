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
  category: 'heading',
  scope: 'element',
  shortDescription: 'Small uppercase eyebrow label above a title',
  related: ['tls.t.title', 'tls.t.tags'],
  describe: {
    when: 'Use as a small category or section label above the title.',
    avoid: 'Do not use for the slide title itself (use tls.t.title) or for a sentence of explanation (use tls.t.subtitle).',
    example: {
      id: 'b_kicker',
      type: 'tls.t.kicker',
      props: { text: 'OVERVIEW', case: 'uppercase', tracking: 'wide', marker: false },
    },
  },
  schema,
  defaults,
  size: { preferred: [400, 34], min: [160, 34] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
