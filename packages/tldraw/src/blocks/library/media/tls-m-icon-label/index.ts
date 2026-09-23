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
  describe: {
    when: 'Use to label a feature, action, or section with an icon and brief text.',
    avoid: 'Do not use for long descriptions — use tls.t.body instead.',
    example: {
      id: 'b_il_1',
      type: 'tls.m.icon-label',
      props: { icon: 'zap', label: 'Power', color: 'accent' },
    },
  },
  schema,
  defaults,
  size: { preferred: [80, 60], min: [40, 40] },
  layout: layout as BlockDefinition['layout'],
  motion,
}