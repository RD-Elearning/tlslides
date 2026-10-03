/**
 * tls.m.image-grid — several images in even cells or a feature pattern, with optional captions.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity, lint } from './layout'
import { motion } from './motion'

export const tlsMImageGrid: BlockDefinition = {
  type: 'tls.m.image-grid',
  name: 'Image Grid',
  family: 'media',
  tier: 'A',
  summary: 'Images in even cells, a feature layout or a mosaic, with captions.',
  keywords: ['gallery', 'photos', 'grid', 'portfolio', 'images', 'mosaic'],
  category: 'media',
  scope: 'group',
  shortDescription: 'Grid of images in even cells or a feature pattern, with captions',
  related: ['tls.m.image', 'tls.c.image-text'],
  describe: {
    when: 'Several photos of equal importance: portfolio, event photos, product shots, a gallery.',
    avoid: 'One image plus text (use tls.c.image-text); one image (use tls.m.image).',
    example: {
      id: 'b_image_grid',
      type: 'tls.m.image-grid',
      props: {
        images: [
          { image: 'asset-lab', alt: 'Students at lab benches', caption: 'Lab session' },
          { image: 'asset-field', alt: 'Field trip group photo' },
          { image: 'asset-demo', alt: 'Project demo on stage' },
        ],
        pattern: 'feature-left',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 640], min: [320, 200] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
  lint: lint as BlockDefinition['lint'],
}
