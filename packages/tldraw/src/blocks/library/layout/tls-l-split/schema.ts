/**
 * Schema and defaults for tls.l.split — two-panel split with ratio/gutter.
 */

import type { BlockSchema, BlockSpec } from '../../../types'

export const schema: BlockSchema = {
  ratio: {
    type: { kind: 'number', min: 0.1, max: 0.9 },
    role: 'option',
    label: 'Ratio',
    help: 'Fraction of space given to the first panel (0.1–0.9).',
  },
  gutter: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Gutter',
    help: 'Spacing between panels.',
  },
  axis: {
    type: { kind: 'enum', values: ['x', 'y'] },
    role: 'option',
    label: 'Axis',
    help: 'Split direction: x (left/right) or y (top/bottom).',
  },
  children: {
    type: { kind: 'blocks', allow: ['layout', 'text', 'data', 'composite', 'media'], max: 2 },
    role: 'content',
    label: 'Children',
    help: 'Two child blocks, one per panel.',
  },
}

export interface SplitProps extends Record<string, unknown> {
  ratio: number
  gutter: string
  axis: string
  children?: BlockSpec[]
}

export const defaults: SplitProps = {
  ratio: 0.5,
  gutter: 'md',
  axis: 'x',
}
