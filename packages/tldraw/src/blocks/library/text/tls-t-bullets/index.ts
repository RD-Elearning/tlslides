/**
 * tls.t.bullets — bullet list.
 *
 * Uses the existing list marker system from blocks/layout/lists.ts
 * (dot/dash/chevron/number markers and indent levels). Each item
 * gets per-item part names for staggered reveal animation.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTBullets: BlockDefinition = {
  type: 'tls.t.bullets',
  name: 'Bullet list',
  family: 'text',
  tier: 'A',
  summary: 'Bullet list with dot/dash/chevron/number markers and indent levels.',
  keywords: ['bullets', 'list', 'items', 'points', 'markers', 'unordered'],
  describe: {
    when: 'Use for 2–8 short items that the audience should scan, not read.',
    avoid: 'Do not use for sentences of prose — use tls.t.body. More than 8 items means two slides.',
    example: {
      id: 'b_bullets',
      type: 'tls.t.bullets',
      props: {
        items: [
          { text: 'Revenue up 42% YoY' },
          { text: 'Enterprise APAC drove growth' },
          { text: 'Churn fell to 3.1%' },
        ],
        marker: 'dot',
        spacing: 'sm',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [700, 400], min: [200, 80] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
