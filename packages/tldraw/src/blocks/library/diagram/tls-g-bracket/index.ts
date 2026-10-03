/**
 * tls.g.bracket — a curly brace grouping several items under one label (Tier A).
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity } from './layout'
import { motion } from './motion'

export const tlsGBracket: BlockDefinition = {
  type: 'tls.g.bracket',
  name: 'Bracket',
  family: 'diagram',
  tier: 'A',
  summary: 'A curly or square bracket grouping 2-6 items under one label, label at the right, left or top.',
  keywords: ['bracket', 'brace', 'group', 'together', 'membership', 'category'],
  category: 'relationship',
  scope: 'group',
  shortDescription: 'Curly brace grouping several items under one label',
  related: ['tls.g.breakdown', 'tls.g.venn'],
  describe: {
    when: 'Membership: these items together form one thing, named by the label.',
    avoid: 'Values that add up (use tls.g.breakdown).',
    example: {
      id: 'b_bracket',
      type: 'tls.g.bracket',
      props: { label: 'Core team', items: ['Product lead', 'Tech lead', 'Design lead'] },
    },
  },
  schema,
  defaults,
  size: { preferred: [900, 460], min: [520, 280] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
}
