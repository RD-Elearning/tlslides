/**
 * Schema and defaults for tls.l.row — horizontal row with gap.
 *
 * Phase 4.2: Added per-child sizing support (fill/auto/weight).
 */

import type { BlockSchema, BlockSpec } from '../../../types'

export const schema: BlockSchema = {
  gap: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Gap',
    help: 'Spacing between row children.',
  },
  children: {
    type: { kind: 'blocks', allow: ['layout', 'text', 'data', 'composite', 'media'] },
    role: 'content',
    label: 'Children',
    help: 'Child blocks arranged horizontally.',
  },
  sizing: {
    type: { kind: 'enum', values: ['equal', 'content'] },
    role: 'option',
    label: 'Sizing',
    help: 'How to distribute space among children: equal (same size) or content (sized to intrinsic).',
  },
}

export interface RowProps extends Record<string, unknown> {
  gap: string
  children?: BlockSpec[]
  sizing?: 'equal' | 'content'
}

export const defaults: RowProps = {
  gap: 'md',
  children: [],
  sizing: 'equal',
}
