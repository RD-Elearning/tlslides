/**
 * Schema and defaults for tls.l.grid — grid with columns/rows.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  columns: {
    kind: 'number',
    min: 1,
    max: 12,
    role: 'option',
    label: 'Columns',
    help: 'Number of grid columns.',
  },
  rows: {
    kind: 'number',
    min: 1,
    max: 12,
    role: 'option',
    label: 'Rows',
    help: 'Number of grid rows.',
  },
  gap: {
    kind: 'enum',
    values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'],
    role: 'option',
    label: 'Gap',
    help: 'Spacing between grid cells.',
  },
}

export interface GridProps {
  columns: number
  rows: number
  gap: string
}

export const defaults: GridProps = {
  columns: 2,
  rows: 2,
  gap: 'md',
}
