/**
 * Pure layout for tls.d.stacked-bar — see `_chart/bar-family.ts` for the geometry.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { StackedBarProps } from './schema'
import { BAR_MAX_CATEGORIES, STACKED_MAX_SERIES, barFamilyLayout } from '../_chart/bar-family'
import { asArr, capacityOf } from '../_chart/kit'

export function layout(props: StackedBarProps, ctx: LayoutContext): LayoutNode {
  return barFamilyLayout('stacked', props, ctx)
}

export function capacity(props: StackedBarProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  return capacityOf(
    { categories: { max: BAR_MAX_CATEGORIES, used: asArr(props.categories).length }, series: { max: STACKED_MAX_SERIES, used: asArr(props.series).length } },
    true,
    [{ kind: 'truncate', slot: 'series' }]
  )
}
