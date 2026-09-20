/**
 * Schema and defaults for tls.l.grid — grid with columns/rows.
 */

import type { BlockSchema } from '../../../types'

export const schema: BlockSchema = {
  columns: {
    type: { kind: 'number', min: 1, max: 12 },
    role: 'option',
    label: 'Columns',
    help: 'Number of grid columns.',
  },
  rows: {
    type: { kind: 'number', min: 1, max: 12 },
    role: 'option',
    label: 'Rows',
    help: 'Number of grid rows.',
  },
  gap: {
    type: { kind: 'enum', values: ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] },
    role: 'option',
    label: 'Gap',
    help: 'Spacing between grid cells.',
  },
  sizing: {
    type: { kind: 'enum', values: ['equal', 'content'] },
    role: 'option',
    label: 'Sizing',
    help: 'How to distribute space among cells: equal (same size) or content (sized to intrinsic).',
  },
}

export interface GridProps extends Record<string, unknown> {
  columns: number
  rows: number
  gap: string
  sizing?: 'equal' | 'content'
}

export const defaults: GridProps = {
  columns: 2,
  rows: 2,
  gap: 'md',
  sizing: 'equal',
}
