/**
 * Motion for tls.g.cycle — nodes appear in rotational order, each arrow after the node it leaves.
 *
 * RV08: numbers, labels, notes, arrow heads and the centre text were not parts (visible before their node).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['center', 'node[*]', 'num[*]', 'label[*]', 'text[*]', 'arrow[*]', 'arrow[*].head'],
  preset: 'sweep-nodes',
}
