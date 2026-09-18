/**
 * tls.l.field — full-bleed background.
 *
 * Renders a full-size filled rectangle with the resolved surface colour.
 * Used as a background layer behind other content.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLField: BlockDefinition = {
  type: 'tls.l.field',
  name: 'Field',
  family: 'layout',
  tier: 'A',
  summary: 'Full-bleed background fill.',
  keywords: ['field', 'background', 'fill', 'full-bleed'],
  describe: {
    when: 'Use as a solid-color background layer behind other content in an overlay.',
    avoid: 'Do not use for visible content — it renders only a filled rectangle.',
    example: {
      id: 'b_field',
      type: 'tls.l.field',
      props: {},
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
