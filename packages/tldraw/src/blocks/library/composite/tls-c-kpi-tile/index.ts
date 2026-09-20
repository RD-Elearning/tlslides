/**
 * tls.c.kpi-tile — KPI tile (value + delta + label + optional sparkline).
 *
 * Replaces tls.t.hero-number for KPI contexts. Tier-A composite block
 * that delegates all rendering to text and path nodes via pure layout().
 *
 * The delta colour is polarity-driven: 'upGood' means a positive delta
 * is good (uses 'positive' role); 'downGood' means a positive delta is
 * bad (uses 'negative' role). All colours come from ctx.resolveColor —
 * no literal hex anywhere.
 */

import type { BlockDefinition, LayoutContext, CapacityReport } from '../../../types'
import { schema, defaults } from './schema'
import { layout } from './layout'
import { motion } from './motion'

/**
 * capacity() — reports whether the tile's value/label/delta fit the box
 * at the given size. Checks:
 *   1. label text fits within the box width
 *   2. value text fits within the box width
 *   3. delta text fits within the box width
 *   4. vertical: total content height <= box height
 */
function capacity(
  props: import('./schema').KpiTileProps,
  box: { width: number; height: number },
  ctx: LayoutContext,
): CapacityReport {
  const pad = ctx.tokens.space.md
  const innerWidth = Math.max(0, box.width - 2 * pad)
  const innerHeight = Math.max(0, box.height - 2 * pad)

  // Measure each text part
  const labelStyle = ctx.resolveText('caption')
  const labelMetrics = ctx.measureText(props.label ?? '', labelStyle, innerWidth)

  const valueStyle = ctx.resolveText('heading')
  const formatted = String(props.value)
  const valueMetrics = ctx.measureText(formatted, valueStyle, innerWidth)

  const delta = props.delta
  const hasDelta = delta != null
  const deltaStyle = ctx.resolveText('caption')
  const deltaText = delta != null ? `${delta >= 0 ? '+' : ''}${delta}` : ''
  const deltaMetrics = ctx.measureText(deltaText, deltaStyle, innerWidth)

  const xs = ctx.tokens.space.xs
  const totalHeight =
    labelMetrics.height +
    xs +
    valueMetrics.height +
    xs +
    (hasDelta ? deltaMetrics.height : 0)

  const fits = totalHeight <= innerHeight

  const budget: CapacityReport['budget'] = {
    label: { max: innerWidth, used: labelMetrics.width, unit: 'chars' },
    value: { max: innerWidth, used: valueMetrics.width, unit: 'chars' },
  }
  if (hasDelta) {
    budget.delta = { max: innerWidth, used: deltaMetrics.width, unit: 'chars' }
  }

  return {
    fits,
    budget,
    remedy: fits ? [] : [{ kind: 'shrink', minScale: 0.75 }],
  }
}

export const tlsCKpiTile: BlockDefinition = {
  type: 'tls.c.kpi-tile',
  name: 'KPI Tile',
  family: 'composite',
  tier: 'A',
  summary: 'Single KPI metric: headline number, change indicator, label, optional sparkline. Polarity-driven colour.',
  keywords: ['kpi', 'tile', 'metric', 'number', 'stat', 'value', 'delta', 'sparkline', 'dashboard'],
  describe: {
    when: 'Use to display a single KPI metric with its value, change indicator, and optional trend line.',
    avoid: 'Do not use for multiple KPIs side-by-side — use tls.c.kpi-row. Do not use for non-numeric hero text — use tls.t.title.',
    example: {
      id: 'b_kpi_tile',
      type: 'tls.c.kpi-tile',
      props: {
        value: 4200000,
        delta: 12.5,
        label: 'Revenue',
        polarity: 'upGood',
        format: 'compact',
      },
    },
  },
  schema,
  defaults,
  size: { preferred: [400, 220], min: [200, 140] },
  layout: layout as BlockDefinition['layout'],
  motion,
  capacity,
}
