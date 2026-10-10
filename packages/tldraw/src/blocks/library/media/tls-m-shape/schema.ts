/**
 * Schema and defaults for tls.m.shape — a circle, rounded box or hexagon with a centred label
 * (CMP3 atom).
 */

import type { BlockSchema } from '../../../types'

export const SHAPE_LABEL_MAX = 40

export const schema: BlockSchema = {
  label: {
    type: { kind: 'text', maxChars: SHAPE_LABEL_MAX },
    role: 'content',
    label: 'Label',
    required: true,
    guidance: 'One to four words centred in the shape: a node, a concept, a hub ("Customer", "Data platform").',
  },
  icon: {
    type: { kind: 'icon' },
    role: 'content',
    label: 'Icon',
    guidance: 'Optional icon above the label, from the icon list. Omit for a plain label.',
  },
  shape: {
    type: { kind: 'enum', values: ['circle', 'rounded', 'hexagon'] },
    role: 'option',
    label: 'Shape',
  },
  tone: {
    type: { kind: 'enum', values: ['solid', 'soft', 'outline'] },
    role: 'option',
    label: 'Tone',
    help: 'solid = accent fill, soft = a tint (default), outline = a border only.',
  },
  size: {
    type: { kind: 'enum', values: ['md', 'sm', 'lg'] },
    role: 'option',
    label: 'Size',
    help: 'A circle sm 160, md 220, lg 300 units across; a box or hexagon about as large. A smaller box scales it down.',
  },
}

export interface ShapeProps extends Record<string, unknown> {
  label: string
  icon?: string
  shape?: 'circle' | 'rounded' | 'hexagon'
  tone?: 'solid' | 'soft' | 'outline'
  size?: 'md' | 'sm' | 'lg'
}

export const defaults: ShapeProps = {
  label: 'Customer',
  shape: 'circle',
  tone: 'soft',
  size: 'md',
}
