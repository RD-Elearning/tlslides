/**
 * tls.l.safe-area — content safe area (editorOnly).
 *
 * Insets children by a configurable token in editor mode; in headless
 * (export) mode, children fill the full box. Visual guide for designers.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsLSafeArea: BlockDefinition = {
  type: 'tls.l.safe-area',
  name: 'Safe Area',
  family: 'layout',
  tier: 'A',
  summary: 'Content safe-area inset guide with a configurable margin. Editor-only: invisible in exported output.',
  keywords: ['safe-area', 'margin', 'inset', 'editor'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Content margin guide, visible in the editor only',
  related: ['tls.l.grid-guide'],
  describe: {
    when: 'Use in the editor to visually define a content margin zone.',
    avoid: 'Do not use to space content in the final deck: it is invisible in output (use tls.l.stack gap or tls.l.card padding).',
    example: {
      id: 'b_safe',
      type: 'tls.l.safe-area',
      props: { inset: 'md' },
      children: [],
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
