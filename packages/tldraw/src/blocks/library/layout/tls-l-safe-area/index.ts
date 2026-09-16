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
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
