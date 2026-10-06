/**
 * tls.m.pattern — a repeating dots, grid, lines or diagonal backdrop in one path.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsMPattern: BlockDefinition = {
  type: 'tls.m.pattern',
  name: 'Pattern',
  family: 'media',
  tier: 'A',
  summary: 'Repeating dots, grid, lines or diagonal stripes as a subtle backdrop, drawn as one path.',
  keywords: ['pattern', 'texture', 'dots', 'grid', 'stripes', 'backdrop', 'background'],
  category: 'decoration',
  scope: 'element',
  shortDescription: 'Repeating dots, lines, grid or diagonal stripes as a subtle backdrop',
  related: ['tls.m.decoration'],
  describe: {
    when: 'Texture behind a cover, divider or quote (put it in its own region, content on top). Tone accent shows clearly; line is very faint.',
    avoid: 'Content slides with dense text; one accent shape (use tls.m.decoration).',
    example: { id: 'b_pattern', type: 'tls.m.pattern', props: { pattern: 'dots', scale: 'md', tone: 'accent', opacity: 'soft' } },
  },
  schema,
  defaults,
  size: { preferred: [960, 540], min: [60, 60] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
