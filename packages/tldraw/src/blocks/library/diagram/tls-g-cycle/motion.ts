import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP, TIP_AFTER, WIRE_AFTER } from '../_motion'

/** The ring's first node starts after the centre text. */
const RING = 100

/**
 * Motion for tls.g.cycle — the centre text first, then the nodes in ring order from 12 o'clock,
 * one `STEP` apart; each arrow draws on from the node it leaves towards the next one as that one
 * arrives (the last closes the loop onto the first), its head last; the number or icon
 * (`mark[i]`) comes with its node, the label and note (`cap[i]`) after it. Both are per-node
 * slots, so a node without a note or with an icon never shifts the others.
 *
 * RVM4: arrows faded (no draw-on); nodes now settle from 96 % instead of a flat fade; icons were
 * not a part, and notes were indexed by the notes present (a node without one moved every later
 * note a slot early, before its node).
 */
export const motion: MotionRecipe = {
  parts: ['center', 'node[*]', 'mark[*]', 'cap[*]', 'arrow[*]', 'arrow[*].head'],
  preset: 'sweep-nodes',
  partMotion: {
    center: { preset: 'sweep-nodes', delay: 0 },
    'node[*]': { preset: 'field-in', delay: RING, stagger: STEP },
    'mark[*]': { preset: 'sweep-nodes', delay: RING + 60, stagger: STEP },
    'cap[*]': { preset: 'sweep-nodes', delay: RING + LABEL_AFTER, stagger: STEP },
    'arrow[*]': { preset: 'draw-path', delay: RING + WIRE_AFTER, stagger: STEP },
    'arrow[*].head': { preset: 'sweep-nodes', delay: RING + TIP_AFTER, stagger: STEP },
  },
}
