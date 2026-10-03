/**
 * Pure layout for tls.d.area — see `_chart/line-family.ts` for the geometry.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { AreaProps } from './schema'
import { LINE_MAX_CATEGORIES, LINE_MAX_SERIES, lineFamilyLayout } from '../_chart/line-family'
import { asArr, capacityOf } from '../_chart/kit'

export function layout(props: AreaProps, ctx: LayoutContext): LayoutNode {
  return lineFamilyLayout('area', props, ctx)
}

export function capacity(props: AreaProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  return capacityOf(
    { categories: { max: LINE_MAX_CATEGORIES, used: asArr(props.categories).length }, series: { max: LINE_MAX_SERIES, used: asArr(props.series).length } },
    true,
    [{ kind: 'truncate', slot: 'series' }]
  )
}
