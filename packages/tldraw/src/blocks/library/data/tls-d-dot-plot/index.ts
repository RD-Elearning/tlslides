/**
 * tls.d.dot-plot — Rows of one value each: a dot on a quiet track on a shared scale, the label left, the value after the dot. (spro creative CR13).
 */
import type { BlockDefinition } from '../../../types'
import { dotLayout, dotCapacity, type DotProps } from '../_chart/dot-family'
import { dotSchema, dotDefaults, dotMotion } from '../_chart/dot-family-schema'

export const tlsDDotPlot: BlockDefinition = {
  type: 'tls.d.dot-plot',
  name: 'Dot plot',
  family: 'data',
  tier: 'A',
  summary: 'Rows of one value each: a dot on a quiet track on a shared scale, the label left, the value after the dot.',
  keywords: ['dot plot', 'strip', 'dot chart', 'compare values', 'ranking'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Rows of one value each: a dot on a quiet track, one highlighted',
  related: ['tls.d.bar', 'tls.d.ranking', 'tls.d.slope'],
  describe: {
    when: 'Compare values across many categories at a glance, one highlighted.',
    avoid: 'Parts of a whole: tls.d.donut or tls.d.pie. A time series: tls.d.line.',
    example: { id: 'b_dot-plot', type: 'tls.d.dot-plot', props: { items: [{ label: 'A', value: 82 }, { label: 'B', value: 64 }, { label: 'C', value: 51 }] } },
  },
  schema: dotSchema,
  defaults: dotDefaults,
  size: { preferred: [900, 420], min: [350, 200] },
  layout: ((props: DotProps, ctx) => dotLayout(props, ctx, 'dot-plot')) as BlockDefinition['layout'],
  motion: dotMotion('dot'),
  capacity: ((props: DotProps, box) => dotCapacity(props, box)) as BlockDefinition['capacity'],
}
