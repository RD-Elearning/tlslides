/**
 * tls.t.body — body copy paragraph.
 *
 * Renders paragraph text with RichText support, autofit, multi-column,
 * and text alignment. Typical slide body copy: 1–3 sentences.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTBody: BlockDefinition = {
  type: 'tls.t.body',
  name: 'Body',
  family: 'text',
  tier: 'A',
  summary: 'Paragraph body text with RichText, autofit, and multi-column.',
  keywords: ['body', 'paragraph', 'text', 'prose', 'copy', 'description'],
  schema,
  defaults,
  size: { preferred: [800, 200], min: [200, 40] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
