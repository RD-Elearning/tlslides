import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, WIRE_AFTER } from '../_motion'

/** Branches follow each other this far apart (6 branches still end inside 1.5 s). */
const BRANCH = 100
/** The first branch link starts once the centre is mostly in. */
const ARMS = 150

/**
 * Motion for tls.g.mindmap — the centre settles first, then branch by branch (one `BRANCH`
 * apart): its curved link draws out of the centre (`arm[i]`), the topic box settles about its own
 * centre as the link reaches it (`topic[i]`), the twigs draw on from the topic (`twigs[i]`) and
 * the sub-topics fade in at their ends (`kids[i]`).
 *
 * RVM4: links faded in (no draw-on), and sub-topics were staggered over all branches by their flat
 * index, so a late branch's sub-topics could come before their topic.
 */
export const motion: MotionRecipe = {
  parts: ['center', 'center.label', 'arm[*]', 'topic[*]', 'twigs[*]', 'kids[*]'],
  preset: 'sweep-nodes',
  partMotion: {
    center: { preset: 'field-in', delay: 0 },
    'center.label': { preset: 'sweep-nodes', delay: 60 },
    'arm[*]': { preset: 'draw-path', delay: ARMS, stagger: BRANCH },
    'topic[*]': { preset: 'field-in', delay: ARMS + LABEL_AFTER, stagger: BRANCH },
    'twigs[*]': { preset: 'draw-path', delay: ARMS + LABEL_AFTER + WIRE_AFTER + 20, stagger: BRANCH },
    'kids[*]': { preset: 'sweep-nodes', delay: ARMS + 2 * LABEL_AFTER + WIRE_AFTER + 20, stagger: BRANCH },
  },
}
