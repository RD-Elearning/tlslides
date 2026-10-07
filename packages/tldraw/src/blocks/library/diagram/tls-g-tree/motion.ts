import type { MotionRecipe } from '../../../types'
import { STEP, WIRE_AFTER } from '../_motion'

/**
 * Motion for tls.g.tree — the tree grows from the root, one level per `STEP`: the boxes of depth d
 * fade in together (`level[d]`), then the links leaving them draw on from each parent towards its
 * children (`links[d]`) as the next level arrives.
 *
 * RVM4: nodes and links were staggered in layout order (`item[k]` / `edge[k]`), which is not
 * depth order (a grandchild could come before its parent) and links faded instead of drawing.
 * `item[k]` / `edge[k]` and the id-path leaf names stay inside the level slots.
 */
export const motion: MotionRecipe = {
  parts: ['level[*]', 'links[*]'],
  preset: 'sweep-nodes',
  partMotion: {
    'level[*]': { preset: 'sweep-nodes', delay: 0, stagger: STEP },
    'links[*]': { preset: 'draw-path', delay: WIRE_AFTER, stagger: STEP },
  },
}
