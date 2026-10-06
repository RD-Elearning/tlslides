/**
 * Motion recipe for tls.l.card — the panel rises in, then its child blocks follow in reading order
 * under `motionStyle: expressive` (RVM2; see `../_motion.ts`). No own preset.
 */

import { containerMotion } from '../_motion'

export const motion = containerMotion(['background'])
