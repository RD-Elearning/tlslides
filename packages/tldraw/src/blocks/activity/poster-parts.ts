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

/** S06 — the type size of the first text under the poster part `part` (a filled poster steps its type up). */
export function partTextSize(poster: LayoutNode | undefined, part: string): number | undefined {
  if (!poster) return undefined
  const find = (n: LayoutNode, inside: boolean): number | undefined => {
    const here = inside || n.part === part
    if (here && n.k === 'text') return n.style.size
    if (n.k === 'group') for (const c of n.children) {
      const s = find(c, here)
      if (s !== undefined) return s
    }
    return undefined
  }
  return find(poster, false)
}
