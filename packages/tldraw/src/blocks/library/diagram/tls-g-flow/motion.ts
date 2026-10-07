import type { MotionRecipe } from '../../../types'
import { STEP, TIP_AFTER, WIRE_AFTER } from '../_motion'

/**
 * Motion for tls.g.flow — the chart builds along the flow, one layer of the DAG per `STEP`: the
 * nodes of layer k fade in (`layer[k]`), then every edge leaving them draws on from its source
 * (`out[k]`), reaching the next layer as it arrives; arrow heads (`tip[k]`) and edge labels
 * (`tag[k]`, "Yes" / "No") follow once the stems are drawn. A back edge draws once its source is
 * there; the chain ends within 2.5 s even for 12 layers.
 *
 * RVM4: was a per-node / per-edge rise in graph order, so an edge could appear before its source
 * and the arrows faded instead of drawing.
 */
export const motion: MotionRecipe = {
  parts: ['layer[*]', 'out[*]', 'tip[*]', 'tag[*]'],
  preset: 'stagger-children',
  partMotion: {
    'layer[*]': { preset: 'sweep-nodes', delay: 0, stagger: STEP },
    'out[*]': { preset: 'draw-path', delay: WIRE_AFTER, stagger: STEP },
    'tip[*]': { preset: 'sweep-nodes', delay: TIP_AFTER, stagger: STEP },
    'tag[*]': { preset: 'sweep-nodes', delay: TIP_AFTER + 40, stagger: STEP },
  },
}
