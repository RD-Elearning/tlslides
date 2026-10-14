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
  summary: 'Subtle backdrop texture: repeating dots, grid, lines or diagonal stripes (one path), film grain, or a mesh of soft accent glows.',
  keywords: ['pattern', 'texture', 'dots', 'grid', 'stripes', 'backdrop', 'background', 'grain', 'noise', 'mesh', 'glow'],
  category: 'decoration',
  scope: 'element',
  shortDescription: 'Subtle backdrop: dots, lines, grid, stripes, grain or mesh glows',
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
