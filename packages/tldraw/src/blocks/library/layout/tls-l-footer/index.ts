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

export const tlsLFooter: BlockDefinition = {
  type: 'tls.l.footer',
  name: 'Footer',
  family: 'layout',
  tier: 'A',
  summary: 'Content + footer layout with configurable footer height.',
  keywords: ['footer', 'bottom', 'content', 'page'],
  describe: {
    when: 'Use to add a persistent footer strip below the main content area.',
    avoid: 'Do not use for inline captions — use tls.t.caption instead.',
    example: {
      id: 'b_footer',
      type: 'tls.l.footer',
      props: { footerHeight: 120, gutter: 'md' },
      children: [],
    },
  },
  schema,
  defaults,
  size: { preferred: [800, 600], min: [100, 100] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
