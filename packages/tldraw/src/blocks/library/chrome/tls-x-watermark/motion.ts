/**
 * Motion recipe for tls.x.watermark — chrome is static: no default animation.
 *
 * `preset: 'none'` keeps it static under every slide `motionStyle` too (RVM2): an empty recipe
 * used to get `fade-up` under `expressive` and a fade under `subtle`, so slide furniture rose
 * in and held a step of the build chain. An explicit `motion.preset` on the instance still plays.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  preset: 'none',
}
