/**
 * tls.t.footnote — small-print source, reference or footnote lines with optional marker.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsTFootnote: BlockDefinition = {
  type: 'tls.t.footnote',
  name: 'Footnote',
  family: 'text',
  tier: 'A',
  summary: 'Small-print source or footnote lines with an optional marker.',
  keywords: ['footnote', 'source', 'reference', 'citation', 'small print'],
  category: 'text',
  scope: 'element',
  shortDescription: 'Small-print source, reference or footnote line with optional marker',
  related: ['tls.t.caption', 'tls.x.footer-text'],
  describe: {
    when: 'Citing data sources under a chart or table, and footnotes.',
    avoid: 'A caption that describes an image (use tls.t.caption).',
    example: {
      id: 'b_footnote',
      type: 'tls.t.footnote',
      props: { items: ['Eurostat, 2025'], marker: 'source', align: 'start' },
    },
  },
  schema,
  defaults,
  size: { preferred: [1100, 110], min: [200, 30] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
