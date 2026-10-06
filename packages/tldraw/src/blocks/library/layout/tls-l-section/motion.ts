/**
 * Motion recipe for tls.l.section — surface, title and divider, then the child blocks, staggered
 * in reading order under `motionStyle: expressive` (RVM2; see `../_motion.ts`). No own preset.
 */

import { containerMotion } from '../_motion'

export const motion = containerMotion(['surface', 'title', 'divider'])
