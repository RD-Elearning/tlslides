/**
 * Motion for tls.g.orbit — the hub pops, the orbit draws round it, the satellites settle onto it
 * clockwise from the top with their spokes, labels after their satellites; in the viewer (vivid
 * V2) the sparks on the orbit twinkle out of step.
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP } from '../_motion'

export const motion: MotionRecipe = {
  parts: ['hub', 'core', 'orbit', 'moon[*]', 'cap[*]', 'ray[*]', 'star[*]'],
  preset: 'stagger-children',
  partMotion: {
    hub: { preset: 'pop', delay: 0 },
    core: { preset: 'sweep-nodes', delay: 140 },
    orbit: { preset: 'draw-path', delay: 200 },
    'ray[*]': { preset: 'draw-path', delay: 380, stagger: STEP },
    'moon[*]': { preset: 'pop-points', delay: 420, stagger: STEP },
    'cap[*]': { preset: 'sweep-nodes', delay: 420 + LABEL_AFTER, stagger: STEP },
    'star[*]': { preset: 'fade', delay: 700, stagger: 60 },
  },
  ambient: { preset: 'twinkle', part: 'star', stagger: 380 },
}
