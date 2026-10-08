/**
 * Motion recipe for tls.t.qa — pair by pair, 120 ms apart: the Q badge settles and its question
 * rises in, then the A badge and the answer under it. Every pair draws the same parts (q and a are
 * required; the badges follow the marker option for all pairs alike), so the per-part counters
 * stay aligned with the pair index.
 *
 * RVM5: was `stagger-lines` (500 ms fade + rise + blur, every part on its own 40 ms count by part
 * index: the answers of the first pairs came after the questions of later ones).
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['qmark[*].badge', 'qmark[*]', 'q[*]', 'amark[*].badge', 'amark[*]', 'a[*]'],
  preset: 'stagger-lines',
  partMotion: {
    'qmark[*].badge': { preset: 'field-in', delay: 0, stagger: 120 },
    'qmark[*]': { preset: 'sweep-nodes', delay: 0, stagger: 120 },
    'q[*]': { preset: 'fade-up', delay: 40, stagger: 120 },
    'amark[*].badge': { preset: 'field-in', delay: 80, stagger: 120 },
    'amark[*]': { preset: 'sweep-nodes', delay: 80, stagger: 120 },
    'a[*]': { preset: 'fade-up', delay: 120, stagger: 120 },
  },
}
