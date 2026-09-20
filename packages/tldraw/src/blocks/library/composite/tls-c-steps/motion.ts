/**
 * Motion recipe for tls.c.steps - sequential step reveal.
 *
 * Parts use wildcard patterns so the motion system can target all steps
 * and connectors. The default preset is 'stagger-lines' which staggers
 * each part by index, appropriate for a sequential process reveal.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['step[*].marker', 'step[*].title', 'step[*].desc', 'connector[*]'],
  preset: 'stagger-lines',
}
