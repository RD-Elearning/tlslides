/**
 * Layout for tls.d.donut — the pie engine with a hole.
 *
 * Shares `tls.d.pie`'s layout (labels outside with leaders, or a legend that takes over when the
 * box is too small; slices from 12 o'clock; more than six fold into "Other"), draws the ring with
 * `ringArcPath`, leaves the rest of the ring empty when `total` exceeds the slices, and prints
 * `centerValue` / `centerLabel` inside the hole, shrunk to fit it.
 *
 * Pure and DOM-free: no `document`, `window`, `Date.now()`, `Math.random()`.
 */

import type { LayoutContext, LayoutNode } from '../../../types'
import type { DonutProps } from './schema'
import { DONUT_COLORS } from './schema'
import { layout as pieLayout } from '../tls-d-pie/layout'
import type { PieProps } from '../tls-d-pie/schema'
import { asArr, enumOf, numOrNull, str } from '../_chart/kit'

const HOLE = 0.6

export function layout(props: DonutProps, ctx: LayoutContext): LayoutNode {
  const rows = asArr<Record<string, unknown>>(props.slices).filter((s) => s && typeof s === 'object')
  const pie: PieProps = {
    categories: rows.map((s, i) => str(s.label) || `Slice ${i + 1}`),
    values: rows.map((s) => numOrNull(s.value) ?? 0),
    labels: enumOf(props.labels, ['legend', 'outside'] as const, 'legend'),
    showPercent: props.showPercent !== false,
    sort: 'none',
  }
  const colors = rows.map((s) => {
    const role = enumOf(s.color, DONUT_COLORS, 'accent')
    return typeof s.color === 'string' && (DONUT_COLORS as readonly string[]).includes(s.color) ? ctx.resolveColor(role).color : undefined
  })
  const value = str(props.centerValue).trim()
  const label = str(props.centerLabel).trim()
  return pieLayout(pie, ctx, {
    hole: HOLE,
    colors,
    total: numOrNull(props.total) ?? undefined,
    centre: value ? { value, ...(label ? { label } : {}) } : undefined,
  })
}
