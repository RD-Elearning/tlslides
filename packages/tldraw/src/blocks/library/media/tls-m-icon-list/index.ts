/**
 * tls.m.icon-list — vertical list of short points, each led by its own icon.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsMIconList: BlockDefinition = {
  type: 'tls.m.icon-list',
  name: 'Icon list',
  family: 'media',
  tier: 'A',
  summary: 'Stacked points, each with its own icon, title and short description.',
  keywords: ['icons', 'benefits', 'features', 'list', 'points'],
  category: 'list',
  scope: 'element',
  shortDescription: 'Vertical list of short points, each led by its own icon',
  related: ['tls.c.feature-grid', 'tls.m.icon-label', 'tls.t.bullets'],
  describe: {
    when: '3–6 benefits or features where each needs a recognisable icon, stacked in a column.',
    avoid: 'A grid of features (use tls.c.feature-grid); points without icons (use tls.t.bullets).',
    example: {
      id: 'b_iconlist',
      type: 'tls.m.icon-list',
      props: {
        items: [
          { icon: 'rocket', title: 'Fast start', text: 'Live in a week.' },
          { icon: 'shield', title: 'Secure', text: 'Audit trails included.' },
          { icon: 'sparkles', title: 'Polished', text: 'Looks right out of the box.' },
        ],
        iconStyle: 'circle',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [760, 370], min: [420, 290] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
