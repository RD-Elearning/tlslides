/**
 * RVM5 — per-item motion slots for the G09/G10 blocks (media, people, brand, slide composites;
 * reviews/blocks/block-review/MOTION.md). Used only by those blocks.
 *
 * The motion engine staggers the elements one recipe part matches in document order
 * (`delay + index × stagger`). When an item may lack a piece (a caption, a note, a bio), a pattern
 * over that piece counts only the items that have it, so a later item's piece would start one step
 * early, before its own item. `slotItems` regroups the leaves of each item into one group
 * `name[i]` that is emitted for **every** item (empty when the item drew nothing), so slot i is
 * always item i in the stagger.
 *
 * A slot has the block's full box at (0, 0), so its children keep their absolute coordinates (no
 * DOM/SVG offset difference), and it sits where the item's first leaf was: the paint order of
 * every leaf is unchanged as long as an item's leaves are contiguous (they are in every user).
 * Leaf names and positions never change.
 */

import type { LayoutNode } from '../../types'

/**
 * Group the leaves `indexOf` assigns to item 0..n-1 into slots `name[0]`…`name[n-1]`, in place.
 * `indexOf` returns the item index of a node, or -1 to leave it where it is.
 */
export function slotItems(
  nodes: LayoutNode[],
  n: number,
  name: string,
  indexOf: (node: LayoutNode) => number,
  box: { width: number; height: number }
): LayoutNode[] {
  const kids: LayoutNode[][] = Array.from({ length: Math.max(0, n) }, () => [])
  const at = nodes.map((node) => {
    const i = indexOf(node)
    if (i >= 0 && i < n) kids[i].push(node)
    return i >= 0 && i < n ? i : -1
  })
  const slot = (i: number): LayoutNode => ({
    k: 'group',
    part: `${name}[${i}]`,
    box: { x: 0, y: 0, width: Math.max(0, box.width), height: Math.max(0, box.height) },
    children: kids[i],
  })
  const out: LayoutNode[] = []
  let next = 0
  nodes.forEach((node, k) => {
    const i = at[k]
    if (i < 0) {
      out.push(node)
      return
    }
    if (i < next) return // already emitted with its slot
    while (next <= i) out.push(slot(next++))
  })
  while (next < n) out.push(slot(next++))
  return out
}

/** `indexOf` for parts named `<prefix>[i]…` (`item[3].note`, `cap[2]`, `bio[1][0]`). */
export function byPrefix(prefix: string): (node: LayoutNode) => number {
  const re = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\[(\\d+)\\]')
  return (node) => {
    const m = re.exec(node.part ?? '')
    return m ? Number(m[1]) : -1
  }
}
