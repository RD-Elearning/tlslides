/**
 * tls.t.numbered — numbered points with decimal, padded, roman, alpha or badge markers.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsTNumbered: BlockDefinition = {
  type: 'tls.t.numbered',
  name: 'Numbered list',
  family: 'text',
  tier: 'A',
  summary: 'Numbered points in order, one or two columns.',
  keywords: ['numbered', 'ordered', 'ranked', 'reasons'],
  category: 'list',
  scope: 'element',
  shortDescription: 'Numbered points with decimal, padded, roman, letter or badge markers',
  related: ['tls.t.bullets', 'tls.t.checklist', 'tls.g.steps', 'tls.c.recap'],
  describe: {
    when: 'Ordered points where the order or the count matters: "3 reasons", "5 rules".',
    avoid: 'Unordered points (use tls.t.bullets); process steps (use tls.g.steps).',
    example: {
      id: 'b_numbered',
      type: 'tls.t.numbered',
      props: {
        items: ['Define the audience', 'State the **one** message', 'Prove it with data', 'Ask for the decision'],
        markerStyle: 'badge',
        markerTone: 'accent',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 480], min: [240, 120] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
