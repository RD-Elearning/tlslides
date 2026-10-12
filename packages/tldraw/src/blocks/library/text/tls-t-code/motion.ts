/** Motion recipe for tls.t.code — the panel, then the lines top to bottom, then the marks. */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['panel', 'language', 'line[*]', 'number[*]', 'mark[*]', 'caption'],
  preset: 'fade-up',
  expressive: 'stagger-children',
}
