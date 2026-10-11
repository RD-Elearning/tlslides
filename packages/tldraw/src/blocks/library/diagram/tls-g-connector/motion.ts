/**
 * Motion recipe for tls.g.connector (CMP3): the line draws on from its start (`draw-path`, 400 ms,
 * smoothOut; a dashed line grows its dash pattern along the route), the arrowhead fades in as the
 * line arrives, a start head is there from the beginning, the label text fades in half-way over its pill (`label-mask`, there from the first frame so the
 * drawing line never crosses the text). The
 * compiler gives the connector a reveal right after the later of its endpoints (subtle: a calm fade
 * of everything). The rest state is the fully drawn connector.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['line', 'head-start', 'head', 'label'],
  preset: 'draw-path',
  partMotion: {
    'head-start': { preset: 'fade', delay: 0 },
    head: { preset: 'fade', delay: 280 },
    label: { preset: 'fade', delay: 200 },
  },
}
