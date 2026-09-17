/**
 * tls.t.caption — caption text.
 *
 * Small text typically placed under images, charts, or other media.
 * Uses the 'caption' type token for appropriate sizing and 'textMuted'
 * color role for secondary content.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

export const tlsTCaption: BlockDefinition = {
  type: 'tls.t.caption',
  name: 'Caption',
  family: 'text',
  tier: 'A',
  summary: 'Small caption text for images, charts, and media.',
  keywords: ['caption', 'subtitle', 'description', 'label', 'small-text', 'source'],
  schema,
  defaults,
  size: { preferred: [400, 40], min: [100, 20] },
  layout: layout as BlockDefinition['layout'],
  motion,
}
