/**
 * tls.m.emoji — spro creative CR9: one colour emoji (Fluent Emoji, MIT) as a sticker for the
 * playful family: a reaction, a mascot beside a question, a mark on a closing.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, lint, intrinsicSize } from './layout'
import { motion } from './motion'

export const tlsMEmoji: BlockDefinition = {
  type: 'tls.m.emoji',
  name: 'Emoji',
  family: 'media',
  tier: 'A',
  summary: 'One colour emoji (Fluent Emoji) as a sticker, sized by step, on an optional backing.',
  keywords: ['emoji', 'sticker', 'reaction', 'playful', 'mascot', 'fun'],
  category: 'media',
  scope: 'element',
  shortDescription: 'One colour emoji sticker for playful slides',
  related: ['tls.m.icon', 'tls.m.illustration', 'tls.m.decoration'],
  describe: {
    when: 'A playful deck: a reaction or a mascot beside a question, a hook, a closing.',
    avoid: 'Formal decks (use tls.m.icon); several in a row as bullets (use an icon list).',
    example: { id: 'b_emoji', type: 'tls.m.emoji', props: { emoji: 'light-bulb', size: 'lg', backing: 'sticker' } },
  },
  schema,
  defaults,
  size: { preferred: [240, 240], min: [48, 48] },
  layout: layout as BlockDefinition['layout'],
  intrinsicSize: intrinsicSize as BlockDefinition['intrinsicSize'],
  motion,
  lint: lint as BlockDefinition['lint'],
}
