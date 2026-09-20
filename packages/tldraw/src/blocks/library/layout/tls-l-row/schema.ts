/**
 * Schema and defaults for tls.l.row — horizontal row with gap.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  gap: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Gap',
    help: 'Spacing between row children.',
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
  sizing?: 'equal' | 'content'
}

export const defaults: RowProps = {
  gap: 'md',
  sizing: 'equal',
}
