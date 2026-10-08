/**
 * Schema and defaults for tls.g.chevrons — arrow-shaped phases in a row.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const CHEVRONS_MAX = 7

export const schema: BlockSchema = {
  steps: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Label', guidance: '1-3 words naming the phase.' },
          text: { type: { kind: 'text', maxChars: 90 }, role: 'content', label: 'Note', guidance: 'One short line; optional.' },
        },
      },
      min: 3,
      max: CHEVRONS_MAX,
    },
    role: 'content',
    label: 'Phases',
    required: true,
    guidance: 'Phases in order, left to right.',
  },
  currentIndex: {
    type: { kind: 'number', min: -1, max: 20 },
    role: 'option',
    label: 'Current phase',
    help: '0-based index of the phase to highlight; -1 for none.',
  },
  fill: enumSlot(['gradient', 'single', 'series'], 'Fill', 'gradient = accent to accent2.'),
  textPlacement: enumSlot(['inside', 'below'], 'Note placement', 'below gives longer notes more room.'),
  showText: { type: { kind: 'boolean' }, role: 'option', label: 'Show notes', toggles: 'text' },
}

export interface ChevronStep {
  label: string
  text?: string
}

export interface ChevronsProps extends Record<string, unknown> {
  steps: ChevronStep[]
  currentIndex?: number
  fill?: 'gradient' | 'single' | 'series'
  textPlacement?: 'inside' | 'below'
  showText?: boolean
}

export const defaults: ChevronsProps = {
  steps: [
    { label: 'Discover', text: 'Research and framing' },
    { label: 'Design', text: 'Concepts and prototypes' },
    { label: 'Build', text: 'Implementation' },
    { label: 'Launch', text: 'Release and learn' },
  ],
  currentIndex: -1,
  fill: 'gradient',
  textPlacement: 'inside',
  showText: true,
}
