/**
 * tls.l.grid-guide — alignment grid (editorOnly).
 *
 * Renders horizontal and vertical guide lines at equal intervals.
 * Editor-only: invisible in export (headless) mode.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLGridGuide: BlockDefinition = {
  type: 'tls.l.grid-guide',
  name: 'Grid Guide',
  family: 'layout',
  tier: 'A',
  summary: 'Alignment grid guide with configurable divisions. Light guide lines; omitted from PNG/PDF export.',
  keywords: ['grid', 'guide', 'alignment', 'editor'],
  category: 'structure',
  scope: 'element',
  // LO2: editing-aid lines under the content.
  layer: 'backdrop',
  shortDescription: 'Light alignment lines at equal divisions (editing aid)',
  related: ['tls.l.safe-area'],
  describe: {
    when:
      'Alignment aid, no children: draws light guide lines at equal divisions over its box while editing. Never part of the story; remove before presenting.',
    avoid: 'Do not use to lay out content (use tls.l.grid) and never leave it on a slide that will be presented: the lines are drawn in the viewer too.',
    example: {
      id: 'b_gguide',
      type: 'tls.l.grid-guide',
      props: { divisions: 3 },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 450], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
