/**
 * tls.m.image — image block with fit, focal point, and optional caption.
 *
 * Tier A block: pure layout, exports headlessly. The layout function resolves
 * the asset URL via `ctx.resolveAsset()` and emits an `image` LayoutNode.
 * When the asset cannot be resolved, the renderers show a dashed frame with
 * the alt text.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsMImage: BlockDefinition = {
  type: 'tls.m.image',
  name: 'Image',
  family: 'media',
  tier: 'A',
  summary: 'Image with cover/contain fit, focal point, and optional caption.',
  keywords: ['image', 'photo', 'picture', 'media', 'visual'],
  describe: {
    when: 'Use to display a photograph, screenshot, or illustration with optional caption.',
    avoid: 'Do not use for charts — use tls.d.bar. Do not use for placeholder backgrounds — use tls.l.field.',
    example: {
      id: 'b_image',
      type: 'tls.m.image',
      props: { src: 'asset-hero-photo', alt: 'Team meeting in conference room', fit: 'cover', caption: 'Team offsite, Q3 2026' },
    },
  },
  schema,
  defaults,
  size: { preferred: [640, 480], min: [120, 80] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
