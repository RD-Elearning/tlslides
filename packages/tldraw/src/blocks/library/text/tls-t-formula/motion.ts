/** Motion recipe for tls.t.formula — the expression, then its caption. */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['expr', 'expr[*]', 'caption'],
  preset: 'fade-up',
}
