/**
 * tls.x.watermark — large faint text such as DRAFT or CONFIDENTIAL across the slide.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsXWatermark: BlockDefinition = {
  type: 'tls.x.watermark',
  name: 'Watermark',
  family: 'chrome',
  tier: 'A',
  summary: 'Large faint horizontal text such as DRAFT or CONFIDENTIAL, centred and sized to the box.',
  keywords: ['watermark', 'draft', 'confidential', 'stamp', 'chrome'],
  category: 'chrome',
  scope: 'element',
  shortDescription: 'Large faint text such as DRAFT or CONFIDENTIAL across the slide',
  related: ['tls.t.statement', 'tls.x.footer-text'],
  describe: {
    when: 'Draft, internal or confidential decks that need a status stamp behind the content.',
    avoid: 'Decorative or emphasised text (use tls.t.statement).',
    example: {
      id: 'b_watermark',
      type: 'tls.x.watermark',
      props: { text: 'DRAFT', opacity: 'faint' },
    },
  },
  schema,
  defaults,
  size: { preferred: [1400, 360], min: [200, 60] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
