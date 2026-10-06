/**
 * Motion for tls.g.arrow — the arrow draws itself from its tail, the heads and the label fade in.
 *
 * The layout tags the stroke `arrow[path]` and the heads `arrow[head-start]` / `arrow[head-end]`;
 * a bare `arrow` part matched none of them (`[path]` is not an index), so the line never drew and
 * the label got a clip wipe on an in-out ease (RVM2). Under `expressive` the parts stagger in that
 * order on an out ease: tail head, path, label, tip head (so the tip arrives as the line reaches
 * it). `partMotion` gives the path a real draw-on and the rest a fade.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['arrow[head-start]', 'arrow[path]', 'label', 'arrow[head-end]'],
  preset: 'draw-path',
  expressive: 'stagger-children',
  partMotion: {
    'arrow[head-start]': { preset: 'fade' },
    'arrow[path]': { preset: 'draw-path' },
    'arrow[head-end]': { preset: 'fade' },
    label: { preset: 'fade' },
  },
}
