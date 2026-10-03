/**
 * tls.l.section — titled section.
 *
 * Renders a section title with a divider line, then lays out children
 * in the remaining space.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLSection: BlockDefinition = {
  type: 'tls.l.section',
  name: 'Section',
  family: 'layout',
  tier: 'A',
  summary: 'Titled section with divider and content area.',
  keywords: ['section', 'title', 'heading', 'divider'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Titled area with a divider above its children',
  related: ['tls.l.card'],
  describe: {
    when: 'Use to introduce a named subsection within a region with a title + divider.',
    avoid: 'Do not use for the slide title (use tls.t.title) or for a filled panel without a heading (use tls.l.card).',
    example: {
      id: 'b_section',
      type: 'tls.l.section',
      props: { title: 'Revenue Drivers', gap: 'sm' },
      children: [],
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
