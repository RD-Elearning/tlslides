/**
 * tls.c.journey — milestones on a curved path that draws across the slide (P7).
 * `kind: 'html'`; motion in `animate.ts`.
 */

import type { BlockDefinition, CapacityReport, LayoutContext, LayoutNode, MotionRecipe, Size } from '../../../types'
import { htmlHostNode } from '../../../html-block'
import { schema, defaults, MAX_MILESTONES } from './schema'
import type { JourneyProps } from './schema'
import { template } from './template'
import { poster } from './poster'
import { animate, JOURNEY_MS } from './animate'

export const motion: MotionRecipe = {
  parts: ['path', 'node[*]', 'label[*]'],
  preset: 'draw-axis-then-nodes',
  expressiveMs: JOURNEY_MS,
}

function layout(props: Record<string, unknown>, ctx: LayoutContext): LayoutNode {
  return htmlHostNode(poster as (p: Record<string, unknown>, c: LayoutContext) => LayoutNode, 'tls.c.journey', props, ctx, { posterGeometry: true })
}

function capacity(props: JourneyProps, _box: Size, _ctx: LayoutContext): CapacityReport {
  const used = Array.isArray(props?.milestones) ? props.milestones.length : 0
  const fits = used <= MAX_MILESTONES
  return {
    fits,
    budget: { milestones: { used, max: MAX_MILESTONES, unit: 'items' } },
    remedy: fits ? [] : [{ kind: 'paginate' }],
  }
}

export const tlsCJourney: BlockDefinition = {
  type: 'tls.c.journey',
  name: 'Journey',
  family: 'composite',
  tier: 'B',
  kind: 'html',
  summary: 'Milestones on a curved path; the path draws and each node pops as the line reaches it.',
  keywords: ['journey', 'path', 'milestones', 'roadmap', 'stages', 'timeline', 'story'],
  category: 'timeline',
  scope: 'slide',
  shortDescription: 'Curved path across the slide with milestone dots and labels above and below',
  related: ['tls.g.timeline', 'tls.g.milestones', 'tls.g.roadmap'],
  describe: {
    when: 'A story of 3-6 stages or dates (a programme, a project, a career) told as one path.',
    avoid: 'Precise dated schedules (use tls.g.timeline); more than 6 stages (use tls.g.roadmap).',
    example: {
      id: 'b_journey',
      type: 'tls.c.journey',
      props: { milestones: [{ when: '2024', title: 'Ý tưởng' }, { when: '2025', title: 'Thử nghiệm' }, { when: '2026', title: 'Triển khai' }] },
    },
  },
  schema,
  defaults,
  size: { preferred: [1728, 752], min: [720, 360] },
  layout: layout as BlockDefinition['layout'],
  capacity: capacity as BlockDefinition['capacity'],
  poster,
  html: { template, animate },
  motion,
}
