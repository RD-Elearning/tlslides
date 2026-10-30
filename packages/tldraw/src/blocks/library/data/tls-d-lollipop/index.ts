/**
 * tls.d.lollipop — Rows of one value each: a stem and a dot on a shared scale, the label left, the value after the dot. (spro creative CR13).
 */
import type { BlockDefinition } from '../../../types'
import { dotLayout, dotCapacity, type DotProps } from '../_chart/dot-family'
import { dotSchema, dotDefaults, dotMotion } from '../_chart/dot-family-schema'

export const tlsDLollipop: BlockDefinition = {
  type: 'tls.d.lollipop',
  name: 'Lollipop',
  family: 'data',
  tier: 'A',
  summary: 'Rows of one value each: a stem and a dot on a shared scale, the label left, the value after the dot.',
  keywords: ['lollipop', 'dot chart', 'cleveland', 'ranking', 'compare values'],
  category: 'chart',
  scope: 'group',
  shortDescription: 'Rows of one value each: a stem and a dot on a shared scale',
  related: ['tls.d.bar', 'tls.d.ranking', 'tls.d.slope'],
  describe: {
    when: 'Compare a few values across categories where bars would be heavy; one row is the point.',
    avoid: 'Parts of a whole: tls.d.donut or tls.d.pie. A time series: tls.d.line.',
    example: { id: 'b_lollipop', type: 'tls.d.lollipop', props: { items: [{ label: 'A', value: 82 }, { label: 'B', value: 64 }, { label: 'C', value: 51 }] } },
  },
  schema: dotSchema,
  defaults: dotDefaults,
  size: { preferred: [900, 420], min: [350, 200] },
  layout: ((props: DotProps, ctx) => dotLayout(props, ctx, 'lollipop')) as BlockDefinition['layout'],
  motion: dotMotion('tls-d-lollipop0'),
  capacity: ((props: DotProps, box) => dotCapacity(props, box)) as BlockDefinition['capacity'],
}
