/**
 * tls.x.page-number — page number chrome element.
 *
 * Rendered in the deck chrome layer (footer/header). Displays the current
 * page number. Uses 'caption' type token for appropriate sizing.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsXPageNumber: BlockDefinition = {
  type: 'tls.x.page-number',
  name: 'Page Number',
  family: 'chrome',
  tier: 'A',
  summary: 'Page number chrome element for slide footers.',
  keywords: ['page', 'number', 'footer', 'pagination'],
  category: 'chrome',
  scope: 'element',
  shortDescription: 'Slide number, alone or as "3 / 24"',
  related: ['tls.x.footer-text'],
  describe: {
    when: 'The slide number (optionally "3 / 24") in a footer corner of content slides; position it with align start, center or end.',
    avoid: 'Do not use as a content block: it is slide furniture only.',
    example: {
      id: 'b_page_1',
      type: 'tls.x.page-number',
      props: { number: 3, total: 24, align: 'end' },
    },
  },
  schema,
  defaults,
  size: { preferred: [120, 36], min: [72, 36] },
  layout: layout as BlockDefinition['layout'],
  motion,
}