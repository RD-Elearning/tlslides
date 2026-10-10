/**
 * tls.t.marker — a step number on a disc, or an oversized numeral (CMP3 atom).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, intrinsicSize } from './layout'
import { motion } from './motion'

export const tlsTMarker: BlockDefinition = {
  type: 'tls.t.marker',
  name: 'Marker',
  family: 'text',
  tier: 'A',
  summary: 'A step or item number: on a disc (solid, soft or outline), or as an oversized numeral.',
  keywords: ['marker', 'number', 'step', 'numeral', 'circle', 'index', 'badge'],
  category: 'emphasis',
  scope: 'element',
  // LO2.1: layered out of the stack (on a card corner) it keeps its own size, top-left.
  anchor: 'top-left',
  shortDescription: 'Step number on a disc, or an oversized "01" numeral',
  related: ['tls.t.badge', 'tls.t.numbered', 'tls.g.steps'],
  describe: {
    when: 'Numbering cards or steps you compose yourself: a marker above each card title, or a big "01" beside a section.',
    avoid: 'A numbered list of text (use tls.t.numbered) or a ready process row (use tls.g.steps).',
    example: {
      id: 'b_marker',
      type: 'tls.t.marker',
      props: { value: '1', variant: 'circle', tone: 'solid', size: 'md' },
    },
  },
  schema,
  defaults,
  size: { preferred: [112, 112], min: [32, 32] },
  layout: layout as BlockDefinition['layout'],
  intrinsicSize: intrinsicSize as BlockDefinition['intrinsicSize'],
  motion,
}
