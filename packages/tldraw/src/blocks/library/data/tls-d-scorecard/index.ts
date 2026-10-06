/**
 * tls.d.scorecard — metric rows with value, target and a red / amber / green status.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDScorecard: BlockDefinition = {
  type: 'tls.d.scorecard',
  name: 'Scorecard',
  family: 'data',
  tier: 'A',
  summary: 'Metric rows with the actual value, a target, and a green / amber / red status.',
  keywords: ['scorecard', 'okr', 'kpi review', 'status', 'rag', 'health', 'sla'],
  category: 'table',
  scope: 'group',
  shortDescription: 'Metric rows with value, target and a red/amber/green status',
  related: ['tls.d.table', 'tls.d.bullet-chart', 'tls.d.progress-bar'],
  describe: {
    when: 'OKR reviews, project health, SLA reports.',
    avoid: 'Raw data tables (tls.d.table). One metric: tls.c.kpi-tile.',
    example: {
      id: 'b_scorecard',
      type: 'tls.d.scorecard',
      props: {
        items: [
          { label: 'Revenue', value: '$4.2M', target: '$4.0M', status: 'good', note: 'Early close' },
          { label: 'Churn', value: '3.1%', target: '2.5%', status: 'watch', note: 'SMB tier' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 440], min: [500, 240] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
