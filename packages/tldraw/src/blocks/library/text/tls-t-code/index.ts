/**
 * tls.t.code — a code snippet or pseudo-code, monospace, with highlighted lines (spro compose
 * PLAN.md B3).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTCode: BlockDefinition = {
  type: 'tls.t.code',
  name: 'Code',
  family: 'text',
  tier: 'A',
  summary: 'A code snippet or pseudo-code in a monospace panel with line numbers and highlighted lines.',
  keywords: ['code', 'snippet', 'pseudo-code', 'algorithm', 'program', 'syntax'],
  category: 'text',
  scope: 'element',
  shortDescription: 'Code or pseudo-code in a monospace panel, highlighted lines',
  related: ['tls.t.formula', 'tls.t.numbered'],
  describe: {
    when: 'A snippet, pseudo-code or a function signature the audience must read (programming lectures).',
    avoid: 'Prose or steps in words (use tls.t.numbered or tls.c.steps); more than 14 lines (split the slide).',
    example: {
      id: 'b_code',
      type: 'tls.t.code',
      props: {
        code: 'def preorder(t):\n    if t is None:\n        return\n    visit(t)\n    preorder(t.left)\n    preorder(t.right)',
        language: 'Python',
        highlight: '4',
        caption: 'Pre-order: the node before its subtrees',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [900, 520], min: [560, 420] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
