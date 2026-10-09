/**
 * Schema and defaults for tls.c.feature-grid — a grid of feature cells.
 *
 * Each cell has an icon (an id string — the registry may not resolve it; degrade
 * gracefully), a title, and a description. The grid arranges 2–6 cells in 2/3/4
 * columns. This is a `kind: 'html'` block — the template renders as real DOM, and
 * the poster supplies geometry for SVG export and thumbnails.
 */

import type { BlockSchema } from '../../../types'
import { tintOf } from '../../text/_engine/color'

export interface FeatureCell {
  icon: string
  title: string
  desc: string
}

export interface FeatureGridProps extends Record<string, unknown> {
  cells: FeatureCell[]
  columns?: 2 | 3 | 4
  gap?: number
  /** AC2: `plain` (default) or `card` — each cell on a tinted rounded card. */
  cell?: 'plain' | 'card'
  /** AC2: `start` (default) or `center` — icon and text centred in the cell. */
  align?: 'start' | 'center'
  /** AC2: `plain` (default) or `circle` — the icon on a tinted disc. */
  iconStyle?: 'plain' | 'circle'
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
            help: 'Icon id, e.g. "zap".',
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
    guidance: '2–6 features, benefits or capabilities.',
  },
  columns: {
    type: { kind: 'number', min: 2, max: 4 },
    role: 'option',
    label: 'Columns',
    guidance: 'Default 3.',
  },
  gap: {
    type: { kind: 'number', min: 8, max: 48 },
    role: 'option',
    label: 'Gap',
    guidance: 'Slide units. Default 24.',
  },
  cell: {
    type: { kind: 'enum', values: ['plain', 'card'] },
    role: 'option',
    label: 'Cell',
  },
  align: {
    type: { kind: 'enum', values: ['start', 'center'] },
    role: 'option',
    label: 'Alignment',
  },
  iconStyle: {
    type: { kind: 'enum', values: ['plain', 'circle'] },
    role: 'option',
    label: 'Icon style',
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

/** AC2 card cell: inner padding and corner radius (template and poster). */
export const FG_CARD_PAD = 28
export const FG_CARD_RADIUS = 16
/** AC2 `iconStyle: circle`: the glyph size inside the 48-unit disc. */
export const FG_CIRCLE_GLYPH = 28

/** Card background and disc tint, from the resolved tokens (same colours in template and poster). */
export function featureGridColors(color: Record<string, string> | undefined): { card: string; disc: string } {
  const surface = color?.surface ?? '#ffffff'
  const accent = color?.accent ?? '#2563eb'
  return { card: color?.surfaceAlt ?? tintOf(surface, accent, 0.06), disc: tintOf(surface, accent, 0.16) }
}
