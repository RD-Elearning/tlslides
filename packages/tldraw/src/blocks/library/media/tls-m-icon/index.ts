/**
 * tls.m.icon — icon block with named icon and optional color.
 *
 * Displays an SVG icon from the vendored icon set. Uses ColorRole
 * for the icon color, ensuring theme compliance.
 */

import type { BlockDefinition } from '../../../types'
import { schema, defaults, validateIconName } from './schema'
import { layout, intrinsicSize } from './layout'
import { motion } from './motion'

export const tlsMIcon: BlockDefinition = {
  type: 'tls.m.icon',
  name: 'Icon',
  family: 'media',
  tier: 'A',
  summary: 'SVG icon from the icon set, with optional color role.',
  keywords: ['icon', 'symbol', 'graphic', 'svg'],
  describe: {
    when: 'Use to display a named SVG icon (zap, shield, globe, check, etc.) with proper theming. Ideal for feature grids, labels, and decorative elements.',
    avoid: 'Do not use for images or photographs. For decorative graphics without specific meaning, use tls.m.decoration instead.',
    example: {
      id: 'b_icon_1',
      type: 'tls.m.icon',
      props: {
        icon: 'zap',
        color: 'accent',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [24, 24], min: [12, 12] },
  layout: layout as BlockDefinition['layout'],
  motion,
  intrinsicSize,
}