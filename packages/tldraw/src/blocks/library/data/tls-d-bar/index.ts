/**
 * tls.d.bar — column chart, or horizontal bar chart with `orientation` (Tier A).
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
  summary: 'Column or horizontal bar chart of one series on a zero baseline, with gridlines and an optional highlighted bar.',
  keywords: ['chart', 'bar', 'column', 'data', 'graph', 'vertical', 'horizontal'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Column or horizontal bar chart of one series',
  related: ['tls.d.donut', 'tls.d.line', 'tls.d.grouped-bar', 'tls.d.ranking'],
  describe: {
    when: 'Use to compare values across categories — 1–20 bars, single series. Set orientation to horizontal when category labels are long.',
    avoid: 'Do not use for parts of a whole (use tls.d.donut), for several series, or for a single headline number (use tls.t.hero-number).',
    example: {
      id: 'b_bar',
      type: 'tls.d.bar',
      props: { categories: ['Q1', 'Q2', 'Q3'], series: [64, 64, 61], highlightIndex: 2, title: 'Revenue by Quarter' },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 500], min: [200, 150] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
