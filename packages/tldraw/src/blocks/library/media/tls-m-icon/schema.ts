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
    guidance: 'Choose a name from the icon list in the capability index. Unknown names render a placeholder.',
  },
  color: {
    type: { kind: 'color' },
    role: 'option',
    label: 'Color',
    help: 'Color role for the icon. Default uses accent color.',
  },
  size: {
    type: { kind: 'enum', values: ['sm', 'md', 'lg', 'xl'] },
    role: 'option',
    label: 'Size',
    help: 'sm = 24 (inline glyph, default), md = 48, lg = 80, xl = 128 slide units. Use lg or xl for an icon that stands alone.',
  },
  iconStyle: {
    type: { kind: 'enum', values: ['plain', 'disc'] },
    role: 'option',
    label: 'Icon style',
    help: 'disc puts the icon on a tinted circle 1.75 x its size (a solid accent disc when the colour is onAccent).',
  },
}

export interface IconProps extends Record<string, unknown> {
  /** Name of the icon from the icon set. */
  icon: string
  /** Optional color role override. Default: 'accent'. */
  color?: 'accent' | 'surface' | 'onSurface' | 'onAccent'
  /** Icon side: sm 24 (default), md 48, lg 80, xl 128. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** CMP3 — `disc`: the icon on a tinted circle (SURVEY A4 "icon in disc"). Default `plain`. */
  iconStyle?: 'plain' | 'disc'
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