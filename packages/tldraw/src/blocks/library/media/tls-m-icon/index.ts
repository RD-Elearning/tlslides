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
  category: 'media',
  scope: 'element',
  shortDescription: 'Single icon from the icon set in a theme colour',
  related: ['tls.m.icon-label'],
  describe: {
    when: 'Use to display a named SVG icon (zap, shield, globe, check, etc.) with proper theming. size sm is an inline glyph, lg/xl a standalone mark.',
    avoid: 'Do not use for photographs (use tls.m.image) or for an icon that needs a text label (use tls.m.icon-label).',
    example: {
      id: 'b_icon_1',
      type: 'tls.m.icon',
      props: {
        icon: 'zap',
        color: 'accent',
        size: 'lg',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [80, 80], min: [12, 12] },
  layout: layout as BlockDefinition['layout'],
  motion,
  intrinsicSize,
}