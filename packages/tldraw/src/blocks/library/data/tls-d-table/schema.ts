/**
 * Schema and defaults for tls.d.table — header row, aligned numbers, zebra rows, emphasis.
 */

import type { BlockSchema } from '../../../types'
import { boolSlot, enumSlot, formatSlot } from '../_chart/schema-kit'
import { COL_KINDS, TABLE_MAX_ROWS } from '../_table/kit'

export const TABLE_MAX_COLS = 8

export const schema: BlockSchema = {
  columns: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Header' },
          kind: { type: { kind: 'enum', values: COL_KINDS }, role: 'content', label: 'Cell kind', help: 'status: good/watch/bad; rating 1-5; check: yes/no/partial' },
          align: { type: { kind: 'enum', values: ['auto', 'start', 'center', 'end'] }, role: 'content', label: 'Align' },
          width: { type: { kind: 'number', min: 0 }, role: 'content', label: 'Relative width', help: 'Share of spare width' },
        },
      },
      min: 1,
      max: TABLE_MAX_COLS,
    },
    role: 'content',
    label: 'Columns',
    required: true,
    guidance: 'Set kind: number for figures.',
  },
  rows: {
    type: { kind: 'list', of: { kind: 'list', of: { kind: 'text', maxChars: 60 } }, min: 1, max: TABLE_MAX_ROWS },
    role: 'content',
    label: 'Rows',
    required: true,
    guidance: 'One string per column.',
  },
  footer: {
    type: { kind: 'list', of: { kind: 'text', maxChars: 40 } },
    role: 'content',
    label: 'Footer row',
  },
  zebra: boolSlot('Zebra rows'),
  rules: enumSlot(['horizontal', 'head', 'none'], 'Rules'),
  header: enumSlot(['filled', 'bold', 'none'], 'Header style'),
  emphasisRow: { type: { kind: 'number', min: -1 }, role: 'option', label: 'Emphasised row (-1 none)' },
  emphasisCol: { type: { kind: 'number', min: -1 }, role: 'option', label: 'Emphasised column (-1 none)' },
  density: enumSlot(['default', 'compact'], 'Density'),
  format: formatSlot(),
  showFooter: { type: { kind: 'boolean' }, role: 'option', label: 'Show footer', toggles: 'footer' },
}

export interface TableColumn {
  label: string
  kind?: 'text' | 'number' | 'status' | 'rating' | 'check'
  align?: 'auto' | 'start' | 'center' | 'end'
  width?: number
}

export interface TableProps extends Record<string, unknown> {
  columns: TableColumn[]
  rows: string[][]
  footer?: string[]
  zebra?: boolean
  rules?: 'horizontal' | 'head' | 'none'
  header?: 'filled' | 'bold' | 'none'
  emphasisRow?: number
  emphasisCol?: number
  density?: 'default' | 'compact'
  format?: 'plain' | 'compact' | 'percent' | 'currency'
  showFooter?: boolean
}

export const defaults: TableProps = {
  columns: [
    { label: 'Region' },
    { label: 'Revenue', kind: 'number' },
    { label: 'Growth', kind: 'number' },
    { label: 'Status', kind: 'status' },
  ],
  rows: [
    ['North America', '4,820', '12%', 'good'],
    ['Europe', '3,150', '4%', 'watch'],
    ['Asia Pacific', '2,740', '21%', 'good'],
    ['Latin America', '980', '-3%', 'bad'],
    ['Middle East', '640', '9%', 'good'],
  ],
  footer: ['Total', '12,330', '9%', ''],
  zebra: true,
  rules: 'none',
  header: 'filled',
  density: 'default',
  showFooter: true,
}
