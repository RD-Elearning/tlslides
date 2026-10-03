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
  category: 'emphasis',
  scope: 'element',
  shortDescription: 'Pull quote with a large quote mark and attribution',
  related: ['tls.c.testimonial', 'tls.c.quote-image'],
  describe: {
    when: 'Use to feature a direct quote with attribution from a named person.',
    avoid: 'Do not use for anonymous insights (use tls.t.takeaway) or for a customer quote with name, role and avatar (use tls.c.testimonial).',
    example: {
      id: 'b_quote',
      type: 'tls.t.quote',
      props: {
        text: 'The only way to do great work is to love what you do.',
        attribution: 'Steve Jobs',
        role: 'Co-founder, Apple',
        markStyle: 'glyph',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 400], min: [300, 200] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
