/**
 * tls.m.illustration — spro creative CR9: a hand-drawn person or scene (Open Doodles, CC0) in the
 * deck's colours, for playful and teaching decks: a hook, a pause, a closing, beside a question.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, lint } from './layout'
import { motion } from './motion'

export const tlsMIllustration: BlockDefinition = {
  type: 'tls.m.illustration',
  name: 'Illustration',
  family: 'media',
  tier: 'A',
  summary: 'A hand-drawn scene (a person reading, running, jumping…) recoloured from the palette.',
  keywords: ['illustration', 'doodle', 'person', 'scene', 'drawing', 'playful', 'people'],
  category: 'media',
  scope: 'element',
  shortDescription: 'Hand-drawn person/scene in the deck colours',
  related: ['tls.m.emoji', 'tls.m.image', 'tls.m.decoration'],
  describe: {
    when: 'Playful or teaching decks: a person doing what the slide is about, beside a hook, a question or a closing.',
    avoid: 'Data or formal slides; a real photo is needed (use tls.m.image).',
    example: { id: 'b_illustration', type: 'tls.m.illustration', props: { scene: 'sitting-reading' } },
  },
  schema,
  defaults,
  size: { preferred: [480, 360], min: [160, 120] },
  layout: layout as BlockDefinition['layout'],
  motion,
  lint: lint as BlockDefinition['lint'],
}
