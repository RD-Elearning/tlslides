/**
 * tls.g.myth-fact — misconceptions, each set right by the fact (vivid V4).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGMythFact: BlockDefinition = {
  type: 'tls.g.myth-fact',
  name: 'Myth vs Fact',
  family: 'diagram',
  tier: 'A',
  summary: '1-4 rows of a common misconception (struck through, ✗) and the fact that corrects it (✓), under localisable headings.',
  keywords: ['myth', 'fact', 'misconception', 'truth', 'false', 'true', 'common mistakes', 'debunk', 'correction'],
  category: 'comparison',
  scope: 'group',
  shortDescription: 'Misconceptions set right: myth → fact, row by row',
  related: ['tls.g.pros-cons', 'tls.g.before-after', 'tls.c.problem-solution'],
  describe: {
    when: 'Common misconceptions of the topic and what is true instead, a "true or false?" review, typical student mistakes and their correction.',
    avoid: 'Two options weighed against each other (use tls.g.pros-cons); a change from old to new (use tls.g.before-after); misconceptions the source does not state.',
    example: {
      id: 'b_myth_fact',
      type: 'tls.g.myth-fact',
      props: {
        mythLabel: 'Myth',
        factLabel: 'Fact',
        rows: [
          { myth: 'Heavier objects fall faster', fact: 'Without air resistance every object falls with the same acceleration, 9.8 m/s²' },
          { myth: 'Seasons come from the distance to the Sun', fact: 'They come from the tilt of the Earth\'s axis' },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 560], min: [700, 320] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
