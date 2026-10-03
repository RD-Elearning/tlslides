/**
 * tls.m.decoration — a decorative blob, arc, ring, dot grid, wave or corner in a theme colour.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsMDecoration: BlockDefinition = {
  type: 'tls.m.decoration',
  name: 'Decoration',
  family: 'media',
  tier: 'A',
  summary: 'Decorative blob, arc, ring, dot grid, wave or corner in a theme colour; deterministic from a seed.',
  keywords: ['decoration', 'blob', 'shape', 'wave', 'dots', 'ornament', 'background', 'accent'],
  category: 'decoration',
  scope: 'element',
  shortDescription: 'Decorative blob, arc, ring, dot grid or wave in a theme colour',
  related: ['tls.m.pattern'],
  describe: {
    when: 'Visual interest on sparse slides: covers, dividers, quotes. Place it in its own region.',
    avoid: 'Anything that carries meaning (use a real block, e.g. tls.t.statement); texture over dense text.',
    example: { id: 'b_decoration', type: 'tls.m.decoration', props: { shape: 'blob', tone: 'accent2', opacity: 'soft', seed: 7 } },
  },
  schema,
  defaults,
  size: { preferred: [480, 480], min: [60, 60] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
