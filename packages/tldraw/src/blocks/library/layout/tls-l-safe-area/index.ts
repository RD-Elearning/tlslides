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
import { tile } from '../_example'

export const tlsLSafeArea: BlockDefinition = {
  type: 'tls.l.safe-area',
  name: 'Safe Area',
  family: 'layout',
  tier: 'A',
  summary: 'Insets its child blocks by a configurable margin so content stays off the slide edge.',
  keywords: ['safe-area', 'margin', 'inset', 'editor'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Insets its child blocks by a margin token so content stays off the edge',
  related: ['tls.l.grid-guide'],
  describe: {
    when:
      'Container: insets its child blocks (props.children) by a margin token and Use to keep content off the slide edge.',
    avoid: 'Do not use for spacing between blocks (use tls.l.stack gap) or for padding inside a panel (use tls.l.card). It draws nothing itself.',
    example: {
      id: 'b_safe',
      type: 'tls.l.safe-area',
      props: { inset: 'md', children: [tile('b_safe_1', 'Content inside the margin')] },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 420], min: [400, 200] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
