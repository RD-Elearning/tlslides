/**
 * Schema and defaults for tls.c.comparison — comparison of 2–3 columns.
 *
 * Each column has a title and a list of short text items. An optional
 * `highlight` prop names a column index (0-based) to receive accent
 * treatment; null or absent means no highlight.
 */

import type { BlockSchema } from '../../../types'

export interface ComparisonColumn {
  /** Column heading — short, 2–6 words. */
  title: string
  /** Bullet items in this column — each a short phrase. */
  items: string[]
}

export interface ComparisonProps extends Record<string, unknown> {
  /** 2–3 columns to compare side by side. */
  columns: ComparisonColumn[]
  /** Index of the highlighted column (0-based), or null for none. */
  highlight?: number | null
}

export const schema: BlockSchema = {
  columns: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          title: {
            type: { kind: 'text', maxChars: 60 },
            required: true,
            role: 'content',
            label: 'Column title',
          },
          items: {
            type: {
              kind: 'list',
              of: { kind: 'text', maxChars: 120 },
              min: 1,
              max: 12,
            },
            required: true,
            role: 'content',
            label: 'Column items',
          },
        },
      },
      min: 2,
      max: 3,
    },
    role: 'content',
    label: 'Comparison columns',
    help: 'Columns to compare. Each column has a title and a list of bullet items.',
    required: true,
    guidance:
      '2–3 columns, each with a short title (2–6 words) and 2–6 short items (2–8 words each).',
  },
  highlight: {
    type: { kind: 'number' },
    role: 'option',
    label: 'Highlighted column',
    help: 'Index (0-based) of the column to highlight with accent colour. Omit or null for none.',
  },
}

export const defaults: ComparisonProps = {
  columns: [
    {
      title: 'Approach A',
      items: ['Fast execution', 'Lower cost', 'Limited scope'],
    },
    {
      title: 'Approach B',
      items: ['Thorough analysis', 'Higher investment', 'Full coverage'],
    },
  ],
  highlight: null,
}
