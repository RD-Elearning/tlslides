import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP } from '../_motion'

/**
 * Motion for tls.g.venn — the circles settle in turn about their own centres (`orb[i]`, one
 * `STEP` apart), each set's label and note follow it (`cap[i]`), and the overlap label comes last,
 * once every circle is there.
 *
 * RVM4: each set (circle and texts together) rose 24 px as one piece, so labels arrived with
 * their circle and the shared region read as moving.
 */
export const motion: MotionRecipe = {
  parts: ['orb[*]', 'cap[*]', 'overlap'],
  preset: 'fade-up',
  partMotion: {
    'orb[*]': { preset: 'field-in', delay: 0, stagger: STEP },
    'cap[*]': { preset: 'sweep-nodes', delay: LABEL_AFTER, stagger: STEP },
    overlap: { preset: 'sweep-nodes', delay: 2 * STEP + LABEL_AFTER + 100 },
  },
}
