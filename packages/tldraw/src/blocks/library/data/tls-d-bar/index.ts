/**
 * tls.d.bar — vertical column chart (Tier A).
 *
 * Baseline is always zero. Single series uses `accent`, not `categorical[0]`.
 * NaN/null values are omitted with a gap marker, never silently coerced to zero.
 * At most 6 hues (04 §4.8).
 *
 * Leaves the seam for donut/line but does not implement them.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsDBar: BlockDefinition = {
  type: 'tls.d.bar',
  name: 'Column Chart',
  family: 'data',
  tier: 'A',
  summary: 'Vertical column chart with zero baseline.',
  keywords: ['chart', 'bar', 'column', 'data', 'graph', 'vertical'],
  schema,
  defaults,
  size: { preferred: [800, 500], min: [200, 150] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
