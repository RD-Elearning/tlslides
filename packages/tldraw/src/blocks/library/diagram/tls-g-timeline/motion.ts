import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP } from '../_motion'

/** The first event starts once the axis wipe is well along. */
const EVENTS = 100

/**
 * Motion for tls.g.timeline — the axis draws along its length first (left to right `rail-x`, or
 * top-down `rail-y`, with the "now" progress fill inside it), then the events follow in date order
 * one `STEP` apart: the node settles from 96 % with its number / icon (`mark[i]`) and stem, then
 * its card (`card[i]`: date, title, note). Cards and marks are per-event slots, so an event
 * without a date or a note never shifts the others.
 *
 * RVM4: the axis faded (RV07 replaced `draw-axis-then-nodes` with an opacity stagger); now it
 * wipes. Dates, titles and notes were indexed by the texts present.
 */
export const motion: MotionRecipe = {
  parts: ['rail-x', 'rail-y', 'node[*]', 'mark[*]', 'stem[*]', 'card[*]'],
  preset: 'sweep-nodes',
  partMotion: {
    'rail-x': { preset: 'wipe-x', delay: 0 },
    'rail-y': { preset: 'wipe-down', delay: 0 },
    'node[*]': { preset: 'field-in', delay: EVENTS, stagger: STEP },
    'mark[*]': { preset: 'sweep-nodes', delay: EVENTS + 60, stagger: STEP },
    'stem[*]': { preset: 'sweep-nodes', delay: EVENTS + 60, stagger: STEP },
    'card[*]': { preset: 'sweep-nodes', delay: EVENTS + LABEL_AFTER, stagger: STEP },
  },
}
