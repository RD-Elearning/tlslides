/**
 * tls.m.icon — icon block with named icon and optional color.
 *
 * Displays an SVG icon from the vendored icon set. Uses ColorRole
 * for the icon color, ensuring theme compliance.
 */

import type { BlockSchema } from '../../../types'
import { hasIcon, ICONS } from '../../../icons'

export const schema: BlockSchema = {
  icon: {
    type: { kind: 'icon' },
    role: 'content',
    label: 'Icon',
    help: 'Name of the icon to display (zap, shield, globe, check, etc.).',
    required: true,
    guidance: 'Choose from available icons: zap, shield, globe, check, arrow-right, trending-up, trending-down, users, clock, alert.',
  },
  color: {
    type: { kind: 'color' },
    role: 'option',
    label: 'Color',
    help: 'Color role for the icon. Default uses accent color.',
  },
}

export interface IconProps extends Record<string, unknown> {
  /** Name of the icon from the icon set. */
  icon: string
  /** Optional color role override. Default: 'accent'. */
  color?: 'accent' | 'surface' | 'onSurface' | 'onAccent'
}

export const defaults: IconProps = {
  icon: 'alert',
  color: 'accent',
}

// Validation helper for icon names - used by linting
export function validateIconName(name: string): string | undefined {
  if (!hasIcon(name)) {
    const available = Object.keys(ICONS).join(', ')
    return `Unknown icon name: "${name}". Available: ${available}`
  }
  return undefined
}