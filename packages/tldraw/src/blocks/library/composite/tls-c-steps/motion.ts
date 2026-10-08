import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP, WIRE_AFTER } from '../../diagram/_motion'

/**
 * Motion recipe for tls.c.steps — the steps come in one `STEP` apart in reading order: the badge
 * settles from 96 % with its number, the title and description fade in after it, and the rail to
 * the next badge wipes towards it as that step arrives. Each step is a `step[i]` slot (its whole
 * group), so a step without a description or a row end without a rail never shifts the others.
 *
 * RVM4: was `stagger-lines` (a 500 ms fade + rise + blur on every part at its own index: titles
 * of later steps came before earlier badges, the rail faded instead of drawing).
 */
export const motion: MotionRecipe = {
  parts: ['step[*]', 'step[*].badge', 'step[*].marker', 'step[*].title', 'step[*].desc', 'connector[*]'],
  preset: 'stagger-lines',
  partMotion: {
    'step[*]': { preset: 'sweep-nodes', delay: 0, stagger: STEP },
    'step[*].badge': { preset: 'field-in', delay: 0, stagger: STEP },
    'step[*].marker': { preset: 'sweep-nodes', delay: 60, stagger: STEP },
    'step[*].title': { preset: 'sweep-nodes', delay: LABEL_AFTER, stagger: STEP },
    'step[*].desc': { preset: 'sweep-nodes', delay: LABEL_AFTER + 80, stagger: STEP },
    'connector[*]': { preset: 'wipe-x', delay: WIRE_AFTER, stagger: STEP },
  },
}
