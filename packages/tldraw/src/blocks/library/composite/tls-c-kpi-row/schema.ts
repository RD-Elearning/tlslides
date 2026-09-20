/**
 * Schema and defaults for tls.c.kpi-row — a row of 2–5 KPI tiles.
 *
 * Each tile entry contains the same fields as tls.c.kpi-tile.
 * The row delegates each tile to tls.c.kpi-tile via ctx.layoutChild.
 */

import type { BlockSchema } from '../../../types'

/** A single tile entry — mirrors KpiTileProps fields. */
export interface KpiTileEntry {
  value: number
  delta?: number
  label: string
  sparkline?: number[]
  polarity?: 'upGood' | 'downGood'
  format?: 'plain' | 'compact' | 'percent' | 'currency'
}

export interface KpiRowProps extends Record<string, unknown> {
  /** 2–5 tile entries. */
  tiles: KpiTileEntry[]
  /** Horizontal gap between tiles. */
  gap?: string
}

export const schema: BlockSchema = {
  tiles: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          value: { type: { kind: 'number' }, required: true, role: 'content', label: 'Value' },
          delta: { type: { kind: 'number' }, role: 'content', label: 'Delta' },
          label: { type: { kind: 'text', maxChars: 30 }, required: true, role: 'content', label: 'Label' },
          sparkline: {
            type: { kind: 'list', of: { kind: 'number' }, min: 2, max: 20 },
            role: 'content',
            label: 'Sparkline',
          },
          polarity: {
            type: { kind: 'enum', values: ['upGood', 'downGood'] },
            role: 'option',
            label: 'Polarity',
          },
          format: {
            type: { kind: 'enum', values: ['plain', 'compact', 'percent', 'currency'] },
            role: 'option',
            label: 'Format',
          },
        },
      },
      min: 2,
      max: 5,
    },
    role: 'content',
    label: 'KPI tiles',
    required: true,
    guidance: '2–5 KPI tiles. Each needs a value and label. Use delta for change indicators and sparkline for trend.',
  },
  gap: {
    type: { kind: 'enum', values: ['xs', 'sm', 'md', 'lg'] },
    role: 'option',
    label: 'Gap',
    help: 'Horizontal spacing between tiles.',
  },
}

export const defaults: KpiRowProps = {
  tiles: [
    { value: 4200000, delta: 12.5, label: 'Revenue', polarity: 'upGood', format: 'compact' },
    { value: 3.1, delta: -0.8, label: 'Churn %', polarity: 'downGood', format: 'percent' },
    { value: 892, delta: 42, label: 'NPS', polarity: 'upGood', format: 'plain' },
  ],
  gap: 'md',
}
