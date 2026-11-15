/**
 * Schema and defaults for tls.l.stack — vertical stack with gap.
 */

import type { BlockSchema, BlockSpec } from '../../../types'

export const schema: BlockSchema = {
  gap: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Gap',
    help: 'Spacing between stacked children.',
  },
  children: {
    type: { kind: 'blocks', allow: ['layout', 'text', 'data', 'diagram', 'composite', 'media'] },
    role: 'content',
    label: 'Children',
    help: 'Child blocks stacked vertically.',
  },
  justify: {
    type: { kind: 'enum', values: ['start', 'center', 'end', 'between'] },
    role: 'option',
    label: 'Justify',
    help: 'S11: with sizing content, where the children sit along the main axis (between = the free space between them).',
  },
  sizing: {
    type: { kind: 'enum', values: ['equal', 'content'] },
    role: 'option',
    label: 'Sizing',
    help: 'How to distribute space among children: equal (same size) or content (sized to intrinsic).',
  },
}

export interface StackProps extends Record<string, unknown> {
  gap: string
  children?: BlockSpec[]
  sizing?: 'equal' | 'content'
  /** S11: with sizing content, main-axis placement (no stretch to fill). */
  justify?: 'start' | 'center' | 'end' | 'between'
}

export const defaults: StackProps = {
  gap: 'md',
  children: [],
  sizing: 'equal',
}
