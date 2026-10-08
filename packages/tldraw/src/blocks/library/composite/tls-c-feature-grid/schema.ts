/**
 * Schema and defaults for tls.c.feature-grid — a grid of feature cells.
 *
 * Each cell has an icon (an id string — the registry may not resolve it; degrade
 * gracefully), a title, and a description. The grid arranges 2–6 cells in 2/3/4
 * columns. This is a `kind: 'html'` block — the template renders as real DOM, and
 * the poster supplies geometry for SVG export and thumbnails.
 */

import type { BlockSchema } from '../../../types'

export interface FeatureCell {
  icon: string
  title: string
  desc: string
}

export interface FeatureGridProps extends Record<string, unknown> {
  cells: FeatureCell[]
  columns?: 2 | 3 | 4
  gap?: number
}

export const schema: BlockSchema = {
  cells: {
    type: {
      kind: 'list',
      of: {
        kind: 'object',
        fields: {
          icon: {
            type: { kind: 'icon' },
            role: 'content',
            label: 'Icon',
            help: 'Icon id, e.g. "zap". Unresolvable ids degrade to a labelled frame.',
          },
          title: {
            type: { kind: 'text', maxChars: 40 },
            required: true,
            role: 'content',
            label: 'Title',
            guidance: '1–4 words naming the feature.',
          },
          desc: {
            type: { kind: 'text', maxChars: 160 },
            required: true,
            role: 'content',
            label: 'Description',
            guidance: 'One sentence explaining the feature or benefit.',
          },
        },
      },
      min: 2,
      max: 6,
    },
    role: 'content',
    label: 'Feature cells',
    required: true,
    guidance:
      'List of 2–6 feature cells, each with icon (icon id string), title (short, 1–4 words), ' +
      'and desc (one sentence). Describe features, benefits, or capabilities.',
  },
  columns: {
    type: { kind: 'number', min: 2, max: 4 },
    role: 'option',
    label: 'Columns',
    guidance: 'Number of columns: 2, 3, or 4. Default is 3.',
  },
  gap: {
    type: { kind: 'number', min: 8, max: 48 },
    role: 'option',
    label: 'Gap',
    guidance: 'Gap between cells in slide units. Default 24.',
  },
}

export const defaults: FeatureGridProps = {
  cells: [
    { icon: 'zap', title: 'Fast', desc: 'Optimised for speed at every layer of the stack.' },
    { icon: 'shield', title: 'Secure', desc: 'End-to-end encryption keeps your data safe.' },
    { icon: 'globe', title: 'Global', desc: 'Deployed across 30+ regions worldwide.' },
  ],
  columns: 3,
  gap: 24,
}

/** Narrowest a cell may get before the grid drops a column (same rule in the template and the poster). */
export const MIN_CELL_WIDTH = 200

/** Columns that really fit: the requested count, fewer when the box is too narrow (RV03). */
export function effectiveColumns(width: number, columns: number | undefined, gap: number, count: number): number {
  const want = Math.max(1, Math.min(4, Math.round(Number(columns) || 3)))
  const fit = Math.max(1, Math.floor((width + gap) / (MIN_CELL_WIDTH + gap)))
  return Math.max(1, Math.min(want, fit, Math.max(1, count)))
}
