/**
 * Motion for tls.d.icon-array — the figure counts up while the filled icons pop in one by one,
 * then the rest settle in quickly; the label and caption follow.
 */

import type { MotionRecipe } from '../../../types'
import { MARKS_AT } from '../_chart/motion'

export const motion: MotionRecipe = {
  parts: ['on[*]', 'off[*]', 'value', 'label', 'caption'],
  preset: 'stagger-children',
  partMotion: {
    value: { preset: 'count-up', delay: MARKS_AT },
    'on[*]': { preset: 'pop-points', delay: MARKS_AT, stagger: 70 },
    'off[*]': { preset: 'sweep-nodes', delay: MARKS_AT + 260, stagger: 25 },
    label: { preset: 'sweep-nodes', delay: MARKS_AT + 200 },
    caption: { preset: 'sweep-nodes', delay: MARKS_AT + 320 },
  },
}
