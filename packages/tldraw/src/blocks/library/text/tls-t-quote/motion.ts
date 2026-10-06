/**
 * Motion recipe for tls.t.quote — default is quote-in.
 *
 * The engine does not play a chained preset's `chain`, so `quote-in` alone rose every part at once.
 * Under `motionStyle: expressive` the recipe spells the chain out (RVM2): the glyph pops, the quote
 * rises in with a soft blur, the attribution fades — staggered in that order.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  preset: 'quote-in',
  parts: ['glyph', 'text', 'attribution'],
  expressive: 'stagger-children',
  partMotion: {
    glyph: { preset: 'pop' },
    text: { preset: 'stagger-lines' },
    attribution: { preset: 'fade' },
  },
}
