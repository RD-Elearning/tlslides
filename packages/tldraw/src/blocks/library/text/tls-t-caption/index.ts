/**
 * tls.t.caption — caption text.
 *
 * Small text typically placed under images, charts, or other media.
 * Uses the 'caption' type token for appropriate sizing and 'textMuted'
 * color role for secondary content.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTCaption: BlockDefinition = {
  type: 'tls.t.caption',
  name: 'Caption',
  family: 'text',
  tier: 'A',
  summary: 'Small caption text for images, charts, and media.',
  keywords: ['caption', 'subtitle', 'description', 'label', 'small-text', 'source'],
  category: 'text',
  scope: 'element',
  shortDescription: 'Small explanatory line for an image or chart',
  related: ['tls.t.body', 'tls.t.footnote'],
  describe: {
    when: 'Use to describe or label one image or chart in a single line, placed right under it — 5–15 words.',
    avoid: 'Do not use for body text (use tls.t.body), as a title (use tls.t.title or tls.t.subtitle) or for a data source citation or footnote (use tls.t.footnote).',
    example: {
      id: 'b_cap',
      type: 'tls.t.caption',
      props: { text: 'Figure 2 — Store traffic peaks on Saturday afternoons', align: 'start' },
    },
  },
  schema,
  defaults,
  size: { preferred: [640, 64], min: [400, 64] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
