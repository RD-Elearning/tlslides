/**
 * tls.m.icon-label — icon with a text label beneath.
 *
 * Combines a named icon with a brief text label. Uses 'body' type token
 * for the label and ColorRole for the icon color.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsMIconLabel: BlockDefinition = {
  type: 'tls.m.icon-label',
  name: 'Icon Label',
  family: 'media',
  tier: 'A',
  summary: 'Icon with text label beneath.',
  keywords: ['icon', 'label', 'button', 'nav', 'link'],
  category: 'media',
  scope: 'element',
  shortDescription: 'Icon with a short label beneath',
  related: ['tls.m.icon', 'tls.m.icon-list'],
  describe: {
    when: 'Use to label a feature, action, or section with an icon and brief text.',
    avoid: 'Do not use for long descriptions (use tls.t.body) or for a grid of icon + title + description cells (use tls.c.feature-grid).',
    example: {
      id: 'b_il_1',
      type: 'tls.m.icon-label',
      props: { icon: 'zap', label: 'Power', color: 'accent' },
    },
  },
  schema,
  defaults,
  size: { preferred: [160, 100], min: [96, 76] },
  layout: layout as BlockDefinition['layout'],
  motion,
}