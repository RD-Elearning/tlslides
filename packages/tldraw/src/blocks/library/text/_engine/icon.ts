/**
 * Icon leaf for the P1 blocks. The `icon` node draws its path in a viewBox equal to its own box,
 * so a 24x24 path is scaled to the requested size here (see `icons/scale-path.ts`). Unknown names
 * degrade to the warning icon, never to text.
 */

import type { LayoutNode } from '../../../types'
import { FALLBACK_ICON, getIcon, iconStroke } from '../../../icons'
import { scaleIconPath } from '../../../icons/scale-path'
import { isLibRef } from '../../../icons/resolve'

export function iconLeaf(
  name: unknown,
  box: { x: number; y: number; width: number; height: number },
  color: string,
  part?: string
): LayoutNode {
  // S20-b: a library ref keeps its name and draws nothing here; `resolveLibIcons` swaps in the deck's picture
  const lib = isLibRef(name)
  const def = lib ? { name: String(name), path: '' } : (typeof name === 'string' ? getIcon(name) : undefined) ?? FALLBACK_ICON
  const size = Math.max(1, Math.min(box.width, box.height))
  const factor = size / 24
  return {
    k: 'icon',
    ...(part ? { part } : {}),
    box: { x: box.x + (box.width - size) / 2, y: box.y + (box.height - size) / 2, width: size, height: size },
    icon: scaleIconPath(def.path, factor),
    fill: color,
    ...(typeof name === 'string' && def !== FALLBACK_ICON ? { name } : {}),
    ...(lib ? {} : iconStroke(def, Math.max(1.5, 1.5 * factor))),
  }
}
