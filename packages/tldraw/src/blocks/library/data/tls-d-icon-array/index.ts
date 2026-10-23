/**
 * tls.d.icon-array — a share as a pictogram: `value` of `total` icons filled (vivid V4, Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { capacity, intrinsicSize, layout } from './layout'
import { motion } from './motion'

export const tlsDIconArray: BlockDefinition = {
  type: 'tls.d.icon-array',
  name: 'Icon Array',
  family: 'data',
  tier: 'A',
  summary: 'A share of a group as a pictogram: value of total icons filled (7 of 10 people), a large figure, a label and a caption.',
  keywords: ['pictogram', 'icon array', 'isotype', 'share', 'proportion', 'out of', 'people', 'percent', 'ratio'],
  category: 'metric',
  scope: 'element',
  shortDescription: 'Pictogram: 7 of 10 icons filled, with the figure',
  related: ['tls.d.progress-ring', 'tls.c.big-stat', 'tls.d.donut'],
  describe: {
    when: 'One share of a group of people or things the audience can picture: "7 in 10 students", "1 in 4 households", "3 of 5 trees". The icon is one member of the group.',
    avoid: 'Shares of several parts (use tls.d.donut); a rate with no group behind it, like completion (use tls.d.progress-ring); exact figures over 100.',
    example: { id: 'b_icon_array', type: 'tls.d.icon-array', props: { value: 3, total: 10, icon: 'user', label: 'of learners study on a phone', figure: 'fraction' } },
  },
  schema,
  defaults,
  size: { preferred: [1000, 440], min: [480, 300] },
  layout: layout as BlockDefinition['layout'],
  intrinsicSize: intrinsicSize as BlockDefinition['intrinsicSize'],
  capacity: capacity as BlockDefinition['capacity'],
  motion,
}
