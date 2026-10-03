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
  summary: 'Alignment grid guide with configurable divisions. Editor-only: invisible in exported output.',
  keywords: ['grid', 'guide', 'alignment', 'editor'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Column alignment guide, visible in the editor only',
  related: ['tls.l.safe-area'],
  describe: {
    when: 'Use in the editor to show alignment guides for precise positioning.',
    avoid: 'Do not use to lay out content: it only draws guides in the editor (use tls.l.grid for real columns).',
    example: {
      id: 'b_gguide',
      type: 'tls.l.grid-guide',
      props: { divisions: 3 },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
