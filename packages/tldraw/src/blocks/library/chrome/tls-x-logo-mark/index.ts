/**
 * tls.x.logo-mark — a small corner logo repeated on content slides.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout, lint } from './layout'
import { motion } from './motion'

export const tlsXLogoMark: BlockDefinition = {
  type: 'tls.x.logo-mark',
  name: 'Logo Mark',
  family: 'chrome',
  tier: 'A',
  summary: 'A small logo pinned to one corner of its box, fitted and never cropped.',
  keywords: ['logo', 'brand', 'corner', 'watermark', 'chrome', 'every slide'],
  category: 'chrome',
  scope: 'element',
  shortDescription: 'Small corner logo repeated on content slides',
  related: ['tls.m.logo', 'tls.x.header'],
  describe: {
    when: 'Brand presence on every content slide: a small mark in a corner.',
    avoid: 'A featured or large logo (use tls.m.logo).',
    example: {
      id: 'b_logo_mark',
      type: 'tls.x.logo-mark',
      props: { image: 'asset-acme', alt: 'Acme Corp', ratio: 3, size: 'sm', corner: 'top-right' },
    },
  },
  schema,
  defaults,
  size: { preferred: [200, 48], min: [48, 24] },
  layout: layout as BlockDefinition['layout'],
  motion,
  lint: lint as BlockDefinition['lint'],
}
