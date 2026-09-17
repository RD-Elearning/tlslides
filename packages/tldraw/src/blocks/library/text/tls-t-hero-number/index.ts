/**
 * tls.t.hero-number — large KPI number (e.g. "$4.2M", "67%").
 *
 * Default motion is `count-up`, already in B2's MOTION_PRESETS.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTHeroNumber: BlockDefinition = {
  type: 'tls.t.hero-number',
  name: 'Hero Number',
  family: 'text',
  tier: 'A',
  summary: 'Large KPI number with optional unit and caption.',
  keywords: ['kpi', 'number', 'stat', 'metric', 'hero', 'display', 'count'],
  schema,
  defaults,
  size: { preferred: [520, 300], min: [200, 120] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
