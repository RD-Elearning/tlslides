/**
 * tls.t.callout — boxed note marked as info, tip, warning, danger or success, with icon.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTCallout: BlockDefinition = {
  type: 'tls.t.callout',
  name: 'Callout',
  family: 'text',
  tier: 'A',
  summary: 'Boxed note in one of five variants, with icon and optional title.',
  keywords: ['callout', 'note', 'warning', 'tip', 'alert', 'caveat'],
  category: 'emphasis',
  scope: 'element',
  shortDescription: 'Boxed note marked as info, tip, warning, danger or success, with icon',
  related: ['tls.t.takeaway', 'tls.t.statement', 'tls.c.problem-solution'],
  describe: {
    when: 'Warnings, tips, notes and caveats beside the main content.',
    avoid: 'The slide main conclusion (use tls.t.takeaway or tls.t.statement).',
    example: {
      id: 'b_callout',
      type: 'tls.t.callout',
      props: {
        title: 'Tip',
        text: 'Run the demo on **battery** first, then plug in.',
        variant: 'tip',
        fill: 'tint',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 200], min: [240, 90] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
