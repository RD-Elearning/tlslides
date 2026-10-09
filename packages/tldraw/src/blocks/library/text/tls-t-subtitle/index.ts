/**
 * tls.t.subtitle — subtitle / secondary heading.
 *
 * Renders a secondary heading text, smaller than the title. Supports rich text
 * (inline bold/italic runs), alignment, and optional color override.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTSubtitle: BlockDefinition = {
  type: 'tls.t.subtitle',
  name: 'Subtitle',
  family: 'text',
  tier: 'A',
  summary: 'Secondary heading below the title with RichText support.',
  keywords: ['subtitle', 'subheading', 'secondary'],
  category: 'heading',
  scope: 'element',
  shortDescription: 'Secondary line under the title',
  related: ['tls.t.title'],
  describe: {
    when: 'Use to add context, date, or audience below the title.',
    avoid: 'Do not use for long paragraphs (use tls.t.body) or as the slide title itself (use tls.t.title). On an opening slide prefer the subtitle slot of tls.c.hero.',
    example: {
      id: 'b_sub',
      type: 'tls.t.subtitle',
      props: {
        text: { runs: [{ text: 'Q3 FY2026 · prepared for the ' }, { text: 'board', italic: true }] },
        align: 'start',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [960, 110], min: [560, 108] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
