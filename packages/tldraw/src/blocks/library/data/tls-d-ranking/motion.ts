/**
 * Motion recipe for tls.d.ranking — rows reveal top to bottom: the rank badge pops,
 * the name follows, the bar grows from its start while the value counts up beside it. Tracks ride
 * the block fade.
 *
 * RVM3: the badge number and the note were not listed (they rode the block fade, ahead of their
 * row), and the bar faded in instead of growing.
 */

import type { MotionRecipe } from '../../../types'
import { ROW_STAGGER } from '../_chart/motion'

export const motion: MotionRecipe = {
  parts: ['row[*].rank', 'row[*].rank.num', 'row[*].label', 'row[*].note', 'row[*].bar', 'row[*].value'],
  preset: 'stagger-lines',
  partMotion: {
    'row[*].rank': { preset: 'field-in', delay: 0, stagger: ROW_STAGGER },
    'row[*].rank.num': { preset: 'field-in', delay: 0, stagger: ROW_STAGGER },
    'row[*].label': { preset: 'sweep-nodes', delay: 40, stagger: ROW_STAGGER },
    'row[*].note': { preset: 'sweep-nodes', delay: 80, stagger: ROW_STAGGER },
    'row[*].bar': { preset: 'grow-bars-x', delay: 80, stagger: ROW_STAGGER },
    'row[*].value': { preset: 'count-up', delay: 80, stagger: ROW_STAGGER },
  },
}
