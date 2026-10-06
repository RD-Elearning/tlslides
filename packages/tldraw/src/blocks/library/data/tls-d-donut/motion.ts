/**
 * Motion recipe for tls.d.donut — the slices appear one after another around the ring.
 *
 * `sweep-nodes` is an opacity reveal in order; the `grow-*` presets scale a full-block path about
 * the block centre, which inflated the whole ring instead of building it (shared issue Y1).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['slice[*]', 'centre', 'centre.label', 'label[*]', 'legend/*'],
  preset: 'sweep-nodes',
}
