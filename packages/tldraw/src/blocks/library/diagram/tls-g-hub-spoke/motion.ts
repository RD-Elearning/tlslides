import type { MotionRecipe } from '../../../types'
import { LABEL_AFTER, STEP, TIP_AFTER, WIRE_AFTER } from '../_motion'

/** The first spoke link starts once the hub is mostly in. */
const SPOKES = 120

/**
 * Motion for tls.g.hub-spoke — the hub settles first with its icon and label, then the spokes
 * clockwise from 12 o'clock one `STEP` apart: each link draws out of the hub (`wire[i]`), the
 * spoke card settles about its own centre as the line reaches it (`card[i]`), the arrow head
 * (`tip[i]`) and the card's icon, label and note (`cap[i]`) follow. All per-spoke slots exist for
 * every spoke, so a spoke without an icon or a note never shifts the others.
 *
 * RVM4: links faded in (no draw-on); icons, labels and notes were indexed by what was present.
 */
export const motion: MotionRecipe = {
  parts: ['hub', 'hub.icon', 'hub.label', 'wire[*]', 'tip[*]', 'card[*]', 'cap[*]'],
  preset: 'sweep-nodes',
  partMotion: {
    hub: { preset: 'field-in', delay: 0 },
    'hub.icon': { preset: 'sweep-nodes', delay: 60 },
    'hub.label': { preset: 'sweep-nodes', delay: 60 },
    'wire[*]': { preset: 'draw-path', delay: SPOKES, stagger: STEP },
    'card[*]': { preset: 'field-in', delay: SPOKES + WIRE_AFTER + 60, stagger: STEP },
    'tip[*]': { preset: 'sweep-nodes', delay: SPOKES + TIP_AFTER - WIRE_AFTER, stagger: STEP },
    'cap[*]': { preset: 'sweep-nodes', delay: SPOKES + WIRE_AFTER + 60 + LABEL_AFTER, stagger: STEP },
  },
}
