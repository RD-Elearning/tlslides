/**
 * Schema and defaults for tls.g.bracket — items grouped under one label by a curly brace.
 */

import type { BlockSchema } from '../../../types'
import { enumSlot } from '../../data/_chart/schema-kit'

export const BRACKET_MIN = 2
export const BRACKET_MAX = 6

export const schema: BlockSchema = {
  label: { type: { kind: 'text', maxChars: 40 }, required: true, role: 'content', label: 'Group label', guidance: 'What the items form together, 1-5 words.' },
  items: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 60 }, min: BRACKET_MIN, max: BRACKET_MAX },
    role: 'content',
    label: 'Items',
    required: true,
    guidance: 'The members, short phrases.',
  },
  side: enumSlot(['right', 'left', 'top'], 'Side', 'Where the label sits relative to the items.'),
  style: enumSlot(['brace', 'bracket'], 'Style', 'brace = curly, bracket = square.'),
}

export interface BracketProps extends Record<string, unknown> {
  label: string
  items: string[]
  side?: 'right' | 'left' | 'top'
  style?: 'brace' | 'bracket'
}

export const defaults: BracketProps = {
  label: 'Core team',
  items: ['Product lead', 'Tech lead', 'Design lead'],
  side: 'right',
  style: 'brace',
}
