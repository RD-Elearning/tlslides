/**
 * tls.t.body — body copy paragraph.
 *
 * Renders paragraph text with RichText support, autofit, multi-column,
 * and text alignment. Typical slide body copy: 1–3 sentences.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, intrinsicSize } from './layout'
import { motion } from './motion'

export const tlsTBody: BlockDefinition = {
  type: 'tls.t.body',
  name: 'Body',
  family: 'text',
  tier: 'A',
  summary: 'Paragraph body text with RichText, autofit, and multi-column.',
  keywords: ['body', 'paragraph', 'text', 'prose', 'copy', 'description'],
  category: 'text',
  scope: 'element',
  shortDescription: 'Paragraph text, auto-fitted, optionally in columns',
  related: ['tls.t.bullets', 'tls.t.definition'],
  describe: {
    when: 'Use for 1–3 sentences of body copy, descriptions, or prose.',
    avoid: 'Do not use for bullet lists (use tls.t.bullets), for a one-line label under an image or chart (use tls.t.caption) or for a data source citation (use tls.t.footnote).',
    example: {
      id: 'b_body',
      type: 'tls.t.body',
      props: {
        text: {
          runs: [
            { text: 'Design systems scale because every ' },
            { text: 'decision', bold: true },
            { text: ' is made once and reused everywhere. Teams ship faster and the product stays consistent.' },
          ],
        },
        columns: 1,
        align: 'start',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 200], min: [560, 170] },
  layout: layout as BlockDefinition['layout'],
  intrinsicSize: intrinsicSize as BlockDefinition['intrinsicSize'],
  motion,
}
