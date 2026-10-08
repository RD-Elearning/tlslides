/**
 * Schema and defaults for tls.d.progress-bar — labelled horizontal progress bars.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, enumSlot, formatSlot } from '../_chart/schema-kit'

export const PROGRESS_MAX_ITEMS = 6

export const schema: BlockSchema = {
  items: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 40 }, required: true, role: 'content', label: 'Label' },
          value: { type: { kind: 'number' }, required: true, role: 'content', label: 'Value' },
          max: { type: { kind: 'number' }, role: 'content', label: 'Target', help: 'Value meaning 100%. Default 100.' },
        },
      },
      min: 1,
      max: PROGRESS_MAX_ITEMS,
    },
    role: 'content',
    label: 'Bars',
    required: true,
    guidance: 'Progress toward a target: value / max. Short labels.',
  },
  showValue: enumSlot(['percent', 'value', 'none'], 'Value text'),
  thickness: enumSlot(['md', 'sm', 'lg'], 'Thickness'),
  tone: enumSlot(['accent', 'status'], 'Colour', 'status = red/amber/green by progress.'),
  labelPos: enumSlot(['above', 'left'], 'Label position', 'left saves height.'),
  track: boolSlot('Show track'),
  format: formatSlot(),
}

export interface ProgressItem {
  label: string
  value: number
  max?: number
}

export interface ProgressBarProps extends Record<string, unknown> {
  items: ProgressItem[]
  showValue?: 'percent' | 'value' | 'none'
  thickness?: 'md' | 'sm' | 'lg'
  tone?: 'accent' | 'status'
  labelPos?: 'above' | 'left'
  track?: boolean
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

export const defaults: ProgressBarProps = {
  items: [
    { label: 'Onboarding', value: 82 },
    { label: 'Documentation', value: 55 },
    { label: 'Test coverage', value: 31 },
  ],
  showValue: 'percent',
  thickness: 'md',
  tone: 'accent',
  labelPos: 'above',
  track: true,
}
