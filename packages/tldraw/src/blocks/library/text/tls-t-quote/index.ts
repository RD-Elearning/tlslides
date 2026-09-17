/**
 * tls.t.quote — blockquote with large quotation glyph.
 *
 * The quotation glyph is a `path` node (not text), scaling with the box.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTQuote: BlockDefinition = {
  type: 'tls.t.quote',
  name: 'Quote',
  family: 'text',
  tier: 'A',
  summary: 'Pull quote with decorative quotation glyph, attribution, and role.',
  keywords: ['quote', 'blockquote', 'pull-quote', 'attribution', 'testimonial'],
  schema,
  defaults,
  size: { preferred: [800, 400], min: [300, 200] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
