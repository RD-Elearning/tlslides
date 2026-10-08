/**
 * Motion recipe for tls.l.overlay — the background fades in and the layers rise in over it, bottom
 * layer first, under `motionStyle: expressive` (RVM2; see `../_motion.ts`). No own preset.
 */

import { containerMotion } from '../_motion'

export const motion = containerMotion(['surface'], { surface: { preset: 'fade' } })
