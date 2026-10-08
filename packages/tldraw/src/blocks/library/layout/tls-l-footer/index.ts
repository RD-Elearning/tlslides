/**
 * tls.l.footer — content + footer.
 *
 * Splits the box vertically into a main content area and a footer,
 * with configurable footer height and gutter.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'
import { tile } from '../_example'

export const tlsLFooter: BlockDefinition = {
  type: 'tls.l.footer',
  name: 'Footer',
  family: 'layout',
  tier: 'A',
  summary: 'Content + footer layout with configurable footer height.',
  keywords: ['footer', 'bottom', 'content', 'page'],
  category: 'structure',
  scope: 'element',
  shortDescription: 'Main content area above a fixed-height footer strip',
  related: ['tls.x.footer-text'],
  describe: {
    when:
      'Container: children [main, footer]: a fixed-height strip (footerHeight) under the main area.',
    avoid: 'Do not use for an inline caption under one chart or image (use tls.t.caption).',
    example: {
      id: 'b_footer',
      type: 'tls.l.footer',
      props: { footerHeight: 120, gutter: 'md', children: [tile('c1', 'Main content'), tile('c2', 'Footer')] },
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 420], min: [400, 260] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
