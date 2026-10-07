/**
 * Motion recipe for tls.d.table — the header, then the rows in reading order.
 *
 * RVM3: the header used to ride the block fade with the rows (`stagger-lines`, 40 ms apart, with a
 * blur); see `_table/motion.ts`.
 */

import type { MotionRecipe } from '../../../types'
import { tableMotion } from '../_table/motion'

export const motion: MotionRecipe = tableMotion()
