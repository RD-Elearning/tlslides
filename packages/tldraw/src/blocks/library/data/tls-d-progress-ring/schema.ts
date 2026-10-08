/**
 * Schema and defaults for tls.d.progress-ring — one value shown as a filled ring.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../_chart/schema-kit'

export const schema: BlockSchema = {
  value: { type: { kind: 'number' }, role: 'content', label: 'Value', required: true, guidance: 'Ring fills to value / max.' },
  max: { type: { kind: 'number' }, role: 'content', label: 'Maximum', help: 'Value that fills the ring. Default 100.' },
  label: { type: { kind: 'text', maxChars: 40 }, role: 'content', label: 'Label', help: 'What it measures.' },
  caption: { type: { kind: 'text', maxChars: 80 }, role: 'content', label: 'Caption', help: 'One line of context.' },
  thickness: enumSlot(['md', 'sm', 'lg'], 'Thickness'),
  cap: enumSlot(['round', 'flat'], 'Line end'),
  tone: enumSlot(['accent', 'status'], 'Colour', 'status = red/amber/green by progress.'),
  format: enumSlot(['percent', 'plain', 'compact', 'currency'], 'Centre text', 'percent = share of max.'),
}

export interface ProgressRingProps extends Record<string, unknown> {
  value: number
  max?: number
  label?: string
  caption?: string
  thickness?: 'md' | 'sm' | 'lg'
  cap?: 'round' | 'flat'
  tone?: 'accent' | 'status'
  format?: 'percent' | 'plain' | 'compact' | 'currency'
}

export const defaults: ProgressRingProps = {
  value: 72,
  max: 100,
  label: 'Completion',
  caption: 'Of the Q3 roadmap',
  thickness: 'md',
  cap: 'round',
  tone: 'accent',
  format: 'percent',
}
