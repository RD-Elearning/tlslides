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
  schema,
  defaults,
  size: { preferred: [700, 400], min: [200, 80] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
