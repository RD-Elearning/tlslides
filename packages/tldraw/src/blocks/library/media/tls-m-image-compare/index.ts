/**
 * tls.m.image-compare — before and after, side by side or split down the middle.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, lint } from './layout'
import { motion } from './motion'

export const tlsMImageCompare: BlockDefinition = {
  type: 'tls.m.image-compare',
  name: 'Image Compare',
  family: 'media',
  tier: 'A',
  summary: 'Before and after images side by side or split down the middle, each labelled.',
  keywords: ['before', 'after', 'compare', 'renovation', 'redesign', 'results', 'split'],
  category: 'media',
  scope: 'group',
  shortDescription: 'Two images side by side or split in one frame, labelled before and after',
  related: ['tls.g.before-after', 'tls.m.image-grid'],
  describe: {
    when: 'A visual change: renovation, redesign, treatment or model results.',
    avoid: 'Text-only before/after (use tls.g.before-after); unrelated photos (use tls.m.image-grid).',
    example: {
      id: 'b_image_compare',
      type: 'tls.m.image-compare',
      props: {
        before: { image: '/demo/before.svg', alt: 'Old dashboard', label: 'Before' },
        after: { image: '/demo/after.svg', alt: 'New dashboard', label: 'After' },
        mode: 'split',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 640], min: [320, 180] },
  layout: layout as BlockDefinition['layout'],
  motion,
  lint: lint as BlockDefinition['lint'],
}
