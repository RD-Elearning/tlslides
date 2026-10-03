/**
 * Pure layout for tls.d.line — see `_chart/line-family.ts` for the geometry.
 */

import type { CapacityReport, LayoutContext, LayoutNode, Size } from '../../../types'
import type { LineProps } from './schema'
import { LINE_MAX_CATEGORIES, LINE_MAX_SERIES, lineFamilyLayout } from '../_chart/line-family'
import { asArr, capacityOf } from '../_chart/kit'

export function layout(props: LineProps, ctx: LayoutContext): LayoutNode {
  return lineFamilyLayout('line', props, ctx)
}

export function capacity(props: LineProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  return capacityOf(
    { categories: { max: LINE_MAX_CATEGORIES, used: asArr(props.categories).length }, series: { max: LINE_MAX_SERIES, used: asArr(props.series).length } },
    true,
    [{ kind: 'truncate', slot: 'series' }]
  )
}
