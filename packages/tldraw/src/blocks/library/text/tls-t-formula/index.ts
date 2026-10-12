/**
 * tls.t.formula — plain-text math with engine-drawn subscripts and superscripts (spro compose
 * PLAN.md B3).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTFormula: BlockDefinition = {
  type: 'tls.t.formula',
  name: 'Formula',
  family: 'text',
  tier: 'A',
  summary: 'One to four lines of math with subscripts and superscripts set by the engine, and a caption.',
  keywords: ['formula', 'equation', 'math', 'complexity', 'expression', 'notation'],
  category: 'text',
  scope: 'element',
  shortDescription: 'An equation or complexity with real subscripts and superscripts',
  related: ['tls.t.statement', 'tls.t.definition'],
  describe: {
    when: 'An equation, a complexity (O(n log n)), a rule written in symbols, a short derivation (lectures).',
    avoid: 'Words that only mention a number (use tls.t.statement or tls.t.hero-number); code (use tls.t.code).',
    example: {
      id: 'b_formula',
      type: 'tls.t.formula',
      props: { expression: 'n_max = 2^{h+1} - 1', caption: 'Most nodes in a binary tree of height h', size: 'title' },
    },
  },
  schema,
  defaults,
  size: { preferred: [900, 300], min: [480, 200] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
