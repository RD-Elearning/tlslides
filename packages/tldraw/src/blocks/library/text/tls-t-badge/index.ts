/**
 * tls.t.badge — one short label on a filled pill, anchorable on a card corner (CMP3 atom).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, intrinsicSize } from './layout'
import { motion } from './motion'

export const tlsTBadge: BlockDefinition = {
  type: 'tls.t.badge',
  name: 'Badge',
  family: 'text',
  tier: 'A',
  summary: 'One short label on a pill (solid, soft or outline), optionally with a leading icon.',
  keywords: ['badge', 'chip', 'pill', 'label', 'status', 'tag', 'highlight'],
  category: 'emphasis',
  scope: 'element',
  // LO2: a badge is meant to sit on a card or image corner, over it.
  layer: 'overlay',
  // LO2.1: layered out of the stack it keeps its pill size, in the anchor box's top-right corner.
  anchor: 'top-right',
  shortDescription: 'One short status label on a pill, e.g. on a card corner',
  related: ['tls.t.tags', 'tls.t.kicker', 'tls.d.trend-badge'],
  describe: {
    when: 'Flagging one card, plan or photo: "New", "Most popular", "Beta"; anchor it with `layer: "overlay"` + `anchorTo`.',
    avoid: 'Several labels in a row (use tls.t.tags) or a category above a title (use tls.t.kicker).',
    example: {
      id: 'b_badge',
      type: 'tls.t.badge',
      props: { text: 'Most popular', icon: 'star', tone: 'solid' },
    },
  },
  schema,
  defaults,
  size: { preferred: [240, 48], min: [64, 28] },
  layout: layout as BlockDefinition['layout'],
  intrinsicSize: intrinsicSize as BlockDefinition['intrinsicSize'],
  motion,
}
