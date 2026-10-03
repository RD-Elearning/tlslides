/**
 * tls.t.statement — one large sentence stated as the slide's message, key words in accent.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsTStatement: BlockDefinition = {
  type: 'tls.t.statement',
  name: 'Statement',
  family: 'text',
  tier: 'A',
  summary: 'One large claim that fills the slide, key words emphasised.',
  keywords: ['statement', 'claim', 'conclusion', 'message', 'big text'],
  category: 'emphasis',
  scope: 'element',
  shortDescription: "One large sentence stated as the slide's message, key words in accent",
  related: ['tls.t.quote', 'tls.t.takeaway', 'tls.t.hero-number', 'tls.x.watermark'],
  describe: {
    when: "A single claim or conclusion that should fill the slide's attention.",
    avoid: 'A quotation from a person (use tls.t.quote); a takeaway beside other content (use tls.t.takeaway).',
    example: {
      id: 'b_statement',
      type: 'tls.t.statement',
      props: {
        text: 'Retention, not acquisition, is our **growth engine**.',
        attribution: 'FY26 strategy',
        size: 'lg',
        emphasis: 'highlight',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 420], min: [320, 140] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
