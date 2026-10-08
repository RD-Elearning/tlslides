/**
 * Motion recipe for tls.t.hero-number.
 *
 * Under `motionStyle: expressive` the block fades in, the value counts up from zero to its exact
 * formatted text (out ease, on tabular figures so the digits do not jitter), then the unit and the
 * caption rise in below it. `subtle` (and the default) is one calm fade-up, numbers already final.
 *
 * Only `value` plays `count-up`: the preset rewrites the digits of the part it plays on, so the
 * caption ("FY2024 total") has its own fade and never counts 0 -> 2024.
 * RVM3: the expressive preset was `count-up` itself, whose block entrance zooms the whole block in
 * from 0.7, and the unit and caption rode that entrance (shown before the number).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['value', 'unit', 'caption'],
  preset: 'fade-up',
  expressive: 'stagger-children',
  partMotion: {
    value: { preset: 'count-up', delay: 0 },
    unit: { preset: 'fade-up', delay: 220 },
    caption: { preset: 'fade-up', delay: 280 },
  },
}
