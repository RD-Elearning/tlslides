/**
 * Schema and defaults for tls.d.compare-table — options against criteria.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, enumSlot } from '../_chart/schema-kit'

export const COMPARE_MAX_OPTIONS = 5
export const COMPARE_MAX_CRITERIA = 12

export const schema: BlockSchema = {
  options: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 24 }, min: 2, max: COMPARE_MAX_OPTIONS },
    role: 'content',
    label: 'Options',
    required: true,
    guidance: 'Column headers: the things compared.',
  },
  criteria: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 40 }, min: 2, max: COMPARE_MAX_CRITERIA },
    role: 'content',
    label: 'Criteria',
    required: true,
    guidance: 'Row labels, one per row of cells.',
  },
  cells: {
    type: { kind: 'list', of: { kind: 'list', of: { kind: 'text', maxChars: 30 } } },
    role: 'content',
    label: 'Cells',
    required: true,
    guidance: 'cells[criterion][option]: yes, no, partial, 1-5 or short text.',
  },
  cellKind: enumSlot(['check', 'rating', 'text'], 'Cell kind', 'check: ticks and crosses; rating: dots; text: as written'),
  winner: { type: { kind: 'number', min: -1 }, role: 'option', label: 'Winning option index (-1 none)' },
  zebra: boolSlot('Zebra rows'),
  density: enumSlot(['default', 'compact'], 'Density'),
}

export interface CompareTableProps extends Record<string, unknown> {
  options: string[]
  criteria: string[]
  cells: string[][]
  cellKind?: 'check' | 'rating' | 'text'
  winner?: number
  zebra?: boolean
  density?: 'default' | 'compact'
}

export const defaults: CompareTableProps = {
  options: ['Ours', 'Vendor A', 'Vendor B'],
  criteria: ['Works offline', 'Single sign-on', 'Open API', 'Priority support', 'Audit log'],
  cells: [
    ['yes', 'no', 'partial'],
    ['yes', 'yes', 'no'],
    ['yes', 'partial', 'yes'],
    ['yes', 'no', 'no'],
    ['yes', 'yes', 'partial'],
  ],
  cellKind: 'check',
  winner: 0,
  zebra: true,
  density: 'default',
}
