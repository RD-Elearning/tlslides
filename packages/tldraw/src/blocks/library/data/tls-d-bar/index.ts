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
    when: 'Compare one measure across 2-12 categories. Horizontal orientation suits long labels; highlightIndex marks one bar.',
    avoid: 'Parts of a whole (use tls.d.pie); several series (use tls.d.grouped-bar); a trend over time (use tls.d.line); one number (use tls.t.hero-number).',
    example: {
      id: 'b_bar',
      type: 'tls.d.bar',
      props: { categories: ['Q1', 'Q2', 'Q3', 'Q4'], series: [42, 58, 71, 89], highlightIndex: 3, title: 'Revenue by quarter ($M)' },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 500], min: [320, 240] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
