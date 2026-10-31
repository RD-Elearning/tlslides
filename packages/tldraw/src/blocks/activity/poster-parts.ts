import type { Box, LayoutNode } from '../types'

/** The box of the first node of `poster` whose `part` is `part`, in the poster's own coordinates
 *  (an activity poster is a flat group: its children's boxes are root-relative). */
export function partBox(poster: LayoutNode | undefined, part: string): Box | undefined {
  if (!poster) return undefined
  const stack: LayoutNode[] = [poster]
  while (stack.length) {
    const n = stack.shift()!
    if (n.part === part) return n.box
    if (n.k === 'group') stack.push(...n.children)
  }
  return undefined
}
