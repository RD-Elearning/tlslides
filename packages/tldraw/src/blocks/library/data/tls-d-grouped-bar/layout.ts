/**
 * Pure layout for tls.d.grouped-bar — see `_chart/bar-family.ts` for the geometry.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { GroupedBarProps } from './schema'
import { BAR_MAX_CATEGORIES, GROUPED_MAX_SERIES, barFamilyLayout } from '../_chart/bar-family'
import { asArr, capacityOf } from '../_chart/kit'

export function layout(props: GroupedBarProps, ctx: LayoutContext): LayoutNode {
  return barFamilyLayout('grouped', props, ctx)
}

export function capacity(props: GroupedBarProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  const series = asArr(props.series).length
  return capacityOf(
    { categories: { max: BAR_MAX_CATEGORIES, used: asArr(props.categories).length }, series: { max: GROUPED_MAX_SERIES, used: series } },
    true,
    [{ kind: 'truncate', slot: 'series' }]
  )
}
