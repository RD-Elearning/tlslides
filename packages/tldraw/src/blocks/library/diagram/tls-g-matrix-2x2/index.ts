/**
 * tls.g.matrix-2x2 — two-by-two quadrant grid with axis labels and optional plotted items (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGMatrix2x2: BlockDefinition = {
  type: 'tls.g.matrix-2x2',
  name: '2x2 Matrix',
  family: 'diagram',
  tier: 'A',
  summary: 'Two-by-two quadrant grid with labelled axes and optional plotted points.',
  keywords: ['matrix', '2x2', 'quadrant', 'prioritisation'],
  category: 'comparison',
  scope: 'group',
  shortDescription: 'Two-by-two quadrant grid with axis labels and optional plotted items',
  related: ['tls.d.scatter', 'tls.d.compare-table'],
  describe: {
    when: 'Contrast on two dimensions: effort/impact, urgent/important, BCG.',
    avoid: 'Many numeric points (use tls.d.scatter); SWOT (use tls.g.swot).',
    example: {
      id: 'b_matrix',
      type: 'tls.g.matrix-2x2',
      props: {
        xAxis: { low: 'Low', high: 'High', title: 'Effort' },
        yAxis: { low: 'Low', high: 'High', title: 'Impact' },
        quadrants: [{ label: 'Quick wins' }, { label: 'Big bets' }, { label: 'Fill-ins' }, { label: 'Avoid' }],
        items: [{ label: 'Onboarding', x: 0.2, y: 0.8 }],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1100, 620], min: [600, 380] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
