/**
 * Motion for tls.g.hub-spoke — the hub first, then the spokes around it.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['hub', 'link[*]', 'spoke[*]'],
  preset: 'sweep-nodes',
}
