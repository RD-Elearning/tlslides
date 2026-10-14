/**
 * tls.m.shape — a circle, rounded box or hexagon with a centred label (CMP3 atom).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, intrinsicSize } from './layout'
import { motion } from './motion'

export const tlsMShape: BlockDefinition = {
  type: 'tls.m.shape',
  name: 'Shape',
  family: 'media',
  tier: 'A',
  summary: 'A circle, rounded box or hexagon with a centred label and an optional icon above it.',
  keywords: ['shape', 'circle', 'hexagon', 'node', 'hub', 'bubble', 'label'],
  category: 'relationship',
  scope: 'element',
  shortDescription: 'Circle, rounded box or hexagon with a centred label',
  related: ['tls.g.hub-spoke', 'tls.m.icon-label', 'tls.g.venn'],
  describe: {
    when: 'Nodes you connect yourself: a hub and its satellites, or the boxes of a small flow joined by slide connectors.',
    avoid: 'A ready hub-and-spoke or cycle diagram (use tls.g.hub-spoke or tls.g.cycle) or a card with body text (use tls.l.card).',
    example: {
      id: 'b_shape',
      type: 'tls.m.shape',
      props: { label: 'Data platform', icon: 'database', shape: 'hexagon', tone: 'soft', size: 'md' },
    },
  },
  schema,
  defaults,
  size: { preferred: [260, 220], min: [80, 64] },
  layout: layout as BlockDefinition['layout'],
  intrinsicSize: intrinsicSize as BlockDefinition['intrinsicSize'],
  motion,
}
