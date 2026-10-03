/**
 * Motion for tls.g.chevrons — the row wipes in from the left.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['chevron[*]', 'label[*]', 'text[*]'],
  preset: 'wipe-x',
}
