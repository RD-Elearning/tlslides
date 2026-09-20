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
  summary: 'Content safe area with configurable inset (editorOnly).',
  keywords: ['safe-area', 'margin', 'inset', 'editor'],
  describe: {
    when: 'Use in the editor to visually define a content margin zone.',
    avoid: 'Do not use in exported decks — it is editor-only and invisible in output.',
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
