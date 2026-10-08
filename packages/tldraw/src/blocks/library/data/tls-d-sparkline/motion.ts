/**
 * Motion recipe for tls.d.sparkline — the name fades in, the line draws on from its first point while
 * its fill wipes in under it, then the end dot pops and the last value fades in.
 *
 * RVM3: back to a real draw-on; RV05 had switched to `sweep-nodes` because the old draw-path did
 * nothing. The fill used to ride the block fade (visible before the line).
 */

import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER } from '../_chart/motion'

const LINE_AT = 60

export const motion: MotionRecipe = {
  parts: ['label', 'line', 'fill', 'dot', 'last'],
  preset: 'stagger-children',
  partMotion: {
    label: { preset: 'sweep-nodes' },
    line: { preset: 'draw-path', delay: LINE_AT },
    fill: { preset: 'wipe-x', delay: LINE_AT },
    dot: { preset: 'field-in', delay: LINE_AT + LABEL_AFTER + 60 },
    last: { preset: 'sweep-nodes', delay: LINE_AT + LABEL_AFTER + 80 },
  },
}
