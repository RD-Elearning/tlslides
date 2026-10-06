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
  category: 'metric',
  scope: 'element',
  shortDescription: 'One oversized number with unit and caption, no frame',
  related: ['tls.c.kpi-tile', 'tls.c.big-stat'],
  describe: {
    when: 'Use for one standout metric ($4.2M, 67%) that anchors a KPI slide.',
    avoid: 'Do not use for several metrics in a row (use tls.c.kpi-row), for a number with a change arrow or sparkline (use tls.c.kpi-tile), or when the number should fill the whole slide (use tls.c.big-stat).',
    example: {
      id: 'b_kpi',
      type: 'tls.t.hero-number',
      props: { value: '$4.2M', unit: 'Annual Revenue', caption: 'FY2024 total', format: 'currency', emphasis: 'accent' },
    },
  },
  schema,
  defaults,
  size: { preferred: [520, 330], min: [260, 300] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
