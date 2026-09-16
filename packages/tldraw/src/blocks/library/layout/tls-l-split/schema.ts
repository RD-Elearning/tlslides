/**
 * Schema and defaults for tls.l.split — two-panel split with ratio/gutter.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  ratio: {
    kind: 'number',
    min: 0.1,
    max: 0.9,
    role: 'option',
    label: 'Ratio',
    help: 'Fraction of space given to the first panel (0.1–0.9).',
  },
  gutter: {
    kind: 'enum',
    values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'],
    role: 'option',
    label: 'Gutter',
    help: 'Spacing between panels.',
  },
  axis: {
    kind: 'enum',
    values: ['x', 'y'],
    role: 'option',
    label: 'Axis',
    help: 'Split direction: x (left/right) or y (top/bottom).',
  },
}

export interface SplitProps {
  ratio: number
  gutter: string
  axis: string
}

export const defaults: SplitProps = {
  ratio: 0.5,
  gutter: 'md',
  axis: 'x',
}
