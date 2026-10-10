/**
 * Schema and defaults for tls.t.marker — a step number in a circle, or an oversized numeral
 * (CMP3 atom).
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  value: {
    type: { kind: 'text', maxChars: 4 },
    role: 'content',
    label: 'Number',
    required: true,
    guidance: 'The step or item number as it should read: "1", "02", "A". At most 4 characters.',
  },
  variant: {
    type: { kind: 'enum', values: ['circle', 'numeral'] },
    role: 'option',
    label: 'Variant',
    help: 'circle = the number on a disc (default); numeral = an oversized accent numeral, no disc.',
  },
  tone: {
    type: { kind: 'enum', values: ['solid', 'soft', 'outline'] },
    role: 'option',
    label: 'Tone',
    help: 'The disc of a circle marker: solid accent (default), soft tint, or an outline ring.',
  },
  size: {
    type: { kind: 'enum', values: ['md', 'sm', 'lg'] },
    role: 'option',
    label: 'Size',
    help: 'circle: sm 48, md 72, lg 104 units across; numeral: sm 64, md 112, lg 168 units tall type.',
  },
}

export interface MarkerProps extends Record<string, unknown> {
  value: string
  variant?: 'circle' | 'numeral'
  tone?: 'solid' | 'soft' | 'outline'
  size?: 'md' | 'sm' | 'lg'
}

export const defaults: MarkerProps = {
  value: '1',
  variant: 'circle',
  tone: 'solid',
  size: 'md',
}
