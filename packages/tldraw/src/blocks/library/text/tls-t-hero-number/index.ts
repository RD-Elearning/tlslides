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
  describe: {
    when: 'Use for one standout metric ($4.2M, 67%) that anchors a KPI slide.',
    avoid: 'Do not use for multiple metrics in a row — use a grid of hero-numbers instead.',
    example: {
      id: 'b_kpi',
      type: 'tls.t.hero-number',
      props: { value: '$4.2M', unit: 'Annual Revenue', caption: 'FY2024 total', format: 'currency', emphasis: 'accent' },
    },
  },
  schema,
  defaults,
  size: { preferred: [520, 300], min: [200, 120] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
