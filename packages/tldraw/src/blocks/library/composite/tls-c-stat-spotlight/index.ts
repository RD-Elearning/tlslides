/**
 * tls.c.stat-spotlight — one headline number inside a drawn ring, with up to three supporting
 * numbers (P7). `kind: 'html'`; motion in `animate.ts`.
 */

import type { BlockDefinition, LayoutContext, LayoutNode, MotionRecipe } from '../../../types'
import { htmlHostNode } from '../../../html-block'
import { schema, defaults } from './schema'
import { template } from './template'
import { poster } from './poster'
import { animate, STAT_SPOTLIGHT_MS } from './animate'

export const motion: MotionRecipe = {
  parts: ['ring', 'value', 'label', 'context', 'stat[*]'],
  preset: 'count-up',
  expressiveMs: STAT_SPOTLIGHT_MS,
}

function layout(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  return htmlHostNode(poster as (p: Record<string, unknown>, c: LayoutContext) => LayoutNode, 'tls.c.stat-spotlight', props, ctx, { posterGeometry: true })
}

export const tlsCStatSpotlight: BlockDefinition = {
  type: 'tls.c.stat-spotlight',
  name: 'Stat spotlight',
  family: 'composite',
  tier: 'B',
  kind: 'html',
  summary: 'One key number in a progress ring that counts up, label beside it, up to 3 support stats.',
  keywords: ['stat', 'number', 'kpi', 'ring', 'percent', 'count-up', 'headline'],
  category: 'metric',
  scope: 'group',
  shortDescription: 'One huge number in a progress ring, with label and up to three supporting figures',
  related: ['tls.c.big-stat', 'tls.d.progress-ring', 'tls.c.kpi-row'],
  describe: {
    when: 'One number is the point of the slide (a result, a rate, a total); expressive slides.',
    avoid: 'Two to five equal metrics (use tls.c.kpi-row); a trend over time (use tls.d.line).',
    example: {
      id: 'b_spot',
      type: 'tls.c.stat-spotlight',
      props: { value: '87%', progress: 87, label: 'Tỉ lệ hoàn thành', stats: [{ value: '312', label: 'Sinh viên' }] },
    },
  },
  schema,
  defaults,
  size: { preferred: [1728, 752], min: [640, 360] },
  layout: layout as BlockDefinition['layout'],
  poster,
  html: { template, animate },
  motion,
}
