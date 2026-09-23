/**
 * Schema and defaults for tls.m.icon-label — icon with text label.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  icon: {
    type: { kind: 'icon' },
    role: 'content',
    label: 'Icon',
    help: 'The icon to display.',
    required: true,
    guidance: 'Choose from the icon set: zap, shield, globe, check, etc.',
  },
  label: {
    type: { kind: 'text', maxChars: 100 },
    role: 'content',
    label: 'Label',
    help: 'Text label beneath the icon.',
    required: true,
    guidance: 'Keep to 1-3 words.',
  },
  color: {
    type: { kind: 'color' },
    role: 'option',
    label: 'Color',
    help: 'Override the default color role.',
  },
  size: {
    type: { kind: 'enum', values: ['sm', 'md', 'lg'] },
    role: 'option',
    label: 'Size',
    help: 'Size of the icon+label group.',
  },
}

export interface IconLabelProps extends Record<string, unknown> {
  icon: string
  label: string
  color?: string
  size?: string
}

export const defaults: IconLabelProps = {
  icon: 'zap',
  label: 'Feature',
  color: 'accent',
  size: 'md',
}