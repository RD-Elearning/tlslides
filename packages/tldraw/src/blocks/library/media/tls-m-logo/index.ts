/**
 * tls.m.logo — one brand mark fitted inside a fixed height.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, lint } from './layout'
import { motion } from './motion'

export const tlsMLogo: BlockDefinition = {
  type: 'tls.m.logo',
  name: 'Logo',
  family: 'media',
  tier: 'A',
  summary: 'One logo fitted inside a fixed height, never cropped, with an optional plate.',
  keywords: ['logo', 'brand', 'partner', 'client', 'sponsor', 'wordmark'],
  category: 'brand',
  scope: 'element',
  shortDescription: 'Single logo fitted inside a fixed height, never cropped',
  related: ['tls.m.logo-wall', 'tls.m.image'],
  describe: {
    when: 'One brand mark: partner, client, sponsor, the presenter organisation.',
    avoid: 'Several logos (use tls.m.logo-wall); a photo (use tls.m.image).',
    example: {
      id: 'b_logo',
      type: 'tls.m.logo',
      props: { image: 'asset-acme', alt: 'Acme Corp', ratio: 3, maxHeight: 'lg', plate: 'alt' },
    },
  },
  schema,
  defaults,
  size: { preferred: [420, 160], min: [80, 40] },
  layout: layout as BlockDefinition['layout'],
  motion,
  lint: lint as BlockDefinition['lint'],
}
