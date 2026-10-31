/**
 * Schema and defaults for tls.d.icon-array — a share shown as a pictogram (vivid V4).
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../_chart/schema-kit'

export const ICON_ARRAY_MAX = 100

export const schema: BlockSchema = {
  value: { type: { kind: 'number', min: 0 }, role: 'content', label: 'Highlighted', required: true, guidance: 'How many of the group: 7 (of 10).' },
  total: { type: { kind: 'number', min: 1, max: ICON_ARRAY_MAX }, role: 'content', label: 'Out of', guidance: 'The group size drawn, 10 or 20 (at most 100). Round a share: 68% → 7 of 10.' },
  icon: { type: { kind: 'icon' }, role: 'content', label: 'Icon', guidance: 'One icon for one member of the group: user, school, home, tree.' },
  label: { type: { kind: 'text', maxChars: 60 }, role: 'content', label: 'Label', guidance: 'Who they are, one line: "students finish the course".' },
  caption: { type: { kind: 'text', maxChars: 90 }, role: 'content', label: 'Caption', help: 'Source or context, one line.' },
  figure: enumSlot(['fraction', 'percent', 'none'], 'Figure', 'The large number beside the icons: 7/10, 70%, or none.'),
  tone: enumSlot(['accent', 'accent2', 'negative', 'positive'], 'Colour', 'Of the highlighted icons.'),
}

export interface IconArrayProps extends Record<string, unknown> {
  value: number
  total?: number
  icon?: string
  label?: string
  caption?: string
  figure?: 'fraction' | 'percent' | 'none'
  tone?: 'accent' | 'accent2' | 'negative' | 'positive'
}

export const defaults: IconArrayProps = {
  value: 7,
  total: 10,
  icon: 'user',
  label: 'students finish the course',
  caption: 'Survey of 1,200 learners, 2025',
  figure: 'fraction',
  tone: 'accent',
}
