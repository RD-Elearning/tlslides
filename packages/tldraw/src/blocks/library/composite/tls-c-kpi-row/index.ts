/**
 * tls.c.kpi-row — a row of 2–5 KPI tiles.
 *
 * Tier-A composite block that delegates each tile to tls.c.kpi-tile via
 * ctx.layoutChild. No new LayoutNode kind; no re-implemented tile layout.
 *
 * The kpi-tile definition must be registered in the registry the row is
 * laid out with. The kpi-tile definition is therefore a dependency of
 * this block's layout at runtime.
 */

import type { BlockDefinition, LayoutContext, CapacityReport } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

/** Minimum sensible tile width — below this the KPI text becomes unreadable. */
const MIN_TILE_WIDTH = 200

/**
 * capacity() — returns how many tiles fit at the given box size.
 * Derived from MIN_TILE_WIDTH: maxTiles = floor(availableWidth / MIN_TILE_WIDTH),
 * clamped to the schema range [2, 5].
 */
function capacity(
  props: import('./schema').KpiRowProps,
  box: { width: number; height: number },
  ctx: LayoutContext,
): CapacityReport {
  const innerWidth = box.width - 2 * ctx.tokens.space.md
  const innerHeight = box.height - 2 * ctx.tokens.space.md

  const maxByWidth = Math.floor(innerWidth / MIN_TILE_WIDTH)
  const tileCount = Math.max(2, Math.min(5, maxByWidth))

  const currentTiles = props.tiles?.length ?? 0
  const fits = currentTiles <= tileCount && currentTiles >= 2 && innerHeight > 100

  return {
    fits,
    budget: {
      tiles: {
        max: tileCount,
        used: currentTiles,
        unit: 'items',
      },
    },
    remedy: fits ? [] : [
      { kind: 'truncate', slot: 'tiles' },
    ],
  }
}

export const tlsCKpiRow: BlockDefinition = {
  type: 'tls.c.kpi-row',
  name: 'KPI Row',
  family: 'composite',
  tier: 'A',
  summary: 'Row of 2–5 KPI tiles with equal-width split. Each tile delegates to tls.c.kpi-tile.',
  keywords: ['kpi', 'row', 'tiles', 'dashboard', 'metrics', 'numbers', 'stats'],
  describe: {
    when: 'Use to display 2–5 KPI metrics side-by-side in a row. Good for dashboards and summary slides.',
    avoid: 'Do not use for a single KPI — use tls.c.kpi-tile. Do not use for more than 5 KPIs — split across slides.',
    example: {
      id: 'b_kpi_row',
      type: 'tls.c.kpi-row',
      props: {
        tiles: [
          { value: 4200000, delta: 12.5, label: 'Revenue', polarity: 'upGood', format: 'compact' },
          { value: 3.1, delta: -0.8, label: 'Churn %', polarity: 'downGood', format: 'percent' },
          { value: 892, delta: 42, label: 'NPS', polarity: 'upGood', format: 'plain' },
        ],
        gap: 'md',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [1200, 260], min: [400, 180] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity,
}
