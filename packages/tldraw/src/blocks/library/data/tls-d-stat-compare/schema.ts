/**
 * Schema and defaults for tls.d.stat-compare — two numbers with the change between them.
 */

import type { BlockSchema, SlotSpec } from '../../../types'
import { enumSlot, formatSlot } from '../_chart/schema-kit'

const side = (label: string): SlotSpec => ({
  type: {
    kind: 'object',
    fields: {
      label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Label' },
      value: { type: { kind: 'number' }, required: true, role: 'content', label: 'Value' },
    },
  },
  role: 'content',
  label,
  required: true,
})

export const schema: BlockSchema = {
  left: side('Left (before)'),
  right: side('Right (after)'),
  caption: { type: { kind: 'text', maxChars: 100 }, role: 'content', label: 'Caption', help: 'One line of context.' },
  format: formatSlot(),
  delta: enumSlot(['percent', 'absolute', 'none'], 'Change'),
  polarity: enumSlot(['upGood', 'downGood', 'neutral'], 'Polarity', 'Which direction is good; neutral = no colour.'),
  connector: enumSlot(['arrow', 'vs', 'none'], 'Connector'),
}

export interface StatSide {
  label: string
  value: number
}

export interface StatCompareProps extends Record<string, unknown> {
  left: StatSide
  right: StatSide
  caption?: string
  format?: 'plain' | 'compact' | 'percent' | 'currency'
  delta?: 'percent' | 'absolute' | 'none'
  polarity?: 'upGood' | 'downGood' | 'neutral'
  connector?: 'arrow' | 'vs' | 'none'
}

export const defaults: StatCompareProps = {
  left: { label: 'FY2024', value: 4200 },
  right: { label: 'FY2025', value: 5460 },
  caption: 'Annual recurring revenue',
  format: 'compact',
  delta: 'percent',
  polarity: 'upGood',
  connector: 'arrow',
}
