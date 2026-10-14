/**
 * tls.d.gauge — half-circle dial with coloured bands and a needle at the current value (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDGauge: BlockDefinition = {
  type: 'tls.d.gauge',
  name: 'Gauge',
  family: 'data',
  tier: 'A',
  summary: 'Half-circle dial: threshold bands, a needle or marker at the value, tick labels.',
  keywords: ['gauge', 'dial', 'score', 'nps', 'threshold', 'health', 'risk'],
  category: 'metric',
  scope: 'element',
  shortDescription: 'Half-circle dial with coloured bands and a needle at the current value',
  related: ['tls.d.progress-ring', 'tls.d.progress-bar'],
  describe: {
    when: 'A score against thresholds (NPS, health, risk level).',
    avoid: 'Plain completion with no thresholds (use tls.d.progress-ring). By default prefer tls.c.stat-spotlight.',
    example: {
      id: 'b_gauge',
      type: 'tls.d.gauge',
      props: {
        value: 42,
        min: -100,
        max: 100,
        label: 'NPS',
        bands: [
          { to: 0, tone: 'negative' },
          { to: 50, tone: 'warning' },
          { to: 100, tone: 'positive' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [560, 380], min: [220, 160] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
