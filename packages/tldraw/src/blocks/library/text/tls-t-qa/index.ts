/**
 * tls.t.qa — question and answer pairs.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsTQa: BlockDefinition = {
  type: 'tls.t.qa',
  name: 'Q and A',
  family: 'text',
  tier: 'A',
  summary: 'Question and answer pairs with Q/A badges or numbers.',
  keywords: ['faq', 'questions', 'answers', 'q&a', 'review', 'objections'],
  category: 'learning',
  scope: 'element',
  shortDescription: 'Question and answer pairs with Q and A badges',
  related: ['tls.t.bullets', 'tls.t.definition'],
  describe: {
    when: 'FAQ slides, review questions in a lecture, objection handling.',
    avoid: 'A multiple-choice question (use tls.c.quiz).',
    example: {
      id: 'b_qa',
      type: 'tls.t.qa',
      props: {
        items: [
          { q: 'Is it free?', a: 'Yes, for individuals.' },
          { q: 'Can I export?', a: 'To **PDF** and PPTX.' },
        ],
        marker: 'qa',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [900, 460], min: [260, 140] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
