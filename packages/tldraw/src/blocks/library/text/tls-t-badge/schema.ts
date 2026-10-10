/**
 * Schema and defaults for tls.t.badge — one short label on a filled pill (CMP3 atom).
 */

import type { BlockSchema } from '../../../types'

export const BADGE_MAX_CHARS = 24

export const schema: BlockSchema = {
  text: {
    type: { kind: 'text', maxChars: BADGE_MAX_CHARS },
    role: 'content',
    label: 'Label',
    required: true,
    guidance: 'One to three words: a status or a call-out, e.g. "New", "Most popular", "-38% cost".',
  },
  icon: {
    type: { kind: 'icon' },
    role: 'content',
    label: 'Icon',
    guidance: 'Optional leading icon from the icon list, e.g. "check", "star". Omit for a plain label.',
  },
  tone: {
    type: { kind: 'enum', values: ['solid', 'soft', 'outline'] },
    role: 'option',
    label: 'Tone',
    help: 'solid = accent fill (default), soft = a tint, outline = a border only.',
  },
  size: {
    type: { kind: 'enum', values: ['md', 'sm', 'lg'] },
    role: 'option',
    label: 'Size',
  },
}

export interface BadgeProps extends Record<string, unknown> {
  text: string
  icon?: string
  tone?: 'solid' | 'soft' | 'outline'
  size?: 'md' | 'sm' | 'lg'
}

export const defaults: BadgeProps = {
  text: 'Most popular',
  tone: 'solid',
  size: 'md',
}
