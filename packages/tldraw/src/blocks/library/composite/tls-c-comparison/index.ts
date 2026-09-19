/**
 * tls.c.comparison — side-by-side comparison of 2–3 columns.
 *
 * A composite block: each column has a title and a list of items.
 * An optional `highlight` prop names a column index to receive accent
 * treatment (accent surface/edge via ctx.resolveColor — never literal hex).
 *
 * Tier A: pure layout(), no DOM, no React. Parity-tested.
 *
 * Delegates to:
 *   - tls.t.title for column titles (via ctx.layoutChild)
 *   - ctx.measureText for item text (same pattern as tls.c.agenda)
 *
 * Parts (exact data-part strings emitted by layout):
 *   col/{colIndex}/title
 *   col/{colIndex}/item/{itemIndex}
 * where colIndex is 0-based and itemIndex is 0-based within each column.
 *
 * In motion.parts these appear as wildcard patterns:
 *   col/[star]/title
 *   col/[star]/item/[star]
 */

import type { BlockDefinition, CapacityReport, LayoutContext, Size } from '../../../types'
import { schema, defaults } from './schema'
import { layout, estimateItemsPerColumn } from './layout'
import { motion } from './motion'

/** Summary for the AI: what this block is and when to use it. */
const COMPARISON_SUMMARY =
  'Side-by-side comparison of 2–3 columns, each with a title and a list of items. ' +
  'Use to contrast options, plans, or viewpoints. Highlight the recommended column with the `highlight` prop.'

export const tlsCComparison: BlockDefinition = {
  type: 'tls.c.comparison',
  name: 'Comparison',
  family: 'composite',
  tier: 'A',
  summary: COMPARISON_SUMMARY,
  keywords: [
    'comparison',
    'versus',
    'compare',
    'columns',
    'side by side',
    'options',
    'contrast',
    'pros',
    'cons',
    'alternatives',
  ],
  describe: {
    when:
      'Use to compare 2–3 options, plans, or viewpoints side by side. ' +
      'Set `highlight` to draw attention to the recommended column.',
    avoid:
      'Do not use for more than 3 columns — split into two slides. ' +
      'Do not use for sequential processes — use tls.c.steps.',
    example: {
      id: 'b_comparison',
      type: 'tls.c.comparison',
      props: {
        columns: [
          {
            title: 'Build In-House',
            items: ['Full control', 'Higher upfront cost', 'Longer timeline'],
          },
          {
            title: 'Buy SaaS',
            items: ['Quick setup', 'Lower upfront cost', 'Vendor lock-in risk'],
          },
          {
            title: 'Hybrid',
            items: ['Balanced approach', 'Moderate cost', 'Flexible roadmap'],
          },
        ],
        highlight: 2,
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [960, 540], min: [280, 120] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity(
    props: Record<string, unknown>,
    box: Size,
    ctx: LayoutContext,
  ): CapacityReport {
    const p = props as import('./schema').ComparisonProps
    const columnCount = Math.max(2, Math.min(3, (p.columns ?? []).length))
    const maxItemsPerCol = estimateItemsPerColumn(ctx, box, columnCount)

    // Find the column with the most items
    const maxActualItems = Math.max(
      0,
      ...p.columns.map((c) => (c.items ?? []).length),
    )

    const fits = maxActualItems <= maxItemsPerCol && columnCount <= 3 && columnCount >= 2

    return {
      fits,
      budget: {
        items: {
          max: maxItemsPerCol,
          used: maxActualItems,
          unit: 'items',
        },
        columns: {
          max: 3,
          used: columnCount,
          unit: 'items',
        },
      },
      remedy: fits
        ? []
        : [
            { kind: 'truncate', slot: 'columns' },
          ],
    }
  },
}
