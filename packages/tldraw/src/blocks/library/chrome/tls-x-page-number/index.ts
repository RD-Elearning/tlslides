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
  describe: {
    when: 'Use to indicate the current page position in a multi-slide document.',
    avoid: 'Do not use as a content block — this is chrome only.',
    example: {
      id: 'b_page_1',
      type: 'tls.x.page-number',
      props: { number: 1, align: 'center' },
    },
  },
  schema,
  defaults,
  size: { preferred: [60, 20], min: [20, 16] },
  layout: layout as BlockDefinition['layout'],
  motion,
}