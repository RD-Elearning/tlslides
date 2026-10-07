import type { MotionRecipe } from '../../../types'
import { STEP, TIP_AFTER, WIRE_AFTER } from '../_motion'

/**
 * Motion for tls.g.steps — the steps come in one `STEP` apart in reading order (a small settle
 * from 96 %, no travel); each connector wipes from its step towards the next one as that one
 * arrives, its arrow head last.
 *
 * RVM4: the connector lives inside its step's group (it never shows before its step, even when a
 * row end skips one and shifts the stagger) and wipes left to right instead of rising with a fade. In the vertical direction
 * the 2 px rail's wipe reads as a fade-in (one recipe serves both directions).
 */
export const motion: MotionRecipe = {
  parts: ['step[*]', 'step[*].connector', 'step[*].connector-arrowhead'],
  preset: 'stagger-children',
  partMotion: {
    'step[*]': { preset: 'field-in', delay: 0, stagger: STEP },
    'step[*].connector': { preset: 'wipe-x', delay: WIRE_AFTER, stagger: STEP },
    'step[*].connector-arrowhead': { preset: 'sweep-nodes', delay: TIP_AFTER, stagger: STEP },
  },
}
