/**
 * tls.t.tags — row of pill-shaped tags or chips that wraps onto new lines.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsTTags: BlockDefinition = {
  type: 'tls.t.tags',
  name: 'Tags',
  family: 'text',
  tier: 'A',
  summary: 'Wrapping row of pill-shaped tags in soft, outline or solid tone.',
  keywords: ['tags', 'chips', 'pills', 'skills', 'keywords', 'labels'],
  category: 'list',
  scope: 'element',
  shortDescription: 'Row of pill-shaped tags or chips that wraps onto new lines',
  related: ['tls.t.bullets', 'tls.t.kicker'],
  describe: {
    when: 'Skills, technologies, keywords, categories, labels on a profile.',
    avoid: 'Sentences (use tls.t.bullets); a single eyebrow label (use tls.t.kicker).',
    example: {
      id: 'b_tags',
      type: 'tls.t.tags',
      props: { items: ['Python', 'SQL', 'Statistics', 'Dashboards'], tone: 'soft', colorBy: 'cycle' },
    },
  },
  schema,
  defaults,
  size: { preferred: [900, 140], min: [460, 140] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
