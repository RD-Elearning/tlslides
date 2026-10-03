/**
 * tls.m.logo-wall — logos in an even grid at equal visual weight.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, capacity, lint } from './layout'
import { motion } from './motion'

export const tlsMLogoWall: BlockDefinition = {
  type: 'tls.m.logo-wall',
  name: 'Logo Wall',
  family: 'media',
  tier: 'A',
  summary: 'Even grid of logos at equal height or equal area, with an optional heading, plates and dividers.',
  keywords: ['logos', 'clients', 'partners', 'sponsors', 'trusted by', 'integrations'],
  category: 'brand',
  scope: 'group',
  shortDescription: 'Even grid of logos at equal visual weight, with an optional heading',
  related: ['tls.m.logo', 'tls.m.image-grid'],
  describe: {
    when: 'Clients, partners, sponsors, integrations, accreditations.',
    avoid: 'Fewer than 3 logos (use tls.m.logo); photos (use tls.m.image-grid).',
    example: {
      id: 'b_logo_wall',
      type: 'tls.m.logo-wall',
      props: {
        heading: 'Trusted by',
        logos: [
          { image: 'asset-a', alt: 'Northwind', ratio: 4 },
          { image: 'asset-b', alt: 'Globex', ratio: 1 },
          { image: 'asset-c', alt: 'Initech', ratio: 3 },
        ],
        uniform: 'area',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 360], min: [320, 120] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity: capacity as BlockDefinition['capacity'],
  lint: lint as BlockDefinition['lint'],
}
