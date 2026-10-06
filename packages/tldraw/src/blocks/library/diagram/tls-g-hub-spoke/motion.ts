/**
 * Motion for tls.g.hub-spoke — the hub first, then links and spokes (with their labels) in clockwise order.
 *
 * RV08: spoke labels, icons and arrow heads were not parts, so they were visible before their card.
 */

import type { MotionRecipe } from '../../../types'

export const motion: MotionRecipe = {
  parts: ['hub', 'hub.icon', 'hub.label', 'link[*]', 'link[*].head', 'spoke[*]', 'icon[*]', 'label[*]', 'text[*]'],
  preset: 'sweep-nodes',
}
