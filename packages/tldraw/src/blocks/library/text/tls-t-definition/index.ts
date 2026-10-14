/**
 * tls.t.definition — a term with its definition, optional pronunciation and example.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTDefinition: BlockDefinition = {
  type: 'tls.t.definition',
  name: 'Definition',
  family: 'text',
  tier: 'A',
  summary: 'A term with its definition, optional pronunciation, part of speech and example.',
  keywords: ['definition', 'term', 'glossary', 'vocabulary', 'concept'],
  category: 'text',
  scope: 'element',
  shortDescription: 'Term with its definition, optional pronunciation and example',
  related: ['tls.t.body', 'tls.t.takeaway', 'tls.t.kv-list'],
  describe: {
    when: 'Introducing a concept, glossary terms, vocabulary (lectures).',
    avoid: 'Several term and value pairs (use tls.t.kv-list). By default prefer tls.t.body for running text.',
    example: {
      id: 'b_definition',
      type: 'tls.t.definition',
      props: {
        term: 'Latency',
        pronunciation: '/LAY-ten-see/',
        partOfSpeech: 'noun',
        definition: 'The **delay** between a request and the first byte of its response.',
        example: 'A 40 ms round trip feels instant.',
        layout: 'stacked',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [900, 400], min: [480, 400] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
