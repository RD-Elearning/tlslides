/**
 * Schema and defaults for tls.l.repeater — repeats template for each item.
 */

import type { BlockSchema, BlockSpec } from '../../../types'

export const schema: BlockSchema = {
  count: {
    type: { kind: 'number', min: 1, max: 20 },
    role: 'option',
    label: 'Count',
    help: 'Number of repetitions.',
  },
  direction: {
    type: { kind: 'enum', values: ['x', 'y'] },
    role: 'option',
    label: 'Direction',
    help: 'Lay out repetitions horizontally (x) or vertically (y).',
  },
  gap: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Gap',
    help: 'Spacing between repeated items.',
  },
  children: {
    type: { kind: 'blocks', allow: ['layout', 'text', 'data', 'composite', 'media'], max: 1 },
    role: 'content',
    label: 'Children',
    help: 'Template child to repeat. First child only — it is rendered count times.',
  },
}

export interface RepeaterProps extends Record<string, unknown> {
  count: number
  direction: string
  gap: string
  children?: BlockSpec[]
}

export const defaults: RepeaterProps = {
  count: 3,
  direction: 'y',
  gap: 'sm',
}
