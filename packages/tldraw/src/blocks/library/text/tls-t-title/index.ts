/**
 * tls.t.title — slide title.
 *
 * Renders title text with inline rich-text styling (bold/italic runs), autofit
 * for long titles, and optional maxLines truncation with a visible marker.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTTitle: BlockDefinition = {
  type: 'tls.t.title',
  name: 'Title',
  family: 'text',
  tier: 'A',
  summary: 'Slide title with inline styling, autofit, and truncation.',
  keywords: ['title', 'heading', 'hero', 'headline', 'slide'],
  category: 'heading',
  scope: 'element',
  shortDescription: 'Slide title, auto-fitted, with optional rule',
  related: ['tls.t.subtitle', 'tls.t.kicker'],
  describe: {
    when: 'Use as the primary heading on every content slide — the single most important text.',
    avoid: 'Do not use for an opening slide (use tls.c.hero), for a secondary line (use tls.t.subtitle) or for a small label above a title (use tls.t.kicker).',
    example: {
      id: 'b_title',
      type: 'tls.t.title',
      props: {
        text: { runs: [{ text: 'Revenue ' }, { text: 'grew 42%', bold: true }] },
        size: 'title',
        align: 'start',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 120], min: [200, 40] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
