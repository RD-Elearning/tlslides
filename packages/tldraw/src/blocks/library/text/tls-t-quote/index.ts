/**
 * tls.t.quote — blockquote with large quotation glyph.
 *
 * The quotation glyph is a `path` node (not text), scaling with the box.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout as classicLayout } from './layout'
import { layoutVariant } from './variants'
import { motion } from './motion'
import type { LayoutContext, LayoutNode } from '../../../types'
import type { QuoteProps } from './schema'

const VARIANTS = ['big', 'card', 'side', 'image'] as const

/** AC8: `classic` (and any unknown value) keeps the original layout byte for byte. */
function layout(props: QuoteProps, ctx: LayoutContext): LayoutNode {
  const v = props.variant as (typeof VARIANTS)[number]
  return VARIANTS.includes(v) ? layoutVariant(v, props, ctx) : classicLayout(props, ctx)
}

export const tlsTQuote: BlockDefinition = {
  type: 'tls.t.quote',
  name: 'Quote',
  family: 'text',
  tier: 'A',
  summary: 'Pull quote with attribution: mark beside the text, display-size, on a card, with a side bar, or beside a photo.',
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
        image: '/demo/photo-1.svg',
        alt: 'Students at a long table',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [960, 400], min: [480, 380] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
