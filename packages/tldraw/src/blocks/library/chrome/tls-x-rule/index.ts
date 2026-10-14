/**
 * tls.x.rule — a divider line, plain or accent gradient, or a short accent bar.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsXRule: BlockDefinition = {
  type: 'tls.x.rule',
  name: 'Rule',
  family: 'chrome',
  tier: 'A',
  summary: 'A thin divider line, horizontal or vertical, plain or accent gradient, or a short accent bar.',
  keywords: ['rule', 'divider', 'line', 'separator', 'accent bar', 'underline'],
  category: 'decoration',
  scope: 'element',
  // LO2: a divider sits between blocks; behind text it would strike it through.
  layer: 'content',
  shortDescription: 'Horizontal or vertical divider line, plain or accent gradient',
  related: ['tls.m.decoration', 'tls.l.section'],
  describe: {
    when: 'Separating areas on free layouts, and a short accent bar under a heading.',
    avoid: 'Inside a container that already draws its own divider (use tls.l.section).',
    example: {
      id: 'b_rule',
      type: 'tls.x.rule',
      props: { axis: 'horizontal', weight: 'md', tone: 'accent', length: 'short' },
    },
  },
  schema,
  defaults,
  size: { preferred: [240, 8], min: [16, 2] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
