/**
 * tls.d.ranking — ranked leaderboard with value bars and medals.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsDRanking: BlockDefinition = {
  type: 'tls.d.ranking',
  name: 'Ranking',
  family: 'data',
  tier: 'A',
  summary: 'Leaderboard rows: position, name, value bar and value, with medals for the top three.',
  keywords: ['ranking', 'leaderboard', 'top 10', 'top n', 'best', 'league table'],
  category: 'table',
  scope: 'group',
  shortDescription: 'Ranked leaderboard with position, name, value bar and medal for the top three',
  related: ['tls.d.bar', 'tls.d.table'],
  describe: {
    when: 'Top-N lists, leaderboards, top products.',
    avoid: 'No ranking intent (tls.d.bar). Many columns: tls.d.table.',
    example: {
      id: 'b_ranking',
      type: 'tls.d.ranking',
      props: {
        items: [
          { label: 'Aurora', value: 4820 },
          { label: 'Beacon', value: 3910 },
          { label: 'Cobalt', value: 2740 },
        ],
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [900, 420], min: [350, 200] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
